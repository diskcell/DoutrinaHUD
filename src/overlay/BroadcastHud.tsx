import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '../frontend/components/AdminLayout';
import { BombStateBanner } from '../frontend/components/overlay/BombStateBanner';
import { ClutchIndicator } from '../frontend/components/overlay/ClutchIndicator';
import { KillEventFeed } from '../frontend/components/overlay/KillEventFeed';
import { MatchEndBanner } from '../frontend/components/overlay/MatchEndBanner';
import { PlayerPortrait } from '../frontend/components/overlay/PlayerPortrait';
import { RadarMinimap } from '../frontend/components/overlay/RadarMinimap';
import { RoundEndBanner } from '../frontend/components/overlay/RoundEndBanner';
import { getWeaponIcon } from '../frontend/components/overlay/OverlayHelpers';

interface BroadcastHudProps {
  connected: boolean;
  autoMode: boolean;
  match: any;
  gsiState: any;
  round: any;
  phase: any;
  timerDisplay: string;
  timerPhase: string;
  leftPlayers: any[];
  rightPlayers: any[];
  ctPlayers: any[];
  tPlayers: any[];
  radarPlayers: Record<string, any>;
  observerTarget: string | null;
  observedPlayerObj: any;
  radarResetKey: string;
  handleKillDetected: (steamid: string) => void;
}

function getTeamScore(side: 'CT' | 'T', gsiState: any, fallback: number) {
  if (!gsiState?.map) return fallback || 0;

  return side === 'CT'
    ? Number(gsiState.map.team_ct?.score ?? fallback ?? 0)
    : Number(gsiState.map.team_t?.score ?? fallback ?? 0);
}

function getTeamLabel(team: any, fallback: string) {
  return String(team?.tag || team?.name || fallback).toUpperCase().slice(0, 6);
}

function getActiveWeapon(player: any) {
  const weapons = Object.values<any>(player?.weapons || {});
  return weapons.find((weapon) => weapon?.state === 'active') || null;
}

function getGrenades(player: any) {
  return Object.values<any>(player?.weapons || {})
    .filter((weapon) => String(weapon?.type || '').toLowerCase().includes('grenade'))
    .slice(0, 4);
}

function useBroadcastScale() {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    };

    updateScale();
    window.addEventListener('resize', updateScale);

    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return scale;
}

