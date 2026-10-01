export interface RegisteredPlayer {
  id: number;
  nickname: string;
  real_name: string;
  avatar: string;
  steam_link: string;
  // ... other fields
}

/**
 * Normalizes a string for comparison by removing special characters and lowering case.
 */
function normalize(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts SteamID from a steam community link if possible.
 */
function extractSteamIdFromLink(link: string): string | null {
  if (!link) return null;
  // Basic regex to find 64-bit SteamID or profile name in link
  // For now, we'll just return the link as is if it's already a SteamID
  const match = link.match(/profiles\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Finds a registered player in the database that matches the GSI player.
 * Priority: 
 * 1. SteamID (if we can extract it or if it's stored directly)
 * 2. Nickname (normalized)
 * 3. Real Name (normalized)
 */
export function findRegisteredPlayer(gsiPlayer: any, registeredPlayers: any[]): any | null {
  if (!gsiPlayer || !registeredPlayers) return null;

  const gsiSteamId = gsiPlayer.steamid;
  const gsiName = gsiPlayer.name;

  // 1. Match by SteamID (Assuming steam_link might contain it or there's a steamid field)
  const bySteamId = registeredPlayers.find(rp => {
    if (rp.steamid === gsiSteamId) return true;
    const extracted = extractSteamIdFromLink(rp.steam_link);
    return extracted === gsiSteamId;
  });
  if (bySteamId) return bySteamId;

  // 2. Match by Nickname
  const normalizedGsiName = normalize(gsiName);
  const byNickname = registeredPlayers.find(rp => normalize(rp.nickname) === normalizedGsiName);
  if (byNickname) return byNickname;

  // 3. Match by Real Name
  const byRealName = registeredPlayers.find(rp => normalize(rp.real_name) === normalizedGsiName);
  if (byRealName) return byRealName;

  return null;
}

/**
 * Gets the best available avatar for a player.
 */
export function getPlayerAvatar(gsiPlayer: any, registeredPlayers: any[], steamProfiles: Record<string, any> = {}): string {
  const registered = findRegisteredPlayer(gsiPlayer, registeredPlayers);
  
  if (registered?.avatar) {
    return registered.avatar;
  }

  const steamProfile = steamProfiles[gsiPlayer.steamid];
  if (steamProfile) {
    return steamProfile.avatarfull || steamProfile.avatarmedium || steamProfile.avatar;
  }
  
  return './icons/cs2/customplayer.svg';
}
