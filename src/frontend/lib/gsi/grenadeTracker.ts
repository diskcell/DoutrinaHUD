import { useState, useEffect, useRef } from 'react';
import { GsiGrenade, parseGrenades } from './parseGrenades';
import { worldToRadar, RadarCoord } from '../radar/worldToRadar';
import { MapConfig } from '../radar/loadMapConfig';

export interface GrenadeTrailPoint extends RadarCoord {
  timestamp: number;
}

export interface TrackedGrenade extends GsiGrenade {
  trail: GrenadeTrailPoint[];
  firstSeenAt: number;
  lastUpdate: number;
  lastSeenAt: number;
  deployedAt?: number;
  isDeployed: boolean;
  isExpired: boolean;
  fadeStartTime?: number;
  expireAt: number;
  hardExpireAt: number;
  radarPos: RadarCoord;
  lastRadarPos?: RadarCoord;
  effectKey: string;
  roundIdentity: string;
  renderKey: string;
  stableLowSpeedSince?: number;
  missingSinceAt?: number;
  fireEntitySeenAt?: number;
}

const TRAIL_MAX_POINTS = 26;
const TRAIL_MAX_AGE = 4200;

/*
 ============================================================
 DURAÇÕES VISUAIS NO RADAR
 ============================================================
 Importante:
 - HE e Flash são efeitos rápidos no radar.
 - Elas nunca devem ficar paradas como ícone.
 ============================================================
*/
const EFFECT_DURATION: Record<string, number> = {
  smoke: 18000,
  molotov: 6131,
  flash: 650,
  he: 650,
  decoy: 15000,
};

const HARD_MAX_LIFETIME: Record<string, number> = {
  smoke: 19500,
  molotov: 6700,
  flash: 2400,
  he: 2800,
  decoy: 17000,
};

const CLEANUP_EXTRA_TIME = 200;
const ROUND_RESET_SUPPRESS_TIME = 45000;
const MOLOTOV_CLUSTER_RADIUS = 7;
const MOLOTOV_CLUSTER_SUPPRESS_TIME = 25000;
const MOLOTOV_FORCE_REMOVE_AFTER = 6400;
const STALE_PAYLOAD_GRACE_TIME = 1200;
const DEPLOYED_MISSING_GRACE_TIME = 1200;
const PHASE_TIME_REWIND_THRESHOLD = 1.5;
const PHASE_TIME_SKIP_THRESHOLD = 3;
const MOLOTOV_MISSING_IMPACT_MIN_TRAVEL = 0.25;
const MOLOTOV_FIRE_ENTITY_END_GRACE = 250;
const MOLOTOV_SMOKE_EXTINGUISH_DISTANCE = 3;

const PROJECTILE_MAX_FLIGHT_TIME: Record<string, number> = {
  smoke: 3500,
  molotov: 2000,
  flash: 1400,
  he: 1900,
  decoy: 3500,
};

function isDebugEnabled() {
  if (typeof window === 'undefined') return false;
  return window.location.search.includes('debugGrenades=true');
}

function debugLog(...args: any[]) {
  if (isDebugEnabled()) {
    console.log('[GrenadeTracker]', ...args);
  }
}

function getSpeed(grenade: GsiGrenade) {
  const velocity = grenade.velocity;

  if (!velocity) return null;

  const vx = Number(velocity.x ?? 0);
  const vy = Number(velocity.y ?? 0);
  const vz = Number(velocity.z ?? 0);

  if (!Number.isFinite(vx) || !Number.isFinite(vy) || !Number.isFinite(vz)) {
    return null;
  }

  return Math.sqrt(vx * vx + vy * vy + vz * vz);
}

function normalizeGsiTimeToMs(value: number | null | undefined) {
  if (value === null || value === undefined) return null;

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) return null;

  return parsed > 1000 ? parsed : parsed * 1000;
}

function getEffectDuration(grenade: GsiGrenade | TrackedGrenade) {
  if (grenade.type === 'molotov' && isCtIncendiary(grenade)) {
    return 5500;
  }

  if (grenade.type === 'smoke') {
    return EFFECT_DURATION.smoke;
  }

  const fallback = EFFECT_DURATION[grenade.type] || 1200;

  /*
   Proteção:
   Em demo/replay, effecttime pode vir estranho.
   Então limitamos forte por tipo.
  */
  const fromGsi = normalizeGsiTimeToMs(grenade.effecttime);

  if (fromGsi !== null) {

    if (grenade.type === 'smoke') {
      return Math.min(Math.max(1000, fromGsi), 18000);
    }

    if (grenade.type === 'molotov') {
      return Math.min(Math.max(1000, fromGsi), EFFECT_DURATION.molotov);
    }

    if (grenade.type === 'decoy') {
      return Math.min(Math.max(1000, fromGsi), 15000);
    }

    if (grenade.type === 'he') {
      return Math.min(Math.max(400, fromGsi), 800);
    }

    if (grenade.type === 'flash') {
      return Math.min(Math.max(300, fromGsi), 700);
    }
  }

  return fallback;
}

