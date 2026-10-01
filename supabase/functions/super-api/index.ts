// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

type CachedSession = {
  databaseId: string;
  tokenHash: string;
  expiresAt: number;
  checkedAt: number;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
function getServiceKey() {
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS');

  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      if (parsed.default) return String(parsed.default);
    } catch (error) {
      console.warn('SUPABASE_SECRET_KEYS nao pode ser interpretado:', error);
    }
  }

  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
}

const serviceKey = getServiceKey();
const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sessionCache = new Map<string, CachedSession>();
const CACHE_TTL_MS = 60_000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function normalizeGameState(gameState: Record<string, any>) {
  const rawGrenades =
    gameState.grenades ||
    gameState.allgrenades ||
    gameState.allgrenades_map ||
    null;

  return {
    provider: gameState.provider || null,
    map: {
      name: gameState.map?.name || null,
      phase: gameState.map?.phase || null,
      round: gameState.map?.round || 0,
      team_ct: gameState.map?.team_ct || null,
      team_t: gameState.map?.team_t || null,
      num_matches_to_win_series: gameState.map?.num_matches_to_win_series || 0,
      current_spectator_count: gameState.map?.current_spectator_count || 0,
      souvenirs_total: gameState.map?.souvenirs_total || 0,
    },
    round: {
      phase: gameState.round?.phase || null,
      bomb: gameState.round?.bomb || null,
      win_team: gameState.round?.win_team || null,
    },
    player: {
      steamid: gameState.player?.steamid || null,
      name: gameState.player?.name || null,
      clan: gameState.player?.clan || null,
      observer_slot: gameState.player?.observer_slot || null,
      team: gameState.player?.team || null,
      activity: gameState.player?.activity || null,
      match_stats: gameState.player?.match_stats || null,
      state: gameState.player?.state || null,
      weapons: gameState.player?.weapons || null,
    },
    allplayers: gameState.allplayers || null,
    phase_countdowns: {
      phase: gameState.phase_countdowns?.phase || null,
      phase_ends_in: gameState.phase_countdowns?.phase_ends_in || null,
    },
    bomb: {
      state: gameState.bomb?.state || null,
      position: gameState.bomb?.position || null,
      countdown: gameState.bomb?.countdown || null,
    },
    grenades: rawGrenades,
    received_at: new Date().toISOString(),
  };
}

async function getSession(publicId: string): Promise<CachedSession | null> {
  const cached = sessionCache.get(publicId);
  const currentTime = Date.now();

  if (
    cached &&
    currentTime - cached.checkedAt < CACHE_TTL_MS &&
    cached.expiresAt > currentTime
  ) {
    return cached;
  }

  const { data, error } = await admin
    .from('live_sessions')
    .select('id, gsi_token_hash, expires_at')
    .eq('public_id', publicId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    sessionCache.delete(publicId);
    return null;
  }

  const session = {
    databaseId: data.id,
    tokenHash: data.gsi_token_hash,
    expiresAt: new Date(data.expires_at).getTime(),
    checkedAt: currentTime,
  };

  sessionCache.set(publicId, session);

  await admin
    .from('live_sessions')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('id', data.id);

  return session;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Metodo nao permitido.' }, 405);
  }

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: 'Funcao nao configurada.' }, 500);
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 2 * 1024 * 1024) {
    return jsonResponse({ error: 'Payload GSI muito grande.' }, 413);
  }

  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const publicId = decodeURIComponent(pathParts.at(-1) || '');

  if (!publicId || publicId === 'super-api') {
    return jsonResponse({ error: 'Sessao nao informada.' }, 400);
  }

  try {
    const gameState = await request.json();

    if (Number(gameState?.provider?.appid) !== 730) {
      return jsonResponse({ error: 'Payload nao pertence ao Counter-Strike 2.' }, 400);
    }

    const providedToken = String(gameState?.auth?.token || '');
    if (!providedToken) {
      return jsonResponse({ error: 'Token GSI ausente.' }, 401);
    }

    const session = await getSession(publicId);
    if (!session) {
      return jsonResponse({ error: 'Sessao expirada ou inexistente.' }, 404);
    }

    const providedHash = await sha256Hex(providedToken);
    if (!safeEqual(session.tokenHash, providedHash)) {
      return jsonResponse({ error: 'Token GSI invalido.' }, 401);
    }

    const payload = normalizeGameState(gameState);
    const topic = `live:${publicId}`;
    const broadcastUrl = `${supabaseUrl}/realtime/v1/api/broadcast/${encodeURIComponent(topic)}/events/${encodeURIComponent('gsi:update')}`;
    const broadcastResponse = await fetch(broadcastUrl, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!broadcastResponse.ok) {
      const detail = await broadcastResponse.text();
      console.error('Realtime Broadcast recusou o GSI:', broadcastResponse.status, detail);
      return jsonResponse({ error: 'Nao foi possivel transmitir o GSI.' }, 502);
    }

    return new Response(null, { status: 204, headers: corsHeaders });
  } catch (error) {
    console.error('Falha no receptor GSI:', error);
    return jsonResponse({ error: 'Falha ao processar o GSI.' }, 500);
  }
});

