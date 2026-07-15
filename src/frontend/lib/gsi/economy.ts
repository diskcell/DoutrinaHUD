export interface UtilityCounts {
  flashbang: number;
  smokegrenade: number;
  hegrenade: number;
  molotov: number; // Combined molotov and incgrenade
  decoy: number;
  total: number;
}

export function getTeamMoney(players: any[]): number {
  return players.reduce((sum, p) => sum + (p.state?.money || 0), 0);
}

export function getTeamEquipmentValue(players: any[]): number {
  return players.reduce((sum, p) => {
    const val = p.state?.equip_value ?? p.state?.equipment_value ?? 0;
    return sum + val;
  }, 0);
}

export function getUtilityCounts(players: any[]): UtilityCounts {
  const counts: UtilityCounts = {
    flashbang: 0,
    smokegrenade: 0,
    hegrenade: 0,
    molotov: 0,
    decoy: 0,
    total: 0
  };

  players.forEach(p => {
    if (!p.weapons) return;
    const weapons = Object.values<any>(p.weapons);
    weapons.forEach(w => {
      if (w.type !== 'Grenade') return;
      
      const name = w.name.replace('weapon_', '');
      if (name === 'flashbang') counts.flashbang++;
      else if (name === 'smokegrenade') counts.smokegrenade++;
      else if (name === 'hegrenade') counts.hegrenade++;
      else if (name === 'molotov' || name === 'incgrenade') counts.molotov++;
      else if (name === 'decoy') counts.decoy++;
      
      counts.total++;
    });
  });

  return counts;
}

export function getUtilityLevelLabel(totalGrenades: number): string {
  if (totalGrenades <= 3) return 'Baixo';
  if (totalGrenades <= 7) return 'Médio';
  return 'Ótimo';
}

export function getLossBonusValue(consecutiveLosses: number | undefined): string {
  if (consecutiveLosses === undefined) return '--';
  const streak = Math.min(Math.max(consecutiveLosses, 0), 4);
  const values = ['$1400', '$1900', '$2400', '$2900', '$3400'];
  return values[streak];
}

export function shouldShowEconomyPanel(phaseCountdowns: any, round: any): boolean {
  if (!phaseCountdowns && !round) return false;

  const phase = phaseCountdowns?.phase;
  const roundPhase = round?.phase;

  const isFreezeTime = phase === 'freezetime' || roundPhase === 'freeze';
  const isWarmup = phase === 'warmup';
  const isTimeout = phase?.includes('timeout') || phase === 'paused';
  
  return isFreezeTime || isWarmup || isTimeout;
}