function getHardMaxLifetime(grenade: GsiGrenade | TrackedGrenade) {
  if (grenade.type === 'he' || grenade.type === 'flash') return 2500;
  return HARD_MAX_LIFETIME[grenade.type] || 3000;
}

function isQuickEffect(grenade: GsiGrenade | TrackedGrenade) {
  return grenade.type === 'he' || grenade.type === 'flash';
}

function isTimedAirburst(grenade: GsiGrenade | TrackedGrenade) {
  return (
    grenade.type === 'he' ||
    grenade.type === 'flash'
  );
}

function getState(grenade: GsiGrenade) {
  return String(grenade.state || '').toLowerCase();
}

function getRawType(grenade: GsiGrenade) {
  return String(grenade.rawType || '').toLowerCase();
}

function isCtIncendiary(grenade: GsiGrenade | TrackedGrenade) {
  const rawType = String(grenade.rawType || '').toLowerCase();

  return rawType.includes('incgrenade') || rawType.includes('incendiary');
}

function isMolotovProjectileEntity(grenade: GsiGrenade | TrackedGrenade) {
  if (grenade.type !== 'molotov') return false;
  if (grenade.entityKind === 'projectile') return true;

  const rawType = String(grenade.rawType || '').toLowerCase();

  return (
    rawType.includes('molotov') ||
    rawType.includes('incgrenade') ||
    rawType.includes('incendiary')
  );
}

function isMolotovEffectEntity(grenade: GsiGrenade | TrackedGrenade) {
  return false;
}

function isRawMolotovFireEntity(grenade: GsiGrenade | TrackedGrenade) {
  if (grenade.type !== 'molotov') return false;

  const rawType = String(grenade.rawType || '').toLowerCase();

  return rawType.includes('inferno') || rawType.includes('fire');
}

function isStalePayloadGrenade(grenade: GsiGrenade) {
  const lifetimeMs = normalizeGsiTimeToMs(grenade.lifetime);
  const effectMs = normalizeGsiTimeToMs(grenade.effecttime);
  const maxLifetime = getHardMaxLifetime(grenade) + STALE_PAYLOAD_GRACE_TIME;
  const maxEffectTime = getEffectDuration(grenade) + STALE_PAYLOAD_GRACE_TIME;

  if (grenade.type === 'molotov') {
    return false;
  }

  if (lifetimeMs !== null && lifetimeMs > maxLifetime) {
    return true;
  }

  if (effectMs !== null && effectMs > maxEffectTime) {
    return true;
  }

  return false;
}

function hasExplicitEffectState(grenade: GsiGrenade) {
  const state = getState(grenade);

  return (
    state.includes('exploded') ||
    state.includes('detonated') ||
    state.includes('deployed') ||
    state.includes('active') ||
    state.includes('effect')
  );
}

function hasQuickFinalState(grenade: GsiGrenade) {
  const state = getState(grenade);

  return hasExplicitEffectState(grenade) || state.includes('expired');
}

function isActiveFireEntity(grenade: GsiGrenade) {
  return isMolotovEffectEntity(grenade);
}

function isStableLowSpeed(
  grenade: GsiGrenade,
  existing: TrackedGrenade | undefined,
  now: number
) {
  if (!existing) return false;

  const speed = getSpeed(grenade);
  const aliveTime = now - existing.firstSeenAt;

  if (speed !== null && speed < 12 && aliveTime > 500) {
    const stableSince = existing.stableLowSpeedSince || now;
    return now - stableSince > 600;
  }

  return false;
}

function shouldForceFinishProjectile(
  grenade: GsiGrenade,
  existing: TrackedGrenade | undefined,
  now: number
) {
  if (!existing || existing.isDeployed) return false;

  const aliveTime = now - existing.firstSeenAt;
  const maxFlightTime =
    PROJECTILE_MAX_FLIGHT_TIME[grenade.type] || getHardMaxLifetime(grenade);
  const speed = getSpeed(grenade);

  if (isTimedAirburst(grenade) && aliveTime > maxFlightTime) {
    debugLog(`ID ${grenade.id} (${grenade.type}) finishing via timed detonation`);
    return true;
  }

  if (grenade.type === 'molotov') {
    return false;
  }

  if (isStableLowSpeed(grenade, existing, now)) {
    debugLog(`ID ${grenade.id} (${grenade.type}) finishing via stable low speed`);
    return true;
  }

  if (aliveTime > maxFlightTime && (speed === null || speed < 120)) {
    debugLog(`ID ${grenade.id} (${grenade.type}) finishing via flight timeout`);
    return true;
  }

  return false;
}

