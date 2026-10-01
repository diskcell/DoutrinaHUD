import { requireSupabase } from '../../lib/supabase';

interface VetoTokens {
  leftToken: string;
  rightToken: string;
}

function storageKey(sessionId: string) {
  return `doutrinahud-veto-tokens:${sessionId}`;
}

function readTokens(sessionId: string): VetoTokens | null {
  if (typeof window === 'undefined') return null;

  try {
    const value = localStorage.getItem(storageKey(sessionId));
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function saveTokens(sessionId: string, tokens: VetoTokens) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(storageKey(sessionId), JSON.stringify(tokens));
}

export function clearCloudVetoTokens(sessionId: string) {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(storageKey(sessionId));
}

export function withStoredCloudVetoTokens(sessionId: string, state: any) {
  if (!state) return null;
  const tokens = readTokens(sessionId);
  return tokens ? { ...state, ...tokens } : state;
}

async function functionErrorMessage(error: any) {
  const fallback = error?.message || 'Nao foi possivel acessar o veto online.';
  const context = error?.context;
  if (!context || typeof context.json !== 'function') return fallback;

  try {
    const body = await context.json();
    return body?.error || body?.message || fallback;
  } catch {
    return fallback;
  }
}

export async function invokeCloudVeto(event: string, payload: any, sessionId: string) {
  const { data, error } = await requireSupabase().functions.invoke('veto-api', {
    body: {
      event,
      payload: {
        ...(payload || {}),
        matchId: payload?.matchId || sessionId,
      },
    },
  });

  if (error) throw new Error(await functionErrorMessage(error));
  if (!data?.success) throw new Error(data?.error || 'O veto online recusou a solicitacao.');

  if (event === 'veto:create' && data.tokens) {
    saveTokens(sessionId, data.tokens);
  } else if (event === 'veto:delete') {
    clearCloudVetoTokens(sessionId);
  }

  return withStoredCloudVetoTokens(sessionId, data.state);
}
