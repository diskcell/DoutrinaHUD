import { useMemo } from 'react';
import { cn } from '../AdminLayout';
import { resolveMapAssets } from '../../lib/radar/mapAssetResolver';
import { parsePosition } from '../../lib/radar/parsePosition';
import { worldToRadar } from '../../lib/radar/worldToRadar';
import { RadarPlayerIcon } from './RadarPlayerIcon';
import { RadarBombIcon } from './RadarBombIcon';
import { RadarGrenadeLayer } from './RadarGrenadeLayer';
import { RadarGrenadeIcon } from './RadarGrenadeIcon';
import { getPlayerRotation } from '../../lib/radar/getPlayerRotation';
import { useGrenadeTracker } from '../../lib/gsi/grenadeTracker';
import { AnimatePresence } from 'motion/react';

interface RadarMinimapProps {
  mapName: string;
  players: any;
  observedSteamId?: string | null;
  bomb?: any;
  gsiState?: any;
  className?: string;
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

export function RadarMinimap({ mapName, players, observedSteamId, bomb, gsiState, className }: RadarMinimapProps) {
  // 1. Resolve Map Assets and Config
  const playersArray = Array.isArray(players) ? players : Object.values(players || {});
  
  const observedPlayer = observedSteamId ? playersArray.find(p => p.steamid === observedSteamId) : null;
  const observedPos = useMemo(() => parsePosition(observedPlayer?.position), [observedPlayer?.position]);
  
  const assets = useMemo(() => resolveMapAssets(mapName, observedPos), [mapName, observedPos]);

  // 2. Track Grenades
  const trackedGrenades = useGrenadeTracker(gsiState, assets?.config || null);

  // 3. Parse and Project Bomb (Planted or Dropped)
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

    const radarPos = worldToRadar(pos, assets.config);
    return {
      state: bombState as 'planted' | 'dropped',
      radarPos
    };
  }, [bomb, assets]);

  if (!assets) {
    return (
      <div className="absolute top-8 left-8 w-[400px] h-[400px] bg-neutral-950/80 backdrop-blur-md border border-white/10 rounded-lg flex items-center justify-center text-center p-6 z-40">
        <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">
          {mapName ? "Config do radar ausente" : "Radar indisponível"}
        </span>
      </div>
    );
  }

  // 4. Parse and Project Players
  const playersList = playersArray.map(p => {
    const pos = parsePosition(p.position);
    if (!pos) return null;

    const radarPos = worldToRadar(pos, assets.config);
    
    // Parse orientation using the new robust helper
    let orientation = getPlayerRotation(p);
    
    // Apply map rotation if the config specifies it
    if (assets.config.rotate) {
      orientation += assets.config.rotate;
    }

    // Check if player has bomb
    const hasBomb = isPlayerCarryingBomb(p);

    return {
      ...p,
      radarPos,
      orientation,
      hasBomb
    };
  }).filter(Boolean);

  return (
    <div className={cn("absolute top-8 left-8 w-[400px] h-[400px] z-40", className)}>
      <div className="relative w-full h-full overflow-hidden shadow-sm">
        <img 
          src={assets.image} 
          alt="Radar" 
          className="w-full h-full object-fill opacity-100 select-none pointer-events-none"
          onError={(e) => {
             e.currentTarget.style.display = 'none';
          }}
        />

        {assets.isLower && (
          <div className="absolute bottom-4 right-4 px-2 py-1 bg-red-600 text-[10px] font-black text-white rounded-sm uppercase tracking-tighter z-30">
            LOWER
          </div>
        )}

        {/* Grenade Trails Layer */}
        <RadarGrenadeLayer grenades={trackedGrenades} />

        {/* Active Grenade Icons/Markers */}
        <AnimatePresence>
          {trackedGrenades.map((g) => (
            <RadarGrenadeIcon
              key={g.renderKey}
              grenade={g}
              players={playersArray}
              grenades={trackedGrenades}
            />
          ))}
        </AnimatePresence>

        {bombData && (
          <RadarBombIcon 
            x={bombData.radarPos.x}
            y={bombData.radarPos.y}
            state={bombData.state}
          />
        )}

        {playersList.map((p: any) => (
          <RadarPlayerIcon 
            key={p.steamid}
            player={p}
            x={p.radarPos.x}
            y={p.radarPos.y}
            rotation={p.orientation}
            isObserved={observedSteamId === p.steamid}
            hasBomb={p.hasBomb}
            sampleReceivedAt={gsiState?.received_at}
          />
        ))}
      </div>
    </div>
  );
}
