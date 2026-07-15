import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const stamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const backupDir = path.join(process.cwd(), 'backups');
const dbPath = path.join(process.cwd(), 'database', 'doutrina.db');
const backupPath = path.join(
  backupDir,
  `doutrinahud-db-before-hltv-import-${stamp}.db`
);

fs.mkdirSync(backupDir, { recursive: true });

if (!fs.existsSync(dbPath)) {
  console.log('Banco local ainda nao existe.');
  process.exit(0);
}

const db = new Database(dbPath, { readonly: true });
await db.backup(backupPath);
db.close();

console.log(backupPath);