function shouldMolotovBecomeDeployed(
  grenade: GsiGrenade
) {
  return false;
}

function shouldBecomeDeployed(
  grenade: GsiGrenade,
  existing?: TrackedGrenade,
  radarPos?: RadarCoord
) {
  const state = String(grenade.state || '').toLowerCase();
  const now = Date.now();

  if (grenade.type === 'molotov') {
    return shouldMolotovBecomeDeployed(grenade);
  }

  if (shouldForceFinishProjectile(grenade, existing, now)) {
    return true;
  }

  if (
    isActiveFireEntity(grenade) ||
    state.includes('exploded') ||
    state.includes('expired') ||
    state.includes('landed') ||
    state.includes('detonated') ||
    state.includes('deployed') ||
    state.includes('active') ||
    state.includes('effect')
  ) {
    debugLog(
      `ID ${grenade.id} (${grenade.type}) deploying via state: ${state}`
    );
    return true;
  }

  if (grenade.effecttime && grenade.effecttime > 0) {
    /* 
       Apenas se não estiver em alta velocidade (para evitar falso positivo em molotov voando 
       se o GSI mandar effecttime > 0 cedo).
    */
    const speed = getSpeed(grenade);
    if (speed !== null && speed < 800) {
      debugLog(
        `ID ${grenade.id} (${grenade.type}) deploying via effecttime: ${grenade.effecttime}`
      );
      return true;
    }
  }

  /*
   ============================================================
   HE / FLASH
   ============================================================
   NÃO USAR tempo fixo (280ms).
   Devem explodir apenas via state, effecttime ou desaparecimento do GSI.
  */

  /*
   ============================================================
   SMOKE / MOLOTOV / DECOY — Detecção por velocidade baixa estável
   ============================================================
  */
  if (!isQuickEffect(grenade) && existing) {
    const speed = getSpeed(grenade);
    const aliveTime = now - existing.firstSeenAt;

    // Precisa existir há pelo menos 500ms para evitar detectar o spawn como parado
    if (speed !== null && speed < 12 && aliveTime > 500) {
      const stableSince = existing.stableLowSpeedSince || now;
      const stableDuration = now - stableSince;

      if (stableDuration > 600) {
        debugLog(
          `ID ${grenade.id} (${grenade.type}) deploying via stable low speed`
        );
        return true;
      }
    }
  }

  return false;
}

function getRoundIdentity(gsiData: any) {
  const mapName = gsiData?.map?.name || 'unknown_map';
  const round = gsiData?.map?.round ?? 0;
  const matchId = gsiData?.map?.match_id || '';
  const ctScore =
    gsiData?.map?.team_ct?.score ?? gsiData?.map?.team_ct_score ?? '';
  const tScore =
    gsiData?.map?.team_t?.score ?? gsiData?.map?.team_t_score ?? '';

  return `${mapName}:${matchId}:${round}:${ctScore}:${tScore}`;
}

function getCurrentPhaseTime(gsiData: any) {
  const rawValue =
    gsiData?.phase_countdowns?.phase_time_remaining ??
    gsiData?.phase_countdowns?.phase_ends_in;
  const parsed = Number(rawValue);

  return Number.isFinite(parsed) ? parsed : null;
}

function getCountdownPhase(gsiData: any) {
  return String(gsiData?.phase_countdowns?.phase || '').toLowerCase();
}

function isRoundTransitionPhase(gsiData: any) {
  const phase = getCountdownPhase(gsiData);
  const roundPhase = String(gsiData?.round?.phase || '').toLowerCase();

  return (
    phase === 'freezetime' ||
    phase === 'warmup' ||
    phase === 'over' ||
    phase === 'intermission' ||
    roundPhase === 'freezetime' ||
    roundPhase === 'over' ||
    roundPhase === 'intermission'
  );
}

function hasDemoTimeJump(
  previousPhaseTime: number | null,
  currentPhaseTime: number | null,
  previousPhase: string | null,
  currentPhase: string,
  previousWallTime: number,
  now: number
) {
  if (
    previousPhaseTime === null ||
    currentPhaseTime === null ||
    !previousPhase ||
    previousPhase !== currentPhase ||
    previousWallTime <= 0
  ) {
    return false;
  }

  const wallDeltaSeconds = Math.max(0, (now - previousWallTime) / 1000);
  const phaseDeltaSeconds = previousPhaseTime - currentPhaseTime;

  if (currentPhaseTime > previousPhaseTime + PHASE_TIME_REWIND_THRESHOLD) {
    return true;
  }

  return phaseDeltaSeconds > wallDeltaSeconds + PHASE_TIME_SKIP_THRESHOLD;
}

