import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const TEAMS_FILE = path.join(DATA_DIR, 'teams.json');
const PLAYERS_FILE = path.join(DATA_DIR, 'players.json');

const ensureFile = (file: string) => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify([]));
  }
};

export const getTeams = () => {
  ensureFile(TEAMS_FILE);
  return JSON.parse(fs.readFileSync(TEAMS_FILE, 'utf-8'));
};

export const saveTeams = (teams: any) => {
  fs.writeFileSync(TEAMS_FILE, JSON.stringify(teams, null, 2));
};

export const getPlayers = () => {
  ensureFile(PLAYERS_FILE);
  return JSON.parse(fs.readFileSync(PLAYERS_FILE, 'utf-8'));
};

export const savePlayers = (players: any) => {
  fs.writeFileSync(PLAYERS_FILE, JSON.stringify(players, null, 2));
};

export const saveImage = (base64Data: string, prefix: string) => {
  if (!base64Data || !base64Data.startsWith('data:image')) return base64Data;
  
  try {
    const matches = base64Data.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!matches) return base64Data;

    const extension = matches[1] === 'svg+xml' ? 'svg' : matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');
    
    const filename = `${prefix}_${Date.now()}.${extension}`;
    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
    
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (e) {
    console.error('Error saving image:', e);
    return base64Data;
  }
};
