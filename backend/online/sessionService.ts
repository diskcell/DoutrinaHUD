import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import db from '../database/index.js';

export interface HudSession {
  id: string;
  token: string | null;
  controlToken: string | null;
  tokenHash: string | null;
  controlTokenHash: string | null;
  workspaceId: string | null;
  createdAt: number;
  updatedAt: number;
  latestGsiData: any;
  latestHudState: any;
}

const LOCAL_SESSION_ID = 'local';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map<string, HudSession>();

const now = () => Date.now();
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const createSessionId = () => randomBytes(6).toString('hex');
const createToken = () => randomBytes(24).toString('base64url');

function tokensMatch(expectedHash: string | null, token: string | undefined | null) {
  if (!expectedHash || !token) return false;
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(hashToken(token), 'hex');
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function saveSession(session: HudSession) {
  if (session.id === LOCAL_SESSION_ID || !session.workspaceId || !session.tokenHash || !session.controlTokenHash) return;
  const expiresAt = now() + SESSION_TTL_MS;
  db.prepare(`
    INSERT INTO online_sessions (id, workspace_id, gsi_token_hash, control_token_hash, created_at, updated_at, expires_at, hud_state_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at, expires_at = excluded.expires_at, hud_state_json = excluded.hud_state_json
  `).run(session.id, session.workspaceId, session.tokenHash, session.controlTokenHash, session.createdAt, session.updatedAt, expiresAt, session.latestHudState ? JSON.stringify(session.latestHudState) : null);
}

function createRecord(id: string, token: string | null, controlToken: string | null, initialHudState: any = null, workspaceId: string | null = null, createdAt = now(), updatedAt = createdAt): HudSession {
  const session: HudSession = {
    id,
    token,
    controlToken,
    tokenHash: token ? hashToken(token) : null,
    controlTokenHash: controlToken ? hashToken(controlToken) : null,
    workspaceId,
    createdAt,
    updatedAt,
    latestGsiData: null,
    latestHudState: initialHudState,
  };
  sessions.set(id, session);
  return session;
}

export const sessionService = {
  localSessionId: LOCAL_SESSION_ID,
  roomName: (sessionId: string) => `session:${sessionId}`,

  loadPersisted() {
    db.prepare('DELETE FROM online_sessions WHERE expires_at <= ?').run(now());
    const rows = db.prepare('SELECT * FROM online_sessions WHERE expires_at > ?').all(now()) as any[];
    rows.forEach((row) => {
      if (sessions.has(row.id)) return;
      let savedHudState = null;
      try { savedHudState = row.hud_state_json ? JSON.parse(row.hud_state_json) : null; } catch { savedHudState = null; }
      const session = createRecord(row.id, null, null, savedHudState, row.workspace_id, row.created_at, row.updated_at);
      session.tokenHash = row.gsi_token_hash;
      session.controlTokenHash = row.control_token_hash;
    });
  },

  getOrCreateLocal(initialHudState: any = null) {
    const existing = sessions.get(LOCAL_SESSION_ID);
    if (existing) {
      if (initialHudState && !existing.latestHudState) existing.latestHudState = initialHudState;
      return existing;
    }
    return createRecord(LOCAL_SESSION_ID, null, null, initialHudState);
  },

  create(workspaceId: string) {
    let id = createSessionId();
    while (sessions.has(id)) id = createSessionId();
    const session = createRecord(id, createToken(), createToken(), null, workspaceId);
    saveSession(session);
    return session;
  },

  get(sessionId: string | undefined | null) {
    if (!sessionId || sessionId === LOCAL_SESSION_ID) return sessions.get(LOCAL_SESSION_ID) || null;
    return sessions.get(sessionId) || null;
  },

  getPublic(sessionId: string) {
    const session = this.get(sessionId);
    if (!session) return null;
    return { id: session.id, createdAt: session.createdAt, updatedAt: session.updatedAt, active: Boolean(session.latestGsiData) };
  },

  verifyToken(sessionId: string, token: string | undefined | null) {
    return tokensMatch(this.get(sessionId)?.tokenHash || null, token);
  },

  verifyControlToken(sessionId: string, token: string | undefined | null) {
    return tokensMatch(this.get(sessionId)?.controlTokenHash || null, token);
  },

  updateGsi(sessionId: string, data: any) {
    const session = this.get(sessionId);
    if (!session) return null;
    session.latestGsiData = data;
    session.updatedAt = now();
    saveSession(session);
    return session;
  },

  updateHud(sessionId: string, data: any) {
    const session = this.get(sessionId);
    if (!session) return null;
    session.latestHudState = data;
    session.updatedAt = now();
    saveSession(session);
    return session;
  },
};
