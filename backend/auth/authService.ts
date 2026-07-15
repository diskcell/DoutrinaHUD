import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import db from '../database/index.js';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

function verifyPassword(password: string, storedHash: string) {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export const authService = {
  register(email: string, displayName: string, password: string) {
    const id = randomBytes(16).toString('hex');
    const workspaceId = randomBytes(16).toString('hex');
    const normalizedEmail = email.trim().toLowerCase();

    const transaction = db.transaction(() => {
      db.prepare('INSERT INTO users (id, email, display_name, password_hash) VALUES (?, ?, ?, ?)')
        .run(id, normalizedEmail, displayName.trim(), hashPassword(password));
      db.prepare('INSERT INTO workspaces (id, name, owner_id) VALUES (?, ?, ?)')
        .run(workspaceId, `${displayName.trim()} - Workspace`, id);
    });
    transaction();
    return { id, email: normalizedEmail, displayName: displayName.trim(), workspaceId };
  },

  login(email: string, password: string) {
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.password_hash)) return null;
    const workspace: any = db.prepare('SELECT id, name FROM workspaces WHERE owner_id = ? ORDER BY created_at LIMIT 1').get(user.id);
    return { id: user.id, email: user.email, displayName: user.display_name, workspaceId: workspace?.id, workspaceName: workspace?.name };
  },

  createSession(userId: string) {
    const token = randomBytes(32).toString('base64url');
    db.prepare('INSERT INTO auth_sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)')
      .run(randomBytes(16).toString('hex'), userId, hashToken(token), Date.now() + SESSION_TTL_MS);
    return token;
  },

  getUserByToken(token: string | undefined) {
    if (!token) return null;
    return db.prepare(`
      SELECT u.id, u.email, u.display_name, w.id AS workspace_id, w.name AS workspace_name
      FROM auth_sessions s
      JOIN users u ON u.id = s.user_id
      JOIN workspaces w ON w.owner_id = u.id
      WHERE s.token_hash = ? AND s.expires_at > ?
      ORDER BY w.created_at LIMIT 1
    `).get(hashToken(token), Date.now()) as any;
  },

  logout(token: string | undefined) {
    if (token) db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(hashToken(token));
  },
};
