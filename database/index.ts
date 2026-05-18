import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure the database directory exists
const dbPath = path.join(process.cwd(), 'database');
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

// Initialize SQLite Database
export const db = new Database(path.join(dbPath, 'doutrina.db'), {
  verbose: console.log,
});

db.pragma('journal_mode = WAL'); // Performance improvement

// Initialize tables
export function initializeSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      logo TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER,
      nickname TEXT NOT NULL,
      real_name TEXT,
      role TEXT,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_home_id INTEGER,
      team_away_id INTEGER,
      score_home INTEGER DEFAULT 0,
      score_away INTEGER DEFAULT 0,
      map TEXT,
      status TEXT DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_home_id) REFERENCES teams(id),
      FOREIGN KEY (team_away_id) REFERENCES teams(id)
    );
  `);

  // Migration: Add new columns if they do not exist
  const addColumn = (table: string, column: string, type: string) => {
    try {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column name')) {
         console.warn(`Could not add column ${column} to ${table}:`, e.message);
      }
    }
  };

  addColumn('teams', 'tag', 'TEXT');
  addColumn('teams', 'country', 'TEXT');
  addColumn('teams', 'organization', 'TEXT');
  addColumn('teams', 'social_links', 'TEXT');
  addColumn('teams', 'status', 'TEXT DEFAULT "active"');
}
