export interface RoundMvp {
  player: any;
  reason: 'kills' | 'headshots' | 'winning_team' | 'none';
  specialTag?: 'ACE' | '4K' | '3K' | 'CLUTCH';
}

export function detectRoundMvp(players: any[], winningSide: 'CT' | 'T' | null): RoundMvp | null {
  if (!players || players.length === 0) return null;

  // Filter out players who got kills this round
  const playersWithKills = players.map(p => ({
    ...p,
    round_kills: p.state?.round_kills || 0,
    round_killhs: p.state?.round_killhs || 0
  })).filter(p => p.round_kills > 0);

  if (playersWithKills.length === 0) {
    // Fallback: Pick anyone from winning team
    const winnerPlayers = players.filter(p => p.team === winningSide);
    if (winnerPlayers.length > 0) {
      return { player: winnerPlayers[0], reason: 'winning_team' };
    }
    return null;
  }

  // Sort by round_kills DESC, then round_killhs DESC
  playersWithKills.sort((a, b) => {
    if (b.round_kills !== a.round_kills) return b.round_kills - a.round_kills;
    return b.round_killhs - a.round_killhs;
  });

  const topPlayer = playersWithKills[0];
  
  let specialTag: any = undefined;
  if (topPlayer.round_kills >= 5) specialTag = 'ACE';
  else if (topPlayer.round_kills === 4) specialTag = '4K';
  else if (topPlayer.round_kills === 3) specialTag = '3K';

  return {
    player: topPlayer,
    reason: 'kills',
    specialTag
  };
}
