import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { playerRepository } from '../database/repositories/playerRepository.js';
import { teamRepository } from '../database/repositories/teamRepository.js';

const router = Router();
const HLTV_ORIGIN = 'https://www.hltv.org';
const JINA_READER_PREFIX = 'https://r.jina.ai/http://';

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function normalizeHltvUrl(url: string) {
  const trimmed = String(url || '').trim();

  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return `${HLTV_ORIGIN}${trimmed}`;

  return trimmed;
}

function absoluteHltvAssetUrl(url: string) {
  if (url.startsWith('//')) return `https:${url}`;
  if (url.startsWith('/')) return `${HLTV_ORIGIN}${url}`;
  return url;
}

function normalizeEscapedUrl(url: string) {
  return decodeHtml(url)
    .replace(/\\u003d/g, '=')
    .replace(/\\u0026/g, '&')
    .replace(/\\\//g, '/');
}

function sanitizeFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function extractTeamId(hltvUrl: string) {
  return hltvUrl.match(/\/team\/(\d+)\//)?.[1] || null;
}

function playerFromPath(pathName: string, id: string, slug: string) {
  return {
    id,
    url: `${HLTV_ORIGIN}${pathName}`,
    nickname: decodeURIComponent(slug).replace(/-/g, ' '),
  };
}

function extractLinkedPlayers(text: string) {
  const players = new Map<string, { id: string | null; url: string | null; nickname: string }>();
  const playerPatterns = [
    /href="(\/player\/(\d+)\/([^"#?]+))"/g,
    /https:\/\/www\.hltv\.org(\/player\/(\d+)\/([^\])\s"#?]+))/g,
    /\]\((\/player\/(\d+)\/([^\])\s"#?]+))\)/g,
  ];

  for (const pattern of playerPatterns) {
    for (const match of text.matchAll(pattern)) {
      const [, pathName, id, slug] = match;

      if (!players.has(id)) {
        players.set(id, playerFromPath(pathName, id, slug));
      }
    }
  }

  return Array.from(players.values()).slice(0, 5);
}

function extractReaderRoster(markdown: string) {
  const lines = markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const signInIndex = lines.findIndex((line) => line.toLowerCase() === 'sign in');
  const startIndex = signInIndex >= 0 ? signInIndex + 1 : 0;
  const stopWords = new Set([
    'brazil',
    'europe',
    'north america',
    'south america',
    'cis',
    'valve ranking',
    'world ranking',
    'weeks in top30 for core',
    'average player age',
    'coach',
    'info',
    'roster',
    'settings',
    'theme day night auto',
    'show results yes no',
    'automatic timezone on off',
    'timezone',
    'force desktop mode on off',
    'match filter settings expand',
    'enable filter yes no',
    'reset filter',
    'match type',
    'star filter clear',
    'min. stars',
    'event type',
    'team',
    'teams',
    'events',
  ]);

  const roster: Array<{ id: string | null; url: string | null; nickname: string }> = [];

  for (const line of lines.slice(startIndex)) {
    const normalized = line.toLowerCase();

    if (stopWords.has(normalized) || normalized.startsWith('#')) break;
    if (
      normalized.length > 24 ||
      normalized.includes(' ') ||
      normalized.includes(':') ||
      normalized.includes('ranking') ||
      normalized.includes('[') ||
      normalized.includes(']') ||
      normalized.includes('(') ||
      normalized.includes(')')
    ) {
      continue;
    }

    roster.push({
      id: null,
      url: null,
      nickname: line,
    });

    if (roster.length >= 5) break;
  }

  return roster;
}

function extractPlayerLinks(teamHtml: string) {
  const linkedPlayers = extractLinkedPlayers(teamHtml);

  if (linkedPlayers.length > 0) {
    return linkedPlayers;
  }

  return extractReaderRoster(teamHtml);
}

function extractMetaContent(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`, 'i');
  return decodeHtml(html.match(regex)?.[1] || '');
}

function extractPlayerImage(html: string, nickname: string) {
  const htmlImageUrls = Array.from(
    html.matchAll(/(?:src|data-src)=["']([^"']*img-cdn\.hltv\.org\/[^"']+)["']/g)
  ).map((match) => absoluteHltvAssetUrl(normalizeEscapedUrl(match[1])));

  const markdownImageUrls = Array.from(
    html.matchAll(/https:\/\/img-cdn\.hltv\.org\/[^\s)"']+/g)
  ).map((match) => normalizeEscapedUrl(match[0]));

  const imageUrls = [...htmlImageUrls, ...markdownImageUrls];

  const preferred = imageUrls.find((url) => {
    const lower = url.toLowerCase();
    return (
      lower.includes('playerbodyshot') ||
      lower.includes('playerprofile') ||
      lower.includes('bodyshot') ||
      lower.includes(sanitizeFilePart(nickname))
    );
  });

  return preferred || imageUrls[0] || '';
}

function extractRealName(html: string) {
  const titleMatch = html.match(/^Title:\s*([^'\n]+)\s+'[^']+'\s+([^\n]+)/m);

  if (titleMatch) {
    return decodeHtml(`${titleMatch[1]} ${titleMatch[2]}`.trim());
  }

  const realNameMatch =
    html.match(/class=["'][^"']*playerRealname[^"']*["'][^>]*>([^<]+)</i) ||
    html.match(/class=["'][^"']*player-realname[^"']*["'][^>]*>([^<]+)</i);

  return decodeHtml(realNameMatch?.[1] || '');
}

function extractNickname(html: string, fallback: string) {
  const readerTitle = html.match(/^Title:\s*[^'\n]*'([^']+)'/m)?.[1];

  if (readerTitle) return decodeHtml(readerTitle);

  const title = extractMetaContent(html, 'og:title');
  const titleNick = title.match(/(?:^|\s)'?([^'|"]+)'?\s*\|/)?.[1];

  if (titleNick) return titleNick.trim();

  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match?.[1]) return decodeHtml(h1Match[1]);

  return fallback;
}

async function searchHltvPlayer(
  nickname: string,
  teamName?: string | null,
  hltvPlayerId?: string | null
) {
  const searchUrl = `${HLTV_ORIGIN}/search?term=${encodeURIComponent(nickname)}`;
  const searchText = await fetchReaderText(searchUrl);
  const jsonStart = searchText.indexOf('[');

  if (jsonStart < 0) return null;

  const jsonText = searchText.slice(jsonStart).trim();
  let data: any;

  try {
    data = JSON.parse(jsonText);
  } catch {
    return null;
  }

  const players = Array.isArray(data)
    ? data.flatMap((entry) => entry?.players || [])
    : [];

  if (players.length === 0) return null;

  const normalizedNick = nickname.toLowerCase();
  const normalizedTeam = String(teamName || '').toLowerCase();
  const normalizedPlayerId = String(hltvPlayerId || '');

  return (
    players.find((player: any) => String(player?.id || '') === normalizedPlayerId) ||
    players.find((player: any) => {
      const sameNick = String(player?.nickName || '').toLowerCase() === normalizedNick;
      const sameTeam = normalizedTeam
        ? String(player?.team?.name || '').toLowerCase() === normalizedTeam
        : true;

      return sameNick && sameTeam;
    }) ||
    players.find((player: any) => String(player?.nickName || '').toLowerCase() === normalizedNick) ||
    players[0]
  );
}

async function fetchReaderText(url: string) {
  const readerUrl = `${JINA_READER_PREFIX}${url}`;
  const response = await fetch(readerUrl, {
    headers: {
      'User-Agent': 'DoutrinaHUD/1.0',
      Accept: 'text/plain,text/markdown,*/*',
    },
  });

  if (!response.ok) {
    throw new Error(`Fallback Reader respondeu HTTP ${response.status}`);
  }

  return response.text();
}

async function fetchHltvText(url: string, allowReaderFallback = true) {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 DoutrinaHUD/1.0',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8',
    },
  });

  if (!response.ok) {
    if (allowReaderFallback && (response.status === 403 || response.status === 429)) {
      return fetchReaderText(url);
    }

    throw new Error(`HLTV respondeu HTTP ${response.status}`);
  }

  return response.text();
}

async function downloadPlayerImage(imageUrl: string, hltvPlayerId: string | null, nickname: string) {
  if (!imageUrl) return '';

  const normalizedImageUrl = normalizeEscapedUrl(imageUrl);
  const proxyImageUrl = normalizedImageUrl.includes('img-cdn.hltv.org')
    ? `https://images.weserv.nl/?url=${encodeURIComponent(
        normalizedImageUrl.replace(/^https?:\/\//, '')
      )}`
    : '';

  let response = await fetch(normalizedImageUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 DoutrinaHUD/1.0',
      Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      Referer: HLTV_ORIGIN,
    },
  });

  if (!response.ok && proxyImageUrl) {
    response = await fetch(proxyImageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 DoutrinaHUD/1.0',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
    });
  }

  if (!response.ok) return '';

  const contentType = response.headers.get('content-type') || '';
  const extension = contentType.includes('png')
    ? 'png'
    : contentType.includes('webp')
      ? 'webp'
      : contentType.includes('jpeg') || contentType.includes('jpg')
        ? 'jpg'
        : path.extname(new URL(normalizedImageUrl).pathname).replace('.', '') || 'jpg';

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'players');
  fs.mkdirSync(uploadsDir, { recursive: true });

  const fileName = `hltv_${hltvPlayerId || sanitizeFilePart(nickname)}_${sanitizeFilePart(nickname)}.${extension}`;
  const filePath = path.join(uploadsDir, fileName);
  const buffer = Buffer.from(await response.arrayBuffer());

  fs.writeFileSync(filePath, buffer);

  return `/uploads/players/${fileName}`;
}

router.post('/import-team', async (req, res) => {
  try {
    const teamId = Number(req.body.teamId);
    const hltvUrl = normalizeHltvUrl(req.body.hltvUrl);

    if (!teamId || !hltvUrl || !hltvUrl.includes('/team/')) {
      return res.status(400).json({
        success: false,
        error: 'Informe um teamId e uma URL de time HLTV valida.',
      });
    }

    const team = teamRepository.getById(teamId);

    if (!team) {
      return res.status(404).json({ success: false, error: 'Time nao encontrado.' });
    }

    const teamHtml = await fetchHltvText(hltvUrl);
    const hltvTeamId = extractTeamId(hltvUrl);
    const roster = extractPlayerLinks(teamHtml);

    if (roster.length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Nao encontrei jogadores na pagina HLTV informada.',
      });
    }

    const importedPlayers = [];

    for (const rosterPlayer of roster) {
      let nickname = rosterPlayer.nickname;
      let realName = '';
      let imageUrl = '';
      let avatar = '';
      let hltvPlayerId = rosterPlayer.id || null;
      let hltvProfileUrl = rosterPlayer.url || null;

      if (hltvProfileUrl) {
        try {
          const profileHtml = await fetchHltvText(hltvProfileUrl);
          nickname = extractNickname(profileHtml, rosterPlayer.nickname);
          realName = extractRealName(profileHtml) || realName;
          imageUrl = extractPlayerImage(profileHtml, nickname);
        } catch (profileError) {
          console.warn(
            `[HLTV Import] Perfil bloqueado para ${rosterPlayer.nickname}; tentando busca.`
          );
        }
      }

      if (!imageUrl) {
        try {
          const searchResult = await searchHltvPlayer(nickname, team.name, hltvPlayerId);

          if (searchResult) {
            nickname = searchResult.nickName || nickname;
            realName =
              [searchResult.firstName, searchResult.lastName].filter(Boolean).join(' ') ||
              realName;
            imageUrl = searchResult.pictureUrl || imageUrl;
            hltvPlayerId = searchResult.id ? String(searchResult.id) : hltvPlayerId;
            hltvProfileUrl = searchResult.location
              ? normalizeHltvUrl(searchResult.location)
              : hltvProfileUrl;
          }
        } catch (searchError) {
          console.warn(`[HLTV Import] Busca falhou para ${nickname}; importando sem foto.`);
        }
      }

      avatar = await downloadPlayerImage(imageUrl, hltvPlayerId, nickname);

      const result = playerRepository.upsertFromHltv({
        nickname,
        real_name: realName,
        steam_id: null,
        avatar,
        team_id: teamId,
        role: null,
        country: null,
        hltv_player_id: hltvPlayerId,
        hltv_profile_url: hltvProfileUrl,
        avatar_source: avatar ? 'hltv' : null,
      });

      importedPlayers.push({
        id: result.id,
        action: result.action,
        nickname,
        real_name: realName,
        avatar,
        hltv_player_id: hltvPlayerId,
        hltv_profile_url: hltvProfileUrl,
      });
    }

    teamRepository.markHltvSynced(teamId, hltvUrl, hltvTeamId);

    return res.json({
      success: true,
      teamId,
      hltvUrl,
      players: importedPlayers,
    });
  } catch (error: any) {
    console.error('[HLTV Import]', error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao importar dados do HLTV.',
    });
  }
});

export default router;
