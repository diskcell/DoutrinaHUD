import fs from 'fs';
import path from 'path';
import db from './index.js';

export function migrateJsonToSqlite() {
  const DATA_DIR = path.join(process.cwd(), 'data');
  const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');
  const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');

  console.log('[Migration] Iniciando verificação de dados...');

  // 1. Migrar Times
  const teamsCount = db.prepare('SELECT COUNT(*) as count FROM teams').get() as any;
  if (teamsCount.count === 0 && fs.existsSync(TEAMS_FILE)) {
    console.log('[Migration] Importando times do JSON para o SQLite...');
    try {
      const teams = JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf8'));
      if (Array.isArray(teams) && teams.length > 0) {
        const insertTeam = db.prepare(`
          INSERT INTO teams (id, name, tag, logo_url, country, color, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((data) => {
          for (const team of data) {
            insertTeam.run(
              team.id,
              team.name,
              team.tag || '',
              team.logo || '',
              team.country || '',
              team.color || '',
              team.created_at || new Date().toISOString()
            );
          }
        });

        insertMany(teams);
        console.log(`[Migration] ${teams.length} times importados.`);
      }
    } catch (e) {
      console.error('[Migration] Erro ao migrar times:', e);
    }
  } else {
    console.log(`[Migration] Tabela 'teams' já possui ${teamsCount.count} registros ou arquivo JSON ausente.`);
  }

  // 2. Migrar Jogadores
  const playersCount = db.prepare('SELECT COUNT(*) as count FROM players').get() as any;
  if (playersCount.count === 0 && fs.existsSync(PLAYERS_FILE)) {
    console.log('[Migration] Importando jogadores do JSON para o SQLite...');
    try {
      const players = JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf8'));
      if (Array.isArray(players) && players.length > 0) {
        const insertPlayer = db.prepare(`
          INSERT INTO players (id, nickname, real_name, steam_id, avatar_url, team_id, role, country, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const insertMany = db.transaction((data) => {
          for (const player of data) {
            insertPlayer.run(
              player.id,
              player.nickname,
              player.real_name || '',
              player.steam_id || '',
              player.avatar || '',
              player.team_id ? Number(player.team_id) : null,
              player.role || '',
              player.country || '',
              player.created_at || new Date().toISOString()
            );
          }
        });

        insertMany(players);
        console.log(`[Migration] ${players.length} jogadores importados.`);
      }
    } catch (e) {
      console.error('[Migration] Erro ao migrar jogadores:', e);
    }
  } else {
    console.log(`[Migration] Tabela 'players' já possui ${playersCount.count} registros ou arquivo JSON ausente.`);
  }
}