function BroadcastMapStrip({ match }: { match: any }) {
  const series = Array.isArray(match?.series) && match.series.length > 0
    ? match.series
    : [
        { mapName: 'Ancient', status: 'BESTIA' },
        { mapName: 'Mirage', status: 'BETBOOM' },
        { mapName: 'Dust2', status: 'DECIDER' },
      ];

  return (
    <div className="absolute top-[30px] left-[30px] z-50 w-[390px] shadow-[0_18px_35px_rgba(0,0,0,0.32)]">
      <div className="bg-black/95 h-[31px] flex items-center justify-center border-b-[2px] border-sky-500">
        <span className="text-[13px] font-black uppercase tracking-[-0.02em] text-white">
          DOUTRINA BROADCAST
        </span>
      </div>
      <div className="grid grid-cols-3 h-[40px] bg-white text-black">
        {series.slice(0, 3).map((map: any, index: number) => {
          const mapName = map.mapName || map.name || map.map || `Mapa ${index + 1}`;
          const status = map.pickedBy || map.status || (index === 2 ? 'DECIDER' : 'PICK');

          return (
            <div
              key={`${mapName}_${index}`}
              className="flex flex-col items-center justify-center border-r border-black/20 last:border-r-0"
            >
              <span className="text-[14px] font-black uppercase leading-none tracking-[-0.02em]">{mapName}</span>
              <span className="text-[8px] font-black uppercase text-neutral-600 mt-1 leading-none">{status}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BroadcastScoreboard({
  match,
  gsiState,
  timerDisplay,
  autoMode,
}: {
  match: any;
  gsiState: any;
  timerDisplay: string;
  autoMode: boolean;
}) {
  const sideHome = match.sideHome === 'T' ? 'T' : 'CT';
  const sideAway = sideHome === 'CT' ? 'T' : 'CT';
  const scoreHome = getTeamScore(sideHome, gsiState, Number(match.scoreHome || 0));
  const scoreAway = getTeamScore(sideAway, gsiState, Number(match.scoreAway || 0));
  const roundNumber = autoMode && gsiState?.map?.round !== undefined
    ? Number(gsiState.map.round || 0) + 1
    : 1;

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-[30px] left-1/2 -translate-x-1/2 z-50 flex h-[70px] shadow-[0_20px_35px_rgba(0,0,0,0.45)]"
    >
      <div className="w-[430px] bg-black/95 border-l-[4px] border-sky-500 border-r-[4px] border-rose-500 flex items-center">
        <div className="w-[132px] h-full bg-sky-600/90 flex items-center justify-center gap-3">
          <span className="text-[40px] leading-none font-black text-white tabular-nums">{scoreHome}</span>
          <span className="text-[32px] font-black text-white uppercase tracking-[-0.06em] max-w-[70px] truncate">
            {getTeamLabel(match.teamHome, 'HOME')}
          </span>
        </div>

        <div className="flex-1 h-full bg-black flex flex-col items-center justify-center border-x border-white/10 px-2">
          <span className="text-[30px] leading-none font-black text-white tabular-nums tracking-[-0.04em]">{timerDisplay}</span>
          <span className="text-[9px] font-black uppercase text-white tracking-wide mt-1 whitespace-nowrap">
            Round {roundNumber}/24
          </span>
        </div>

        <div className="w-[132px] h-full bg-rose-600/90 flex items-center justify-center gap-3">
          <span className="text-[32px] font-black text-white uppercase tracking-[-0.06em] max-w-[70px] truncate text-right">
            {getTeamLabel(match.teamAway, 'AWAY')}
          </span>
          <span className="text-[40px] leading-none font-black text-white tabular-nums">{scoreAway}</span>
        </div>
      </div>
    </motion.div>
  );
}

function BroadcastSponsorArea() {
  return (
    <div className="absolute top-[30px] right-[30px] z-50 flex items-center gap-14">
      <div className="bg-black/72 px-8 py-3 border border-white/5 text-right h-[70px] flex flex-col justify-center shadow-[0_18px_35px_rgba(0,0,0,0.32)]">
        <div className="text-[24px] leading-none font-black uppercase tracking-[-0.04em] text-white whitespace-nowrap">
          Sponsors Area
        </div>
        <div className="text-[11px] font-black uppercase tracking-[0.42em] text-white/50 mt-1">
          Doutrina HUD
        </div>
      </div>
      <div className="w-[70px] h-[70px] bg-gradient-to-br from-fuchsia-600 to-violet-700 flex items-center justify-center font-black text-[38px] text-white shadow-lg">
        D
      </div>
    </div>
  );
}

function BroadcastPlayerCard({
  player,
  isObserved,
  align = 'left',
}: {
  player: any;
  isObserved?: boolean;
  align?: 'left' | 'right';
}) {
  const health = Number(player?.state?.health ?? 0);
  const armor = Number(player?.state?.armor ?? 0);
  const helmet = Boolean(player?.state?.helmet);
  const money = Number(player?.state?.money ?? 0);
  const stats = player?.match_stats || {};
  const activeWeapon = getActiveWeapon(player);
  const grenades = getGrenades(player);
  const isDead = health <= 0;
  const isCT = player?.team === 'CT';
  const accent = isCT ? '#0ea5e9' : '#e11d48';

  const hpColor = health <= 25 && health > 0 ? '#ef4444' : '#ffffff';

  return (
    <motion.div
      animate={{ opacity: isDead ? 0.48 : 1, y: isObserved && !isDead ? -8 : 0 }}
      className={cn(
        'relative h-[112px] w-[136px] bg-black/70 border border-white/12 overflow-visible shadow-[0_10px_25px_rgba(0,0,0,0.45)]',
        isObserved && 'border-white/80'
      )}
      style={{ borderBottomColor: accent, borderBottomWidth: 4 }}
    >
      <div
        className="absolute inset-x-0 bottom-0 h-[54px]"
        style={{
          background: `linear-gradient(180deg, transparent, ${isCT ? 'rgba(14,165,233,0.38)' : 'rgba(225,29,72,0.42)'})`,
        }}
      />

      <div className={cn('absolute top-[8px] text-[12px] font-black text-white uppercase z-20 max-w-[78px] truncate leading-none', align === 'right' ? 'right-2 text-right' : 'left-2')}>
        {player?.name || 'PLAYER'}
      </div>

      <div className={cn('absolute top-[31px] z-20 flex items-end gap-1', align === 'right' ? 'right-2 flex-row-reverse' : 'left-2')}>
        <span className="text-[26px] leading-none font-black tabular-nums" style={{ color: hpColor }}>{health}</span>
        <span className="text-[9px] font-black text-white/45 uppercase mb-[2px]">HP</span>
      </div>

      <PlayerPortrait
        avatar={player?.avatar}
        isDead={isDead}
        transparent
        className={cn(
          'absolute bottom-[4px] w-[88px] h-[103px] z-[1]',
          align === 'right' ? 'left-[-8px]' : 'right-[-8px]'
        )}
      />

      <div className="absolute left-2 right-2 bottom-[8px] z-20 flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 h-4 mb-1">
            {armor > 0 && (
              <img
                src={helmet ? '/icons/cs2/armor_helmet.svg' : '/icons/cs2/armor.svg'}
                className="w-4 h-4 brightness-0 invert opacity-85"
              />
            )}
            <span className="text-[11px] font-black text-white/80 tabular-nums">
              {stats.kills || 0}/{stats.deaths || 0}
            </span>
          </div>
          <div className="text-[11px] font-black text-emerald-400 tabular-nums">
            ${money.toLocaleString()}
          </div>
        </div>

        <div className="flex flex-col items-end gap-1 min-w-0">
          {activeWeapon && (
            <img
              src={getWeaponIcon(activeWeapon.name)}
              className="h-[20px] max-w-[58px] object-contain brightness-0 invert drop-shadow"
              onError={(event) => {
                event.currentTarget.style.display = 'none';
              }}
            />
          )}
          <div className="flex gap-0.5">
            {grenades.map((grenade, index) => (
              <img
                key={`${grenade.name}_${index}`}
                src={getWeaponIcon(grenade.name)}
                className="w-3 h-3 object-contain brightness-0 invert opacity-60"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BroadcastPlayerDock({
  players,
  observedSteamId,
  side,
}: {
  players: any[];
  observedSteamId: string | null;
  side: 'left' | 'right';
}) {
  return (
    <div
      className={cn(
        'absolute bottom-[30px] z-40 flex gap-1.5',
        side === 'left' ? 'left-[34px]' : 'right-[34px]'
      )}
    >
      {players.slice(0, 5).map((player) => (
        <BroadcastPlayerCard
          key={player.steamid}
          player={player}
          isObserved={observedSteamId === player.steamid}
          align={side}
        />
      ))}
    </div>
  );
}

function BroadcastObservedBar({ player }: { player: any }) {
  if (!player) return null;

  const activeWeapon = getActiveWeapon(player);
  const health = Number(player?.state?.health ?? 0);
  const stats = player?.match_stats || {};

  return (
    <div className="absolute bottom-[30px] left-1/2 -translate-x-1/2 z-50 w-[430px] h-[66px] bg-black/82 border-t border-white/10 shadow-[0_10px_28px_rgba(0,0,0,0.55)] flex items-center overflow-visible">
      <div className="w-[112px] h-[124px] self-end relative overflow-visible shrink-0">
        <PlayerPortrait avatar={player.avatar} transparent className="absolute bottom-[-2px] left-[-4px] w-[116px] h-[126px]" />
      </div>
      <div className="flex-1 min-w-0 px-4">
        <div className="text-[12px] font-black uppercase tracking-[0.28em] text-white/45 leading-none">Jogador observado</div>
        <div className="text-[21px] font-black uppercase text-white truncate leading-tight mt-1">{player.name}</div>
      </div>
      <div className="px-4 flex items-center gap-4 shrink-0">
        <div className="text-right">
          <div className="text-[28px] font-black text-white tabular-nums leading-none">{health}</div>
          <div className="text-[10px] text-white/45 font-black tabular-nums">{stats.kills || 0}/{stats.deaths || 0}</div>
        </div>
        {activeWeapon && (
          <img
            src={getWeaponIcon(activeWeapon.name)}
            className="h-[24px] max-w-[80px] object-contain brightness-0 invert"
            onError={(event) => {
              event.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
    </div>
  );
}

export function BroadcastHud({
  connected,
  autoMode,
  match,
  gsiState,
  round,
  phase,
  timerDisplay,
  timerPhase,
  leftPlayers,
  rightPlayers,
  ctPlayers,
  tPlayers,
  radarPlayers,
  observerTarget,
  observedPlayerObj,
  radarResetKey,
  handleKillDetected,
}: BroadcastHudProps) {
  const scale = useBroadcastScale();

  return (
    <div className="w-screen h-screen bg-transparent overflow-hidden">
      <div
        className="w-[1920px] h-[1080px] bg-transparent text-white font-sans relative overflow-hidden origin-top-left"
        style={{ transform: `scale(${scale})` }}
      >
      {!connected && (
        <div className="absolute top-4 left-4 px-4 py-2 bg-red-500/80 text-white rounded font-bold text-sm z-[80]">
          DESCONECTADO DO SERVIDOR
        </div>
      )}

      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_42%,rgba(0,0,0,0.22)_100%)]" />

      <BroadcastMapStrip match={match} />
      <BroadcastScoreboard
        match={match}
        gsiState={gsiState}
        timerDisplay={timerDisplay}
        autoMode={autoMode}
      />
      <BroadcastSponsorArea />

      <RadarMinimap
        key={radarResetKey}
        className="top-[118px] left-[64px]"
        mapName={gsiState?.map?.name || match.currentMap}
        players={autoMode ? radarPlayers : {}}
        observedSteamId={observerTarget}
        bomb={gsiState?.bomb}
        gsiState={gsiState}
      />

      <BroadcastPlayerDock players={leftPlayers} observedSteamId={observerTarget} side="left" />
      <BroadcastPlayerDock players={rightPlayers} observedSteamId={observerTarget} side="right" />

      <AnimatePresence>
        {gsiState?.round?.phase !== 'over' && (
          <BroadcastObservedBar player={observedPlayerObj} />
        )}
      </AnimatePresence>

      <KillEventFeed
        players={[...ctPlayers, ...tPlayers]}
        round={gsiState?.round}
        map={gsiState?.map}
        autoMode={autoMode}
        onKillDetected={handleKillDetected}
      />

      <BombStateBanner
        gsiState={gsiState}
        players={[...leftPlayers, ...rightPlayers]}
      />

      <ClutchIndicator
        players={[...ctPlayers, ...tPlayers]}
        round={gsiState?.round}
        bomb={gsiState?.bomb}
        phase={phase}
      />

      <RoundEndBanner
        round={round}
        players={[...leftPlayers, ...rightPlayers]}
        match={match}
        gsiState={gsiState}
      />

      <MatchEndBanner
        map={gsiState?.map}
        players={[...leftPlayers, ...rightPlayers]}
        match={match}
      />

      {timerPhase === 'bomb' && (
        <div className="absolute top-[108px] left-1/2 -translate-x-1/2 z-50 px-5 py-2 bg-red-600 text-white text-xs font-black uppercase tracking-[0.24em] shadow-lg">
          Bomba plantada
        </div>
      )}
      </div>
    </div>
  );
}
