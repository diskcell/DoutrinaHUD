import { Vector3, parsePosition } from '../radar/parsePosition';

export type GrenadeType = 'smoke' | 'flash' | 'he' | 'molotov' | 'decoy';
export type GrenadeEntityKind = 'projectile' | 'effect' | 'unknown';

export interface GsiGrenade {
  id: string;
  type: GrenadeType;
  rawType: string;
  entityKind: GrenadeEntityKind;
  owner?: string;
  position: Vector3;
  velocity?: Vector3 | null;
  lifetime?: number | null;
  effecttime?: number | null;
  state?: string;
}

function normalizeGrenadeType(rawValue: unknown): GrenadeType {
  const raw = String(rawValue || '').toLowerCase();

  if (raw.includes('smoke')) return 'smoke';
  if (raw.includes('flash')) return 'flash';
  if (raw.includes('hegrenade') || raw === 'he' || raw.includes('frag')) return 'he';
  if (
    raw.includes('molotov') || 
    raw.includes('incgrenade') || 
    raw.includes('incendiary') || 
    raw.includes('inferno') || 
    raw.includes('fire')
  ) {
    return 'molotov';
  }
  if (raw.includes('decoy')) return 'decoy';

  return 'he';
}

function toNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeEntityKind(
  type: GrenadeType,
  rawValue: unknown,
  _stateValue: unknown,
  _effecttime: number | null
): GrenadeEntityKind {
  const raw = String(rawValue || '').toLowerCase();

  if (type !== 'molotov') {
    return 'projectile';
  }

  if (
    raw.includes('molotov') ||
    raw.includes('incgrenade') ||
    raw.includes('incendiary') ||
    raw.includes('inferno') ||
    raw.includes('fire')
  ) {
    return 'projectile';
  }

  return 'unknown';
}

export function parseGrenades(gsiData: any): GsiGrenade[] {
  const rawGrenades =
    gsiData?.grenades ||
    gsiData?.allgrenades ||
    gsiData?.allgrenades_map ||
    null;

  if (!rawGrenades || typeof rawGrenades !== 'object') {
    return [];
  }

  return Object.entries(rawGrenades)
    .map(([id, data]: [string, any]): GsiGrenade | null => {
      if (!data || typeof data !== 'object') return null;

      const position =
        parsePosition(data.position) ||
        parsePosition(data.pos) ||
        parsePosition(data.origin);

      if (!position) return null;

      const rawType =
        data.type ||
        data.name ||
        data.weapon ||
        data.classname ||
        id;
      const type = normalizeGrenadeType(rawType);
      const effecttime = toNumber(data.effecttime ?? data.effect_time);
      const lifetime = toNumber(data.lifetime ?? data.life_time);
      const state =
        data.state ||
        data.phase ||
        data.status ||
        data.grenade_state ||
        undefined;

      return {
        id: String(data.id || id),
        type,
        rawType: String(rawType || ''),
        entityKind: normalizeEntityKind(type, rawType, state, effecttime),
        owner: data.owner || data.owner_steamid || data.player || undefined,
        position,
        velocity:
          parsePosition(data.velocity) ||
          parsePosition(data.vel) ||
          parsePosition(data.v) ||
          null,
        lifetime,
        effecttime,
        state,
      };
    })
    .filter((grenade): grenade is GsiGrenade => grenade !== null);
}