function shouldClearBecauseRoundEnded(gsiData: any) {
  const roundPhase = String(gsiData?.round?.phase || '').toLowerCase();
  const countdownPhase = String(
    gsiData?.phase_countdowns?.phase || ''
  ).toLowerCase();
  const mapPhase = String(gsiData?.map?.phase || '').toLowerCase();
  const roundBomb = String(gsiData?.round?.bomb || '').toLowerCase();
  const bombState = String(gsiData?.bomb?.state || '').toLowerCase();

  /*
   No modo demo/replay, o freezetime ou warmup são os melhores momentos 
   para garantir que o radar esteja limpo.
  */
  return (
    roundPhase === 'over' ||
    roundPhase === 'intermission' ||
    countdownPhase === 'over' ||
    countdownPhase === 'intermission' ||
    mapPhase === 'warmup' ||
    mapPhase === 'gameover' ||
    mapPhase === 'intermission' ||
    roundBomb === 'exploded' ||
    roundBomb === 'defused' ||
    bombState === 'exploded' ||
    bombState === 'defused'
  );
}

function createEffectKey(grenade: GsiGrenade, radarPos: RadarCoord) {
  const owner = grenade.owner || 'unknown';

  /*
   Posição arredondada para bloquear recriação visual no mesmo local,
   especialmente em demo/replay.
  */
  const roundedX = Math.round(radarPos.x * 2) / 2;
  const roundedY = Math.round(radarPos.y * 2) / 2;

  return `${grenade.type}:${owner}:${roundedX}:${roundedY}`;
}

function createRenderKey(
  grenade: GsiGrenade,
  roundIdentity: string,
  firstSeenAt: number
) {
  return `${roundIdentity}:${grenade.id}:${firstSeenAt}`;
}

function getRadarDistance(a: RadarCoord, b: RadarCoord) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function getOwnerKey(grenade: GsiGrenade | TrackedGrenade) {
  return String(grenade.owner || 'unknown');
}

function hasNearbyDeployedMolotov(
  trackedGrenades: Map<string, TrackedGrenade>,
  radarPos: RadarCoord
) {
  for (const tracked of trackedGrenades.values()) {
    if (
      tracked.type === 'molotov' &&
      tracked.isDeployed &&
      getRadarDistance(tracked.radarPos, radarPos) <= MOLOTOV_CLUSTER_RADIUS
    ) {
      return true;
    }
  }

  return false;
}

function hasNearbyMolotovFirePayload(
  radarPos: RadarCoord,
  firePositions: RadarCoord[]
) {
  return firePositions.some((firePos) => {
    return getRadarDistance(radarPos, firePos) <= MOLOTOV_CLUSTER_RADIUS;
  });
}

function removeNearbyMolotovProjectiles(
  trackedGrenades: Map<string, TrackedGrenade>,
  radarPos: RadarCoord
) {
  trackedGrenades.forEach((tracked, id) => {
    if (
      tracked.type === 'molotov' &&
      !tracked.isDeployed &&
      getRadarDistance(tracked.radarPos, radarPos) <= MOLOTOV_CLUSTER_RADIUS
    ) {
      trackedGrenades.delete(id);
    }
  });
}

function getMolotovTravelDistance(tracked: TrackedGrenade) {
  const firstTrailPoint = tracked.trail[0];

  if (!firstTrailPoint) {
    return 0;
  }

  return getRadarDistance(firstTrailPoint, tracked.radarPos);
}

function shouldDeployMolotovAtLastKnownPosition(tracked: TrackedGrenade) {
  return (
    tracked.type === 'molotov' &&
    !tracked.isDeployed &&
    tracked.trail.length >= 2 &&
    getMolotovTravelDistance(tracked) >= MOLOTOV_MISSING_IMPACT_MIN_TRAVEL
  );
}

function isMolotovExtinguishedBySmoke(
  molotov: TrackedGrenade,
  trackedGrenades: Map<string, TrackedGrenade>
) {
  if (molotov.type !== 'molotov' || !molotov.isDeployed) {
    return false;
  }

  for (const smoke of trackedGrenades.values()) {
    if (
      smoke.type === 'smoke' &&
      smoke.isDeployed &&
      smoke.roundIdentity === molotov.roundIdentity &&
      getRadarDistance(smoke.radarPos, molotov.radarPos) <=
        MOLOTOV_SMOKE_EXTINGUISH_DISTANCE
    ) {
      return true;
    }
  }

  return false;
}

