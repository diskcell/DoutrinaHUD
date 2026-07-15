export interface AliveCount {
  ct: number;
  t: number;
}

export interface ClutchState {
  isClutch: boolean;
  clutchPlayer: any | null;
  side: 'CT' | 'T' | null;
  opponentCount: number;
}

/**
 * Counts alive players by side
 */
export function getAliveCountBySide(players: any[]): AliveCount {
  return players.reduce(
    (acc, p) => {
      const health = p.state?.health ?? 0;
      if (health > 0) {
        if (p.team === 'CT') acc.ct++;
        else if (p.team === 'T') acc.t++;
      }
      return acc;
    },
    { ct: 0, t: 0 }
  );
}

/**
 * Detects if a clutch situation is active
 * A clutch is 1vX where X >= 2
 */
export function getClutchState(players: any[]): ClutchState {
  const counts = getAliveCountBySide(players);
  
  const state: ClutchState = {
    isClutch: false,
    clutchPlayer: null,
    side: null,
    opponentCount: 0
  };

  if (counts.ct === 1 && counts.t >= 2) {
    state.isClutch = true;
    state.side = 'CT';
    state.clutchPlayer = players.find(p => p.team === 'CT' && (p.state?.health ?? 0) > 0);
    state.opponentCount = counts.t;
  } else if (counts.t === 1 && counts.ct >= 2) {
    state.isClutch = true;
    state.side = 'T';
    state.clutchPlayer = players.find(p => p.team === 'T' && (p.state?.health ?? 0) > 0);
    state.opponentCount = counts.ct;
  }

  return state;
}

/**
 * Returns the post-plant context string in Portuguese
 */
export function getPostPlantContext(bomb: any): 'RETOMADA' | 'PÓS-PLANT' | null {
  if (!bomb || bomb.state !== 'planted') return null;
  
  // From GSI: if bomb is planted, we are in post-plant.
  // Standard terminology:
  // RETOMADA (Retake) usually refers to CTs perspective
  // PÓS-PLANT refers to Ts perspective
  // For the HUD, we can show one based on who we might be focusing on, 
  // but typically "RETOMADA" is more common for the overall round state in PT-BR broadcasts.
  return 'RETOMADA'; 
}

/**
 * Checks if the round is in a state where we should show the indicator
 */
export function shouldShowIndicator(round: any, phase: any): boolean {
  if (!round || !phase) return false;
  
  const currentPhase = phase.phase;
  const roundPhase = round.phase;
  
  // Show only during live round
  // Not during freeze time, warmup, or round over
  if (currentPhase === 'warmup' || currentPhase === 'freezetime') return false;
  if (roundPhase === 'over') return false;
  
  return true;
}
