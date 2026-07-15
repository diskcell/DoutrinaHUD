import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const dbDir = path.join(process.cwd(), 'database');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

const db = new Database(path.join(dbDir, 'doutrina.db'));

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

const config = {
  layout: 'professional',
  version: 1,
  features: [
    'scoreboard',
    'radar',
    'player_panels',
    'observed_player',
    'economy',
    'bomb_state',
    'clutch',
    'round_end',
    'match_end',
    'series_strip',
  ],
};

const upsertModel = db.prepare(`
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
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    component_key = excluded.component_key,
    route_path = excluded.route_path,
    preview_label = excluded.preview_label,
    config_json = excluded.config_json,
    is_active = excluded.is_active,
    is_default = excluded.is_default,
    updated_at = CURRENT_TIMESTAMP
`);

upsertModel.run(
  'professional_v1',
  'DOUTRINA HUD Atual',
  'Modelo atual da overlay principal com radar, paineis laterais, jogador observado, economia, placar, banners de round e final da partida.',
  'professional_v1',
  '/overlay/professional',
  'Modelo atual',
  JSON.stringify(config),
  1,
  1
);

upsertModel.run(
  'broadcast_v1',
  'Broadcast Arena',
  'Modelo inspirado em HUDs de campeonato, com placar central compacto, area de patrocinador, cards inferiores e o mesmo radar da HUD principal.',
  'broadcast_v1',
  '/overlay/broadcast',
  'Broadcast',
  JSON.stringify({
    layout: 'broadcast',
    version: 1,
    features: [
      'scoreboard',
      'radar',
      'player_dock',
      'observed_player',
      'sponsor_area',
      'bomb_state',
      'clutch',
      'round_end',
      'match_end',
    ],
  }),
  0,
  0
);

const rows = db
  .prepare('SELECT id, name, is_active, is_default FROM overlay_models ORDER BY created_at ASC')
  .all();

console.log(JSON.stringify(rows, null, 2));
db.close();
