import { randomBytes } from 'crypto';

export interface HudSession {
  id: string;
  token: string | null;
  createdAt: number;
  updatedAt: number;
  latestGsiData: any;
  latestHudState: any;
}

const LOCAL_SESSION_ID = 'local';
const sessions = new Map<string, HudSession>();

function now() {
  return Date.now();
}

function createSessionId() {
  return randomBytes(6).toString('hex');
}

function createToken() {
  return randomBytes(24).toString('base64url');
}

function createRecord(id: string, token: string | null, initialHudState: any = null): HudSession {
  const timestamp = now();
  const session = {
    id,
    token,
    createdAt: timestamp,
    updatedAt: timestamp,
    latestGsiData: null,
    latestHudState: initialHudState,
  };

  sessions.set(id, session);
  return session;
}

export const sessionService = {
  localSessionId: LOCAL_SESSION_ID,

  roomName: (sessionId: string) => `session:${sessionId}`,

  getOrCreateLocal(initialHudState: any = null) {
    const existing = sessions.get(LOCAL_SESSION_ID);

    if (existing) {
      if (initialHudState && !existing.latestHudState) {
        existing.latestHudState = initialHudState;
      }

      return existing;
    }

    return createRecord(LOCAL_SESSION_ID, null, initialHudState);
  },

  create() {
    let id = createSessionId();

    while (sessions.has(id)) {
      id = createSessionId();
    }

    return createRecord(id, createToken());
  },

  get(sessionId: string | undefined | null) {
    if (!sessionId || sessionId === LOCAL_SESSION_ID) {
      return sessions.get(LOCAL_SESSION_ID) || null;
    }

    return sessions.get(sessionId) || null;
  },

  getPublic(sessionId: string) {
    const session = this.get(sessionId);

    if (!session) return null;

    return {
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      active: Boolean(session.latestGsiData),
    };
  },

  verifyToken(sessionId: string, token: string | undefined | null) {
    const session = this.get(sessionId);

    if (!session || !session.token || !token) return false;

    return session.token === token;
  },

  updateGsi(sessionId: string, data: any) {
    const session = this.get(sessionId);

    if (!session) return null;

    session.latestGsiData = data;
    session.updatedAt = now();
    return session;
  },

  updateHud(sessionId: string, data: any) {
    const session = this.get(sessionId);

    if (!session) return null;

    session.latestHudState = data;
    session.updatedAt = now();
    return session;
  },
};
