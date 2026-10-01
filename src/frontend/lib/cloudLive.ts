import { requireSupabase, supabaseProjectUrl } from '../../lib/supabase';
import { getCloudAssetUrl } from './cloudAssets';

export interface CloudLiveSession {
  id: string;
  token: string;
  controlToken: string;
  createdAt: number;
  expiresAt: string;
  overlayModelId: string;
}

export interface CloudLiveBootstrap {
  active: boolean;
  overlayModelId: string;
  latestHudState: unknown;
  lastSeenAt: string | null;
  expiresAt: string;
  players: Array<Record<string, unknown>>;
}

function randomToken(byteLength: number) {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');
  return btoa(binary)
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function getCloudGsiEndpoint(publicId: string) {
  return `${supabaseProjectUrl}/functions/v1/super-api/${encodeURIComponent(publicId)}`;
}

export async function createCloudLiveSession(
  workspaceId: string,
  userId: string,
  overlayModelId: string
): Promise<CloudLiveSession> {
  const client = requireSupabase();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const publicId = randomToken(18);
    const token = randomToken(32);
    const controlToken = randomToken(32);
    const [gsiTokenHash, controlTokenHash] = await Promise.all([
      sha256Hex(token),
      sha256Hex(controlToken),
    ]);

    const { data, error } = await client
      .from('live_sessions')
      .insert({
        public_id: publicId,
        workspace_id: workspaceId,
        created_by: userId,
        gsi_token_hash: gsiTokenHash,
        control_token_hash: controlTokenHash,
        overlay_model_id: overlayModelId,
      })
      .select('public_id, created_at, expires_at, overlay_model_id')
      .single();

    if (!error && data) {
      return {
        id: data.public_id,
        token,
        controlToken,
        createdAt: new Date(data.created_at).getTime(),
        expiresAt: data.expires_at,
        overlayModelId: data.overlay_model_id,
      };
    }

    if (error?.code !== '23505') throw error;
  }

  throw new Error('Nao foi possivel gerar um identificador exclusivo para a sessao.');
}

export async function cloudLiveSessionExists(workspaceId: string, publicId: string) {
  const { data, error } = await requireSupabase()
    .from('live_sessions')
    .select('public_id')
    .eq('workspace_id', workspaceId)
    .eq('public_id', publicId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function updateCloudLiveHudState(publicId: string, hudState: unknown) {
  const { data, error } = await requireSupabase()
    .from('live_sessions')
    .update({ latest_hud_state: hudState })
    .eq('public_id', publicId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .select('public_id')
    .maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error('Voce nao tem permissao para controlar esta sessao.');
  }
}

export async function loadCloudLiveBootstrap(publicId: string): Promise<CloudLiveBootstrap | null> {
  const { data, error } = await requireSupabase().rpc('get_live_session_bootstrap', {
    target_public_id: publicId,
  });

  if (error) throw error;
  if (!data) return null;

  const bootstrap = data as CloudLiveBootstrap;
  return {
    ...bootstrap,
    players: (bootstrap.players || []).map((player) => ({
      ...player,
      steamid: player.steam_id || null,
      avatar: getCloudAssetUrl(String(player.avatar_path || '')),
    })),
  };
}

