import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR);
}

const db = new Database(path.join(DB_DIR, 'doutrina.db'));

// Habilitar Foreign Keys e WAL mode para performance
db.pragma('foreign_keys = ON');
db.pragma('journal_mode = WAL');

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as any[];
  const exists = columns.some((item) => item.name === column);

  if (!exists) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

export function initDatabase() {
  console.log('[Database] Inicializando tabelas...');

  // Tabela de Times
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      tag TEXT,
      logo_url TEXT,
      country TEXT,
      color TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de Jogadores
  db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY,
      nickname TEXT NOT NULL,
      real_name TEXT,
      steam_id TEXT,
      avatar_url TEXT,
      team_id INTEGER,
      role TEXT,
      country TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    )
  `);

  // Tabela de Partidas (Matches)
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      left_team_id INTEGER,
      right_team_id INTEGER,
      format TEXT DEFAULT 'BO3',
      stage TEXT,
      status TEXT DEFAULT 'setup',
      current_map TEXT,
      auto_mode INTEGER DEFAULT 1,
      score_home INTEGER DEFAULT 0,
      score_away INTEGER DEFAULT 0,
      score_series_home INTEGER DEFAULT 0,
      score_series_away INTEGER DEFAULT 0,
      side_home TEXT DEFAULT 'CT',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (left_team_id) REFERENCES teams(id),
      FOREIGN KEY (right_team_id) REFERENCES teams(id)
    )
  `);

  // Tabela de Estado Live (Overlay)
  db.exec(`
    CREATE TABLE IF NOT EXISTS live_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      state_json TEXT NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Tabela de Modelos de Overlay
  db.exec(`
    CREATE TABLE IF NOT EXISTS overlay_models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      component_key TEXT NOT NULL,
      route_path TEXT NOT NULL,
      preview_label TEXT,
      config_json TEXT NOT NULL,
      is_active INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    INSERT INTO overlay_models (
      id,
      name,
      description,
      component_key,
      route_path,
      preview_label,
      config_json,
      is_active,
      is_default
    )
    SELECT
      'professional_v1',
      'DOUTRINA HUD Atual',
      'Modelo atual da overlay principal com radar, painéis laterais, jogador observado, economia, placar, banners de round e final da partida.',
      'professional_v1',
      '/overlay/professional',
      'Modelo atual',
      '{"layout":"professional","version":1,"features":["scoreboard","radar","player_panels","observed_player","economy","bomb_state","clutch","round_end","match_end","series_strip"]}',
      1,
      1
    WHERE NOT EXISTS (
      SELECT 1 FROM overlay_models WHERE id = 'professional_v1'
    )
  `);

  db.exec(`
    INSERT INTO overlay_models (
      id,
      name,
      description,
      component_key,
      route_path,
      preview_label,
      config_json,
      is_active,
      is_default
    )
    SELECT
      'broadcast_v1',
      'Broadcast Arena',
      'Modelo inspirado em HUDs de campeonato, com placar central compacto, área de patrocinador, cards inferiores e o mesmo radar da HUD principal.',
      'broadcast_v1',
      '/overlay/broadcast',
      'Broadcast',
      '{"layout":"broadcast","version":1,"features":["scoreboard","radar","player_dock","observed_player","sponsor_area","bomb_state","clutch","round_end","match_end"]}',
      0,
      0
    WHERE NOT EXISTS (
      SELECT 1 FROM overlay_models WHERE id = 'broadcast_v1'
    )
  `);

  // Tabela de Sessões de Veto
  db.exec(`
    CREATE TABLE IF NOT EXISTS veto_sessions (
      id TEXT PRIMARY KEY,
      match_id TEXT,
      format TEXT,
      status TEXT,
      left_team_id INTEGER,
      right_team_id INTEGER,
      left_token TEXT,
      right_token TEXT,
      left_ready INTEGER DEFAULT 0,
      right_ready INTEGER DEFAULT 0,
      left_connected INTEGER DEFAULT 0,
      right_connected INTEGER DEFAULT 0,
      current_step_index INTEGER DEFAULT 0,
      current_turn TEXT,
      is_finished INTEGER DEFAULT 0,
      available_maps_json TEXT,
      active_map_pool_json TEXT,
      flow_json TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
      FOREIGN KEY (left_team_id) REFERENCES teams(id),
      FOREIGN KEY (right_team_id) REFERENCES teams(id)
    )
  `);

  // Tabela de Ações de Veto
  db.exec(`
    CREATE TABLE IF NOT EXISTS veto_actions (
      id TEXT PRIMARY KEY,
      veto_session_id TEXT,
      step_index INTEGER,
      action TEXT,
      team_side TEXT,
      map_name TEXT,
      map_names_json TEXT,
      map_number INTEGER,
      starting_side TEXT,
      side_choice_by TEXT,
      timestamp INTEGER,
      FOREIGN KEY (veto_session_id) REFERENCES veto_sessions(id) ON DELETE CASCADE
    )
  `);

  // Tabela de Mapas Selecionados
  db.exec(`
    CREATE TABLE IF NOT EXISTS selected_maps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      veto_session_id TEXT,
      map_name TEXT,
      map_number INTEGER,
      picked_by TEXT,
      side_choice_by TEXT,
      starting_side TEXT,
      FOREIGN KEY (veto_session_id) REFERENCES veto_sessions(id) ON DELETE CASCADE
    )
  `);

  ensureColumn('teams', 'hltv_url', 'TEXT');
  ensureColumn('teams', 'hltv_team_id', 'TEXT');
  ensureColumn('teams', 'hltv_synced_at', 'DATETIME');

  ensureColumn('players', 'hltv_player_id', 'TEXT');
  ensureColumn('players', 'hltv_profile_url', 'TEXT');
  ensureColumn('players', 'avatar_source', 'TEXT');
  ensureColumn('players', 'hltv_synced_at', 'DATETIME');

  console.log('[Database] Tabelas prontas.');
}

export default db;