function findRelatedMolotovProjectile(
  trackedGrenades: Map<string, TrackedGrenade>,
  grenade: GsiGrenade,
  now: number
) {
  const owner = getOwnerKey(grenade);
  let fallback: TrackedGrenade | null = null;

  for (const tracked of trackedGrenades.values()) {
    if (
      tracked.type !== 'molotov' ||
      tracked.isDeployed ||
      now - tracked.lastUpdate > 1800
    ) {
      continue;
    }

    if (owner !== 'unknown' && getOwnerKey(tracked) === owner) {
      return tracked;
    }

    fallback = fallback || tracked;
  }

  return fallback;
}

function correctMolotovEffectRadarPos(
  radarPos: RadarCoord,
  effectGrenade: GsiGrenade,
  trackedGrenades: Map<string, TrackedGrenade>,
  now: number
) {
  const projectile = findRelatedMolotovProjectile(trackedGrenades, effectGrenade, now);
  const firstTrailPoint = projectile?.trail[0];

  if (!projectile || !firstTrailPoint) {
    return radarPos;
  }

  const projectileTravel = getMolotovTravelDistance(projectile);
  const effectToStart = getRadarDistance(radarPos, firstTrailPoint);
  const effectToProjectile = getRadarDistance(radarPos, projectile.radarPos);

  if (
    projectileTravel > 0.8 &&
    effectToStart < 0.75 &&
    effectToProjectile > 0.8
  ) {
    debugLog(
      `ID ${effectGrenade.id} (${effectGrenade.type}) correcting stale fire position to projectile impact`
    );
    return projectile.radarPos;
  }

  return radarPos;
}

function deployGrenade(tracked: TrackedGrenade, now: number): TrackedGrenade {
  const duration = getEffectDuration(tracked);

  return {
    ...tracked,
    isDeployed: true,
    isExpired: false,
    deployedAt: tracked.deployedAt || now,
    fadeStartTime: tracked.fadeStartTime || now,
    expireAt: now + duration,
    hardExpireAt: now + getHardMaxLifetime(tracked),
    // Congela a posição no radar para que o fogo/smoke não voe
    radarPos: tracked.radarPos,
    // Garante que a trilha pare de crescer
    trail: tracked.trail,
  };
}

function shouldRemoveTracked(tracked: TrackedGrenade, now: number) {
  if (tracked.isExpired) {
    return true;
  }

  if (!tracked.isDeployed) {
    const maxFlightTime =
      PROJECTILE_MAX_FLIGHT_TIME[tracked.type] || getHardMaxLifetime(tracked);

    if (now - tracked.firstSeenAt > maxFlightTime + 1200) {
      return true;
    }
  }

  if (tracked.type === 'smoke' && tracked.isDeployed) {
    return false;
  }

  if (
    tracked.type === 'molotov' &&
    tracked.isDeployed &&
    tracked.deployedAt &&
    now - tracked.deployedAt > MOLOTOV_FORCE_REMOVE_AFTER
  ) {
    return true;
  }

  /*
   PROTEÇÃO AGRESSIVA CONTRA ÍCONES TRAVADOS (Especialmente em Demos)
   Se a granada não recebe dados do GSI há mais de 1 segundo:
   - Se for HE/Flash: remove na hora (não queremos ícone parado).
   - Se for Molotov/Smoke em voo: remove na hora.
   - Se for Molotov/Smoke já ativa no chão: deixamos o expireAt cuidar, 
     A MENOS que o tempo sem GSI seja muito alto (2.5s).
  */
  const timeSinceUpdate = now - tracked.lastUpdate;
  if (timeSinceUpdate > 1000) {
    if (!tracked.isDeployed) {
      if (tracked.type === 'molotov') {
        return now - tracked.firstSeenAt > PROJECTILE_MAX_FLIGHT_TIME.molotov + 1800;
      }

      return true;
    }
  }

  if (now > tracked.expireAt + CLEANUP_EXTRA_TIME) {
    return true;
  }

  if (now > tracked.hardExpireAt) {
    return true;
  }

  return false;
}

