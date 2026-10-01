// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const HLTV_ORIGIN = 'https://www.hltv.org';
const ASSET_BUCKET = 'doutrinahud-assets';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function decodeHtml(value: string) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&#0?39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function normalizeHltvUrl(value: string) {
  const trimmed = String(value || '').trim();
  if (trimmed.startsWith('/')) return `${HLTV_ORIGIN}${trimmed}`;
  return trimmed;
}

function validateTeamUrl(value: string) {
  try {
    const url = new URL(normalizeHltvUrl(value));
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'hltv.org' || url.hostname === 'www.hltv.org') &&
      /^\/team\/\d+(?:\/|$)/.test(url.pathname)
    );
  } catch {
    return false;
  }
}

function absoluteHltvUrl(value: string) {
  if (value.startsWith('//')) return `https:${value}`;
  if (value.startsWith('/')) return `${HLTV_ORIGIN}${value}`;
  return value;
}

function normalizeEscapedUrl(value: string) {
  return decodeHtml(value)
    .replace(/\\u003d/g, '=')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/');
}

function sanitizeFilePart(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'player';
}

function extractTeamId(hltvUrl: string) {
  return hltvUrl.match(/\/team\/(\d+)(?:\/|$)/)?.[1] || null;
}

type RosterPlayer = {
  id: string | null;
  url: string | null;
  nickname: string;
};

function linkedPlayer(pathName: string, id: string, slug: string): RosterPlayer {
  return {
    id,
    url: `${HLTV_ORIGIN}${pathName}`,
    nickname: decodeURIComponent(slug).replace(/-/g, ' '),
  };
}

