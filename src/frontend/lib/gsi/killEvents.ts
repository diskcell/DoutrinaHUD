export interface KillEvent {
  id: string;
  attackerSteamId: string;
  attackerName: string;
  attackerTeam: 'CT' | 'T';
  roundKills: number;
  timestamp: number;
}

/**
 * Compares current players with previous snapshot to detect new kills.
 * Returns an array of new KillEvents.
 */
export function detectNewKills(
  currentPlayers: any[],
  prevKillsMap: Record<string, number>
): { events: KillEvent[]; newKillsMap: Record<string, number> } {
  const events: KillEvent[] = [];
  const newKillsMap: Record<string, number> = { ...prevKillsMap };

  currentPlayers.forEach(player => {
    const steamid = player.steamid;
    const currentKills = player.match_stats?.kills ?? 0;
    const prevKills = prevKillsMap[steamid] ?? currentKills;

    if (currentKills > prevKills) {
      // New kill detected
      const roundKills = player.state?.round_kills ?? 1;
      
      events.push({
        id: `${steamid}-${currentKills}-${Date.now()}`,
        attackerSteamId: steamid,
        attackerName: player.name,
        attackerTeam: player.team,
        roundKills: roundKills,
        timestamp: Date.now()
      });

      newKillsMap[steamid] = currentKills;
    } else if (currentKills < prevKills) {
      // Kills decreased? Likely a match restart or player change. Reset.
      newKillsMap[steamid] = currentKills;
    }
  });

  return { events, newKillsMap };
}

/**
 * Returns the Portuguese label for a multi-kill level
 */
export function getMultiKillLabel(roundKills: number): string {
  if (roundKills === 2) return '2K';
  if (roundKills === 3) return '3K';
  if (roundKills === 4) return '4K';
  if (roundKills >= 5) return 'ACE';
  return 'ABATE';
}