export function useGrenadeTracker(
  gsiData: any,
  mapConfig: MapConfig | null
): TrackedGrenade[] {
  const [trackedGrenades, setTrackedGrenades] = useState<
    Map<string, TrackedGrenade>
  >(new Map<string, TrackedGrenade>());

  const trackedRef = useRef<Map<string, TrackedGrenade>>(
    new Map<string, TrackedGrenade>()
  );

  /*
   IDs já removidos não podem reaparecer enquanto o GSI continuar mandando.
  */
  const suppressedIdsRef = useRef<Set<string>>(new Set());

  /*
   Bloqueio por assinatura visual.
   Resolve casos em que demo/replay recria HE/Flash/Molotov com ID diferente.
  */
  const suppressedEffectKeysRef = useRef<Map<string, number>>(
    new Map<string, number>()
  );
  const suppressedMolotovZonesRef = useRef<
    Map<string, { radarPos: RadarCoord; until: number }>
  >(new Map<string, { radarPos: RadarCoord; until: number }>());

  const lastRoundIdentityRef = useRef<string | null>(null);
  const resetCooldownUntilRef = useRef(0);

  /* 
   Para demos/replays: Detectar saltos no tempo ou round.
  */
  const lastPhaseTimeRef = useRef<number | null>(null);
  const lastPhaseWallTimeRef = useRef(0);
  const lastCountdownPhaseRef = useRef<string | null>(null);

  function clearAllGrenades() {
    debugLog('FORCE CLEAR: Round change, jump or transition.');
    trackedRef.current = new Map<string, TrackedGrenade>();
    suppressedIdsRef.current = new Set();
    suppressedEffectKeysRef.current = new Map<string, number>();
    suppressedMolotovZonesRef.current = new Map<
      string,
      { radarPos: RadarCoord; until: number }
    >();
    setTrackedGrenades(new Map<string, TrackedGrenade>());
  }

  function suppressTracked(tracked: TrackedGrenade, now: number) {
    if (tracked.type === 'smoke') {
      return;
    }

    if (tracked.type === 'molotov' && !tracked.isDeployed) {
      return;
    }

    suppressedIdsRef.current.add(tracked.id);

    const suppressTime =
      tracked.type === 'he' || tracked.type === 'flash'
        ? 3000
        : tracked.type === 'molotov'
          ? 25000
          : getHardMaxLifetime(tracked);

    suppressedEffectKeysRef.current.set(tracked.effectKey, now + suppressTime);

    if (tracked.type === 'molotov') {
      suppressedMolotovZonesRef.current.set(tracked.effectKey, {
        radarPos: tracked.radarPos,
        until: now + MOLOTOV_CLUSTER_SUPPRESS_TIME,
      });
    }

  }

  function isNearSuppressedMolotovZone(radarPos: RadarCoord, now: number) {
    for (const [key, zone] of suppressedMolotovZonesRef.current.entries()) {
      if (now > zone.until) {
        suppressedMolotovZonesRef.current.delete(key);
        continue;
      }

      if (getRadarDistance(zone.radarPos, radarPos) <= MOLOTOV_CLUSTER_RADIUS) {
        return true;
      }
    }

    return false;
  }

  function suppressParsedGrenades(
    grenades: GsiGrenade[],
    mapConfig: MapConfig,
    now: number,
    duration: number
  ) {
    grenades.forEach((grenade) => {
      if (grenade.type === 'smoke' || grenade.type === 'molotov') {
        return;
      }

      suppressedIdsRef.current.add(grenade.id);
      const radarPos = worldToRadar(grenade.position, mapConfig);
      suppressedEffectKeysRef.current.set(
        createEffectKey(grenade, radarPos),
        now + duration
      );
    });
  }

  /*
   LIMPEZA PERIÓDICA (Independente do GSI)
  */
  useEffect(() => {
    const interval = window.setInterval(() => {
      const now = Date.now();

      // Cleanup suppression
      suppressedEffectKeysRef.current.forEach((until, key) => {
        if (now > until) suppressedEffectKeysRef.current.delete(key);
      });
      suppressedMolotovZonesRef.current.forEach((zone, key) => {
        if (now > zone.until) suppressedMolotovZonesRef.current.delete(key);
      });

      const currentMap = trackedRef.current;
      if (currentMap.size === 0) return;

      const next = new Map<string, TrackedGrenade>(currentMap);
      let changed = false;

      next.forEach((tracked, id) => {
        if (
          !tracked.isDeployed &&
          shouldForceFinishProjectile(tracked, tracked, now)
        ) {
          next.set(id, deployGrenade(tracked, now));
          changed = true;
          return;
        }

        if (shouldRemoveTracked(tracked, now)) {
          next.delete(id);
          suppressTracked(tracked, now);
          changed = true;
        }
      });

      if (changed) {
        trackedRef.current = next;
        setTrackedGrenades(new Map<string, TrackedGrenade>(next));
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!gsiData || !mapConfig) return;

    const now = Date.now();
    const roundIdentity = getRoundIdentity(gsiData);
    const currentPhaseTime = getCurrentPhaseTime(gsiData);
    const currentPhase = getCountdownPhase(gsiData);

    /*
     DETECÇÃO DE SALTO EM DEMO
    */
    const roundChanged = lastRoundIdentityRef.current !== null && lastRoundIdentityRef.current !== roundIdentity;
    const isRoundEnd = shouldClearBecauseRoundEnded(gsiData);
    const isRoundTransition = isRoundTransitionPhase(gsiData);
    const phaseTimeJumped = hasDemoTimeJump(
      lastPhaseTimeRef.current,
      currentPhaseTime,
      lastCountdownPhaseRef.current,
      currentPhase,
      lastPhaseWallTimeRef.current,
      now
    );

    const parsedGrenades = parseGrenades(gsiData);
    const hasGrenadesInPayload = parsedGrenades.length > 0;

    if (
      isRoundEnd ||
      (roundChanged && isRoundTransition && !hasGrenadesInPayload)
    ) {
      const parsedDuringReset = parsedGrenades;
      clearAllGrenades();
      suppressParsedGrenades(
        parsedDuringReset,
        mapConfig,
        now,
        ROUND_RESET_SUPPRESS_TIME
      );
      resetCooldownUntilRef.current = now + 1500;
      lastRoundIdentityRef.current = roundIdentity;
      lastPhaseTimeRef.current = currentPhaseTime;
      lastCountdownPhaseRef.current = currentPhase;
      lastPhaseWallTimeRef.current = now;
      return;
    }

    if (roundChanged || phaseTimeJumped) {
      clearAllGrenades();
      resetCooldownUntilRef.current = 0;
    }

    lastRoundIdentityRef.current = roundIdentity;
    lastPhaseTimeRef.current = currentPhaseTime;
    lastCountdownPhaseRef.current = currentPhase;
    lastPhaseWallTimeRef.current = now;

    if (now < resetCooldownUntilRef.current) return;

    const nextTracked = new Map<string, TrackedGrenade>(trackedRef.current);
    const seenIdsInPayload = new Set<string>();
    const molotovFirePositions = parsedGrenades
      .filter(isRawMolotovFireEntity)
      .map((grenade) => worldToRadar(grenade.position, mapConfig));

    /*
     Lógica de ID Bloqueado
    */
    const rawIdsInPayload = new Set(parsedGrenades.map(g => g.id));
    suppressedIdsRef.current.forEach(id => {
      if (!rawIdsInPayload.has(id)) suppressedIdsRef.current.delete(id);
    });

    parsedGrenades.forEach((grenade) => {
      let radarPos = worldToRadar(grenade.position, mapConfig);
      const isMolotovEffect = isMolotovEffectEntity(grenade);

      if (isMolotovEffect) {
        return;
      }

      const effectKey = createEffectKey(grenade, radarPos);

      if (suppressedIdsRef.current.has(grenade.id) && !isMolotovEffect) return;
      
      const suppressUntil = suppressedEffectKeysRef.current.get(effectKey);
      if (suppressUntil && now < suppressUntil && !isMolotovEffect) return;

      let existing = nextTracked.get(grenade.id);

      if (existing && existing.roundIdentity !== roundIdentity) {
        nextTracked.delete(grenade.id);
        existing = undefined;
      }

      if (isStalePayloadGrenade(grenade)) {
        if (existing) {
          nextTracked.delete(grenade.id);
          if (grenade.type !== 'smoke') {
            suppressTracked(existing, now);
          }
        } else if (grenade.type !== 'smoke') {
          suppressedIdsRef.current.add(grenade.id);
          suppressedEffectKeysRef.current.set(
            effectKey,
            now + ROUND_RESET_SUPPRESS_TIME
          );
        }

        return;
      }

      if (existing && shouldRemoveTracked(existing, now)) {
        nextTracked.delete(grenade.id);
        suppressTracked(existing, now);
        return;
      }

      if (grenade.type === 'molotov' && !existing) {
        // Trajectory first: never let a stale fire marker block a real molotov projectile.
      }

      seenIdsInPayload.add(grenade.id);

      const shouldDeploy = shouldBecomeDeployed(grenade, existing, radarPos);

      if (existing) {
        const nextIsDeployed = existing.isDeployed || shouldDeploy;
        const isDeployingNow = nextIsDeployed && !existing.isDeployed;
        
        // Se a granada já é um efeito mas a posição GSI mudou drasticamente (mais de 15% radar),
        // em Demos isso pode ser um ID reciclado. Removemos o antigo.
        const newTrail = existing.isDeployed ? existing.trail : [...existing.trail, { ...radarPos, timestamp: now }];
        const trimmedTrail = newTrail.filter(p => now - p.timestamp < TRAIL_MAX_AGE).slice(-TRAIL_MAX_POINTS);

        const speed = getSpeed(grenade);
        let stableLowSpeedSince = (speed !== null && speed < 12) ? (existing.stableLowSpeedSince || now) : undefined;

        let updated: TrackedGrenade = {
          ...existing,
          ...grenade,
          trail: trimmedTrail,
          lastUpdate: now,
          lastSeenAt: now,
          radarPos: existing.isDeployed ? existing.radarPos : radarPos,
          lastRadarPos: existing.radarPos,
          effectKey: existing.isDeployed ? existing.effectKey : effectKey,
          roundIdentity,
          renderKey: existing.renderKey,
          isDeployed: nextIsDeployed,
          isExpired: false,
          stableLowSpeedSince,
          missingSinceAt: undefined,
        };

        if (isDeployingNow) {
          updated = deployGrenade(updated, now);
        }

        nextTracked.set(grenade.id, updated);
      } else {
        // Nova granada detectada
        let created: TrackedGrenade = {
          ...grenade,
          trail: [{ ...radarPos, timestamp: now }],
          firstSeenAt: now,
          lastUpdate: now,
          lastSeenAt: now,
          isDeployed: shouldDeploy,
          isExpired: false,
          expireAt: now + getHardMaxLifetime(grenade),
          hardExpireAt: now + getHardMaxLifetime(grenade),
          radarPos,
          effectKey,
          roundIdentity,
          renderKey: createRenderKey(grenade, roundIdentity, now),
        };

        if (shouldDeploy) {
          created = deployGrenade(created, now);
        }

        nextTracked.set(grenade.id, created);
      }
    });

    /*
     GESTÃO DE ENTIDADES QUE SUMIRAM DO PAYLOAD
    */
    nextTracked.forEach((tracked, id) => {
      if (!seenIdsInPayload.has(id)) {
        if (tracked.isDeployed) {
          if (tracked.type === 'molotov') {
            const hasLiveFirePayload = hasNearbyMolotovFirePayload(
              tracked.radarPos,
              molotovFirePositions
            );

            if (hasLiveFirePayload) {
              nextTracked.set(id, {
                ...tracked,
                fireEntitySeenAt: now,
                missingSinceAt: undefined,
              });
              return;
            }

            if (
              tracked.fireEntitySeenAt &&
              now - tracked.fireEntitySeenAt > MOLOTOV_FIRE_ENTITY_END_GRACE
            ) {
              nextTracked.delete(id);
              return;
            }

            nextTracked.set(id, {
              ...tracked,
              missingSinceAt: tracked.missingSinceAt || now,
            });
            return;
          }

          const missingSinceAt = tracked.missingSinceAt || now;

          if (now - missingSinceAt > DEPLOYED_MISSING_GRACE_TIME) {
            nextTracked.delete(id);
            suppressTracked(tracked, now);
          } else {
            nextTracked.set(id, {
              ...tracked,
              missingSinceAt,
            });
          }

          return;
        }

        // Se era um projétil e sumiu, ele "detonou" ou foi cancelado.
        if (!tracked.isDeployed) {
          // Em Demos, sumir do nada sem 'exploded' state é comum. Forçamos o fim.
          if (
            tracked.type === 'he' ||
            tracked.type === 'flash'
          ) {
            nextTracked.set(id, deployGrenade(tracked, now));
          } else if (tracked.type === 'molotov') {
            if (shouldDeployMolotovAtLastKnownPosition(tracked)) {
              nextTracked.set(id, deployGrenade(tracked, now));
            } else {
              nextTracked.delete(id);
            }
          } else {
            // Smoke/Molotov que sumiram sem deploy: removemos.
            nextTracked.delete(id);
          }
        }
      }
    });

    nextTracked.forEach((tracked, id) => {
      if (tracked.roundIdentity !== roundIdentity) {
        nextTracked.delete(id);
      }
    });

    nextTracked.forEach((tracked, id) => {
      if (isMolotovExtinguishedBySmoke(tracked, nextTracked)) {
        nextTracked.delete(id);
      }
    });

    // Final Sync
    trackedRef.current = nextTracked;
    setTrackedGrenades(new Map<string, TrackedGrenade>(nextTracked));
  }, [gsiData, mapConfig]);

  return Array.from(trackedGrenades.values()).filter((grenade) => {
    return grenade.roundIdentity === lastRoundIdentityRef.current;
  });
}