function extractLinkedPlayers(text: string) {
  const players = new Map<string, RosterPlayer>();
  const add = (pathName: string, id: string, slug: string) => {
    if (!players.has(id)) players.set(id, linkedPlayer(pathName, id, slug));
  };

  for (const match of text.matchAll(/href=["'](\/player\/(\d+)\/([^"'?#/]+))["']/gi)) {
    add(match[1], match[2], match[3]);
  }

  for (const match of text.matchAll(/https:\/\/www\.hltv\.org(\/player\/(\d+)\/([^\s)"'?#/]+))/gi)) {
    add(match[1], match[2], match[3]);
  }

  for (const match of text.matchAll(/\]\((\/player\/(\d+)\/([^\s)"'?#/]+))\)/gi)) {
    add(match[1], match[2], match[3]);
  }

  return Array.from(players.values()).slice(0, 5);
}

function extractReaderRoster(markdown: string) {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rosterHeading = lines.findIndex((line) => /^#{0,3}\s*(roster|players)$/i.test(line));
  const signInIndex = lines.findIndex((line) => line.toLowerCase() === 'sign in');
  const startIndex = rosterHeading >= 0 ? rosterHeading + 1 : signInIndex >= 0 ? signInIndex + 1 : 0;
  const roster: RosterPlayer[] = [];
  const ignored = new Set([
    'brazil', 'europe', 'north america', 'south america', 'cis', 'coach', 'info',
    'roster', 'players', 'matches', 'events', 'results', 'statistics', 'news',
  ]);

  for (const line of lines.slice(startIndex)) {
    const clean = line.replace(/^[-*]\s*/, '').trim();
    const normalized = clean.toLowerCase();

    if (!clean || ignored.has(normalized) || normalized.startsWith('#')) continue;
    if (
      clean.length > 24 ||
      clean.includes(' ') ||
      /[:\[\]()]/.test(clean) ||
      /ranking|timezone|settings|filter/i.test(clean)
    ) continue;

    roster.push({ id: null, url: null, nickname: clean });
    if (roster.length >= 5) break;
  }

  return roster;
}

function extractPlayerLinks(teamText: string) {
  const linked = extractLinkedPlayers(teamText);
  return linked.length ? linked : extractReaderRoster(teamText);
}

function extractMetaContent(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const propertyFirst = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
    'i',
  );
  return decodeHtml(html.match(propertyFirst)?.[1] || html.match(contentFirst)?.[1] || '');
}

function extractPlayerImage(text: string, nickname: string) {
  const htmlUrls = Array.from(
    text.matchAll(/(?:src|data-src|srcset)=["']([^"']*img-cdn\.hltv\.org\/[^"'\s,]+)["']/gi),
  ).map((match) => absoluteHltvUrl(normalizeEscapedUrl(match[1])));
  const textUrls = Array.from(
    text.matchAll(/https:\/\/img-cdn\.hltv\.org\/[^\s)"',]+/gi),
  ).map((match) => normalizeEscapedUrl(match[0]));
  const metaImage = extractMetaContent(text, 'og:image');
  const urls = [...htmlUrls, ...textUrls, ...(metaImage ? [metaImage] : [])];
  const nick = sanitizeFilePart(nickname);

  return urls.find((url) => {
    const lower = url.toLowerCase();
    return lower.includes('playerbodyshot') || lower.includes('playerprofile') || lower.includes(nick);
  }) || urls[0] || '';
}

function extractRealName(text: string) {
  const readerTitle = text.match(/^Title:\s*([^'\n]+)\s+'[^']+'\s+([^\n]+)/m);
  if (readerTitle) return decodeHtml(`${readerTitle[1]} ${readerTitle[2]}`);

  const match =
    text.match(/class=["'][^"']*playerRealname[^"']*["'][^>]*>([^<]+)/i) ||
    text.match(/class=["'][^"']*player-realname[^"']*["'][^>]*>([^<]+)/i);
  return decodeHtml(match?.[1] || '');
}

function extractNickname(text: string, fallback: string) {
  const readerTitle = text.match(/^Title:\s*[^'\n]*'([^']+)'/m)?.[1];
  if (readerTitle) return decodeHtml(readerTitle);

  const title = extractMetaContent(text, 'og:title');
  const titleNick = title.match(/(?:^|\s)'?([^'|"]+)'?\s*\|/)?.[1];
  if (titleNick) return titleNick.trim();

  return decodeHtml(text.match(/<h1[^>]*>([^<]+)<\/h1>/i)?.[1] || fallback);
}

function readerUrlFor(url: string) {
  return `https://r.jina.ai/http://${url.replace(/^https?:\/\//i, '')}`;
}

async function fetchReaderText(url: string) {
  const response = await fetch(readerUrlFor(url), {
    headers: { 'User-Agent': 'DoutrinaHUD/1.0', Accept: 'text/plain,text/markdown,*/*' },
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) throw new Error(`Leitor alternativo respondeu HTTP ${response.status}.`);
  return response.text();
}

async function fetchHltvText(url: string) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8',
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (response.ok) return response.text();
    if (![403, 429].includes(response.status)) {
      throw new Error(`HLTV respondeu HTTP ${response.status}.`);
    }
  } catch (error) {
    console.warn('Consulta direta da HLTV falhou; usando leitor alternativo.', error);
  }

  return fetchReaderText(url);
}

async function searchHltvPlayer(nickname: string, teamName: string, playerId: string | null) {
  let text = '';

  try {
    const response = await fetch(`${HLTV_ORIGIN}/search?term=${encodeURIComponent(nickname)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 DoutrinaHUD/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(12_000),
    });
    if (response.ok) text = await response.text();
  } catch {
    // O fallback abaixo ainda pode localizar o jogador.
  }

  if (!text) text = await fetchReaderText(`${HLTV_ORIGIN}/search?term=${encodeURIComponent(nickname)}`);
  const jsonStart = text.indexOf('[');
  if (jsonStart < 0) return null;

  let data: any;
  try {
    data = JSON.parse(text.slice(jsonStart).trim());
  } catch {
    return null;
  }

  const players = Array.isArray(data) ? data.flatMap((entry) => entry?.players || []) : [];
  const normalizedNick = nickname.toLowerCase();
  const normalizedTeam = teamName.toLowerCase();

  return players.find((player) => String(player?.id || '') === String(playerId || '')) ||
    players.find((player) =>
      String(player?.nickName || '').toLowerCase() === normalizedNick &&
      String(player?.team?.name || '').toLowerCase() === normalizedTeam
    ) ||
    players.find((player) => String(player?.nickName || '').toLowerCase() === normalizedNick) ||
    players[0] || null;
}

function allowedImageType(contentType: string) {
  const normalized = contentType.split(';')[0].toLowerCase();
  return ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'].includes(normalized)
    ? normalized
    : '';
}

function imageExtension(contentType: string) {
  if (contentType === 'image/png') return 'png';
  if (contentType === 'image/webp') return 'webp';
  if (contentType === 'image/svg+xml') return 'svg';
  return 'jpg';
}

async function downloadPlayerImage(
  workspaceId: string,
  imageUrl: string,
  playerId: string | null,
  nickname: string,
) {
  if (!imageUrl) return '';

  const normalized = normalizeEscapedUrl(imageUrl);
  const candidates = normalized.includes('img-cdn.hltv.org')
    ? [
        `https://images.weserv.nl/?url=${encodeURIComponent(normalized.replace(/^https?:\/\//, ''))}&output=webp`,
        normalized,
      ]
    : [normalized];

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        headers: {
          'User-Agent': 'Mozilla/5.0 DoutrinaHUD/1.0',
          Accept: 'image/webp,image/png,image/jpeg,image/svg+xml,image/*',
          Referer: HLTV_ORIGIN,
        },
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) continue;

      const contentType = allowedImageType(response.headers.get('content-type') || '');
      const bytes = await response.arrayBuffer();
      if (!contentType || bytes.byteLength === 0 || bytes.byteLength > MAX_IMAGE_BYTES) continue;

      const extension = imageExtension(contentType);
      const objectPath = `${workspaceId}/players/hltv-${playerId || sanitizeFilePart(nickname)}.${extension}`;
      const { error } = await admin.storage.from(ASSET_BUCKET).upload(
        objectPath,
        new Blob([bytes], { type: contentType }),
        { contentType, cacheControl: '31536000', upsert: true },
      );
      if (error) throw error;
      return objectPath;
    } catch (error) {
      console.warn(`Nao foi possivel salvar a foto de ${nickname}.`, error);
    }
  }

  return '';
}

async function requireUser(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('AUTH_MISSING');

  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new Error('AUTH_INVALID');
  return data.user;
}

async function findExistingPlayer(workspaceId: string, teamId: number, hltvPlayerId: string | null, nickname: string) {
  let query = admin
    .from('players')
    .select('id, avatar_path')
    .eq('workspace_id', workspaceId)
    .limit(1);

  query = hltvPlayerId
    ? query.eq('hltv_player_id', hltvPlayerId)
    : query.eq('team_id', teamId).ilike('nickname', nickname);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ success: false, error: 'Metodo nao permitido.' }, 405);
  }

  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ success: false, error: 'Funcao nao configurada no Supabase.' }, 500);
  }

  try {
    const user = await requireUser(request);
    const body = await request.json();
    const teamId = Number(body?.teamId);
    const hltvUrl = normalizeHltvUrl(body?.hltvUrl);

    if (!Number.isSafeInteger(teamId) || teamId <= 0 || !validateTeamUrl(hltvUrl)) {
      return jsonResponse({
        success: false,
        error: 'Informe um time e uma URL valida no formato https://www.hltv.org/team/ID/NOME.',
      }, 400);
    }

    const { data: team, error: teamError } = await admin
      .from('teams')
      .select('id, workspace_id, name')
      .eq('id', teamId)
      .maybeSingle();

    if (teamError) throw teamError;
    if (!team) return jsonResponse({ success: false, error: 'Time nao encontrado.' }, 404);

    const { data: membership, error: membershipError } = await admin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', team.workspace_id)
      .eq('user_id', user.id)
      .in('role', ['owner', 'editor'])
      .maybeSingle();

    if (membershipError) throw membershipError;
    if (!membership) {
      return jsonResponse({ success: false, error: 'Voce nao tem permissao para editar este time.' }, 403);
    }

    const teamText = await fetchHltvText(hltvUrl);
    const roster = extractPlayerLinks(teamText);

    if (!roster.length) {
      return jsonResponse({
        success: false,
        error: 'Nao encontrei o elenco atual na pagina da HLTV. Confira o link e tente novamente.',
      }, 422);
    }

    const importedPlayers = [];

    for (const rosterPlayer of roster) {
      let nickname = rosterPlayer.nickname;
      let realName = '';
      let imageUrl = '';
      let hltvPlayerId = rosterPlayer.id;
      let hltvProfileUrl = rosterPlayer.url;

      if (hltvProfileUrl) {
        try {
          const profileText = await fetchHltvText(hltvProfileUrl);
          nickname = extractNickname(profileText, nickname);
          realName = extractRealName(profileText);
          imageUrl = extractPlayerImage(profileText, nickname);
        } catch (error) {
          console.warn(`Perfil da HLTV indisponivel para ${nickname}.`, error);
        }
      }

      if (!imageUrl) {
        try {
          const result = await searchHltvPlayer(nickname, team.name, hltvPlayerId);
          if (result) {
            nickname = result.nickName || nickname;
            realName = [result.firstName, result.lastName].filter(Boolean).join(' ') || realName;
            imageUrl = result.pictureUrl || imageUrl;
            hltvPlayerId = result.id ? String(result.id) : hltvPlayerId;
            hltvProfileUrl = result.location ? normalizeHltvUrl(result.location) : hltvProfileUrl;
          }
        } catch (error) {
          console.warn(`Busca complementar falhou para ${nickname}.`, error);
        }
      }

      const existing = await findExistingPlayer(
        team.workspace_id,
        team.id,
        hltvPlayerId,
        nickname,
      );
      const downloadedAvatar = await downloadPlayerImage(
        team.workspace_id,
        imageUrl,
        hltvPlayerId,
        nickname,
      );
      const avatarPath = downloadedAvatar || existing?.avatar_path || null;
      const playerValues = {
        workspace_id: team.workspace_id,
        team_id: team.id,
        nickname,
        real_name: realName || null,
        avatar_path: avatarPath,
        status: 'active',
        hltv_player_id: hltvPlayerId,
        hltv_profile_url: hltvProfileUrl,
        avatar_source: downloadedAvatar ? 'hltv' : avatarPath ? 'existing' : null,
        hltv_synced_at: new Date().toISOString(),
      };

      const query = existing
        ? admin.from('players').update(playerValues).eq('id', existing.id).select('id').single()
        : admin.from('players').insert(playerValues).select('id').single();
      const { data: saved, error: saveError } = await query;
      if (saveError) throw saveError;

      importedPlayers.push({
        id: saved.id,
        action: existing ? 'updated' : 'created',
        nickname,
        real_name: realName || null,
        avatar_path: avatarPath,
        hltv_player_id: hltvPlayerId,
        hltv_profile_url: hltvProfileUrl,
      });
    }

    const { error: updateTeamError } = await admin
      .from('teams')
      .update({
        hltv_url: hltvUrl,
        hltv_team_id: extractTeamId(hltvUrl),
        hltv_synced_at: new Date().toISOString(),
      })
      .eq('id', team.id)
      .eq('workspace_id', team.workspace_id);
    if (updateTeamError) throw updateTeamError;

    return jsonResponse({ success: true, teamId: team.id, hltvUrl, players: importedPlayers });
  } catch (error) {
    console.error('Falha na importacao HLTV:', error);

    if (error?.message === 'AUTH_MISSING' || error?.message === 'AUTH_INVALID') {
      return jsonResponse({ success: false, error: 'Sua sessao expirou. Entre novamente.' }, 401);
    }

    return jsonResponse({
      success: false,
      error: error?.message || 'Erro inesperado ao importar dados da HLTV.',
    }, 500);
  }
});
