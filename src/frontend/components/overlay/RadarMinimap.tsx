import { useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { cn } from '../AdminLayout';
import { resolveMapAssets } from '../../lib/radar/mapAssetResolver';
import { MapConfig } from '../../lib/radar/loadMapConfig';
import { parsePosition } from '../../lib/radar/parsePosition';
import { worldToRadar } from '../../lib/radar/worldToRadar';
import { getPlayerRotation } from '../../lib/radar/getPlayerRotation';
import { useGrenadeTracker, TrackedGrenade } from '../../lib/gsi/grenadeTracker';
import { RadarPlayerIcon } from './RadarPlayerIcon';
import { RadarBombIcon } from './RadarBombIcon';
import { RadarGrenadeLayer } from './RadarGrenadeLayer';
import { RadarGrenadeIcon } from './RadarGrenadeIcon';

interface RadarMinimapProps {
  mapName: string;
  players: any;
  observedSteamId?: string | null;
  bomb?: any;
  gsiState?: any;
  className?: string;
}

interface RadarEntityLayerProps {
  players: any[];
  grenades: TrackedGrenade[];
  allPlayers: any[];
  bombData: any;
  observedSteamId?: string | null;
  sampleReceivedAt?: string | null;
  compact?: boolean;
}

function getBombState(bomb: any) {
  return String(bomb?.state || '').toLowerCase();
}

function isPlayerCarryingBomb(player: any) {
  if (!player?.weapons) return false;

  return Object.values(player.weapons as Record<string, any>).some((weapon) => {
    const name = String(weapon?.name || '').toLowerCase();
    const type = String(weapon?.type || '').toLowerCase();

    return name === 'weapon_c4' || name === 'c4' || type === 'c4';
  });
}

function isLowerLevel(position: unknown, config: MapConfig) {
  const pos = parsePosition(position);
  const lowerSection = config.verticalsections?.lower;

  if (!pos || !lowerSection || !Number.isFinite(pos.z)) return false;
  return pos.z <= lowerSection.AltitudeMax && pos.z >= lowerSection.AltitudeMin;
}

function RadarEntityLayer({
  players,
  grenades,
  allPlayers,
  bombData,
  observedSteamId,
  sampleReceivedAt,
  compact = false,
}: RadarEntityLayerProps) {
  return (
    <>
      <RadarGrenadeLayer grenades={grenades} />

      <AnimatePresence>
        {grenades.map((grenade) => (
          <RadarGrenadeIcon
            key={grenade.renderKey}
            grenade={grenade}
            players={allPlayers}
            grenades={grenades}
          />
        ))}
      </AnimatePresence>

      {bombData && (
        <RadarBombIcon
          x={bombData.radarPos.x}
          y={bombData.radarPos.y}
          state={bombData.state}
          sampleReceivedAt={sampleReceivedAt}
          compact={compact}
        />
      )}

      {players.map((player: any) => (
        <RadarPlayerIcon
          key={`${player.steamid}:${player.radarLevel}`}
          player={player}
          x={player.radarPos.x}
          y={player.radarPos.y}
          rotation={player.orientation}
          isObserved={observedSteamId === player.steamid}
          hasBomb={player.hasBomb}
          sampleReceivedAt={sampleReceivedAt}
          compact={compact}
        />
      ))}
    </>
  );
}

export function RadarMinimap({
  mapName,
  players,
  observedSteamId,
  bomb,
  gsiState,
  className,
}: RadarMinimapProps) {
  const playersArray = Array.isArray(players) ? players : Object.values(players || {});
  const assets = useMemo(() => resolveMapAssets(mapName), [mapName]);
  const trackedGrenades = useGrenadeTracker(gsiState, assets?.config || null);

  const hasLowerLevel = Boolean(
    assets?.config.map === 'de_nuke' &&
    assets.lowerImage &&
    assets.config.verticalsections?.lower,
  );

  const bombData = useMemo(() => {
    const bombState = getBombState(bomb);

    if (
      !bomb ||
      !bomb.position ||
      !assets ||
      (bombState !== 'planted' && bombState !== 'dropped')
    ) {
      return null;
    }

    const pos = parsePosition(bomb.position);
    if (!pos) return null;

    return {
      state: bombState as 'planted' | 'dropped',
      radarPos: worldToRadar(pos, assets.config),
      radarLevel: hasLowerLevel && isLowerLevel(pos, assets.config) ? 'lower' : 'default',
    };
  }, [bomb, assets, hasLowerLevel]);

  if (!assets) {
    return (
      <div className="absolute top-8 left-8 w-[400px] h-[400px] bg-neutral-950/80 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center text-center p-6 z-40">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
          {mapName ? 'Config do radar ausente' : 'Radar indisponível'}
        </span>
      </div>
    );
  }

  const playersList = playersArray.map((player: any) => {
    const pos = parsePosition(player.position);
    if (!pos) return null;

    let orientation = getPlayerRotation(player);
    if (assets.config.rotate) orientation += assets.config.rotate;

    return {
      ...player,
      radarPos: worldToRadar(pos, assets.config),
      radarLevel: hasLowerLevel && isLowerLevel(pos, assets.config) ? 'lower' : 'default',
      orientation,
      hasBomb: isPlayerCarryingBomb(player),
    };
  }).filter(Boolean) as any[];

  const upperPlayers = playersList.filter((player) => player.radarLevel !== 'lower');
  const lowerPlayers = playersList.filter((player) => player.radarLevel === 'lower');
  const upperGrenades = trackedGrenades.filter(
    (grenade) => !hasLowerLevel || !isLowerLevel(grenade.position, assets.config),
  );
  const lowerGrenades = hasLowerLevel
    ? trackedGrenades.filter((grenade) => isLowerLevel(grenade.position, assets.config))
    : [];
  const upperBomb = bombData?.radarLevel === 'lower' ? null : bombData;
  const lowerBomb = bombData?.radarLevel === 'lower' ? bombData : null;

  return (
    <div className={cn('absolute top-8 left-8 w-[400px] h-[400px] z-40', className)}>
      <div className="relative w-full h-full overflow-hidden shadow-sm">
        <img
          src={assets.image}
          alt="Radar principal"
          className="absolute inset-0 z-0 h-full w-full select-none object-fill opacity-100 pointer-events-none"
          onError={(event) => {
            event.currentTarget.style.display = 'none';
          }}
        />

        <div className="absolute inset-0 z-10">
          <RadarEntityLayer
            players={upperPlayers}
            grenades={upperGrenades}
            allPlayers={playersArray}
            bombData={upperBomb}
            observedSteamId={observedSteamId}
            sampleReceivedAt={gsiState?.received_at}
          />
        </div>

        {hasLowerLevel && assets.lowerImage && (
          <div className="absolute -top-[4%] left-[1%] z-20 h-[53%] w-[53%]">
            <img
              src={assets.lowerImage}
              alt="Radar do subsolo"
              className="absolute inset-0 h-full w-full select-none object-fill opacity-75 brightness-75 saturate-75 drop-shadow-[0_8px_16px_rgba(0,0,0,0.75)] pointer-events-none"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />

            <div className="absolute inset-0 z-10">
              <RadarEntityLayer
                players={lowerPlayers}
                grenades={lowerGrenades}
                allPlayers={playersArray}
                bombData={lowerBomb}
                observedSteamId={observedSteamId}
                sampleReceivedAt={gsiState?.received_at}
                compact
              />
            </div>

            <div className="absolute left-2 top-2 z-30 rounded-sm border border-white/10 bg-black/75 px-2 py-1 text-[8px] font-black uppercase tracking-[0.18em] text-white/65">
              SUBSOLO
            </div>
          </div>
        )}

        {hasLowerLevel && (
          <div className="absolute bottom-3 right-3 z-30 rounded-sm border border-white/10 bg-black/60 px-2 py-1 text-[8px] font-black uppercase tracking-[0.16em] text-white/45">
            PISO PRINCIPAL
          </div>
        )}
      </div>
    </div>
  );
}
