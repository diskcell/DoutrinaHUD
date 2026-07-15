import 'dotenv/config';

interface SteamProfile {
  steamid: string;
  personaname: string;
  avatar: string;
  avatarmedium: string;
  avatarfull: string;
  profileurl: string;
}

interface CacheEntry {
  profile: SteamProfile;
  fetchedAt: number;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const steamProfileCache = new Map<string, CacheEntry>();

export const steamProfileService = {
  async getProfiles(steamids: string[]): Promise<Record<string, SteamProfile>> {
    const apiKey = process.env.STEAM_API_KEY;

    if (!apiKey) {
      console.warn('STEAM_API_KEY não configurada; avatars da Steam desativados');
      return {};
    }

    const uniqueSteamids = [...new Set(steamids)].filter(id => id && id.length > 0);
    const now = Date.now();
    const profiles: Record<string, SteamProfile> = {};
    const toFetch: string[] = [];

    // Check cache
    for (const steamid of uniqueSteamids) {
      const cached = steamProfileCache.get(steamid);
      if (cached && (now - cached.fetchedAt) < CACHE_DURATION) {
        profiles[steamid] = cached.profile;
      } else {
        toFetch.push(steamid);
      }
    }

    if (toFetch.length === 0) {
      return profiles;
    }

    try {
      // Steam API allows up to 100 IDs per request
      const chunks = [];
      for (let i = 0; i < toFetch.length; i += 100) {
        chunks.push(toFetch.slice(i, i + 100));
      }

      for (const chunk of chunks) {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${chunk.join(',')}`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Steam API returned ${response.status}`);
        }

        const data = await response.json() as any;
        const players = data.response?.players || [];

        for (const player of players) {
          const profile: SteamProfile = {
            steamid: player.steamid,
            personaname: player.personaname,
            avatar: player.avatar,
            avatarmedium: player.avatarmedium,
            avatarfull: player.avatarfull,
            profileurl: player.profileurl,
          };

          profiles[profile.steamid] = profile;
          steamProfileCache.set(profile.steamid, {
            profile,
            fetchedAt: now,
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar perfis da Steam:', error);
      // Return whatever we have in cache or nothing
    }

    return profiles;
  }
};
