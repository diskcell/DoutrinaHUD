export type BombStatus = 'idle' | 'dropped' | 'planting' | 'planted' | 'defusing' | 'defused' | 'exploded';

export interface BombStateData {
  status: BombStatus;
  countdown: number | null; // Exact countdown if available from GSI (or phase_ends_in)
  defuserPlayer: any | null; // Player object if someone is defusing
  defuseProgress: number | null; // Defuse progress if phase_ends_in and defuse time is known, or indeterminate
  hasKit: boolean;
}

export function parseBombState(gsiState: any, players: any[]): BombStateData {
  const roundPhase = gsiState?.round?.phase;
  const roundBomb = gsiState?.round?.bomb; // "planted", "exploded", "defused", "dropped"
  const bombObjState = gsiState?.bomb?.state;
  const bombCountdown = gsiState?.bomb?.countdown;
  
  const phase = gsiState?.phase_countdowns?.phase;
  const phaseEndsIn = gsiState?.phase_countdowns?.phase_ends_in 
    ? parseFloat(gsiState.phase_countdowns.phase_ends_in) 
    : null;

  let status: BombStatus = 'idle';
  
  if (bombObjState === 'planting' || roundBomb === 'planting') status = 'planting';
  else if (bombObjState === 'defusing' || phase === 'defuse') status = 'defusing';
  else if (bombObjState === 'planted' || roundBomb === 'planted' || phase === 'bomb') status = 'planted';
  else if (bombObjState === 'dropped' || roundBomb === 'dropped') status = 'dropped';
  else if (bombObjState === 'defused' || roundBomb === 'defused') status = 'defused';
  else if (bombObjState === 'exploded' || roundBomb === 'exploded') status = 'exploded';

  // Specific check for round over to avoid false "exploded" if Ts won by elimination while bomb was planted
  if (roundPhase === 'over') {
    if (roundBomb === 'defused') status = 'defused';
    else if (roundBomb === 'exploded') status = 'exploded';
    // If Ts win while planted, but not exploded, it's just 'idle' or hide it.
    // The RoundEndBanner will handle showing "Terroristas Ganharam".
    else if (roundBomb === 'planted' && gsiState?.round?.win_team === 'T') status = 'idle';
  }

  // Determine Countdown
  let countdown = null;
  if (bombCountdown) countdown = parseFloat(bombCountdown);
  else if ((status === 'planted' || status === 'defusing') && phaseEndsIn !== null) countdown = phaseEndsIn;

  // Determine Defuser and Kit
  let defuserPlayer = null;
  let hasKit = false;
  let defuseProgress = null;

  if (status === 'defusing') {
    // Try to find the defusing player
    defuserPlayer = players.find(p => p.state?.defuse_progress > 0 || p.activity === 'defusing' || p.team === 'CT' && p.state?.health > 0);
    // If we can't find specific activity, fallback to null but keep status
    
    if (defuserPlayer) {
      hasKit = defuserPlayer.state?.defusekit === true || defuserPlayer.state?.defusekit === 1;
    } else {
      // Look if ANY alive CT has a kit (fallback estimation)
      const aliveCTsWithKit = players.filter(p => p.team === 'CT' && p.state?.health > 0 && (p.state?.defusekit === true || p.state?.defusekit === 1));
      if (aliveCTsWithKit.length > 0) hasKit = true;
    }

    // Estimate progress if we have phaseEndsIn
    if (phaseEndsIn !== null) {
      const defuseTime = hasKit ? 5.0 : 10.0;
      // In CS2 GSI, phase_ends_in for defuse is usually the time remaining on the defuse progress.
      // So progress % is (defuseTime - phaseEndsIn) / defuseTime
      if (phaseEndsIn <= defuseTime) {
        defuseProgress = Math.max(0, Math.min(100, ((defuseTime - phaseEndsIn) / defuseTime) * 100));
      } else {
        defuseProgress = null; // Indeterminate
      }
    }
  }

  return {
    status,
    countdown,
    defuserPlayer,
    defuseProgress,
    hasKit
  };
}
