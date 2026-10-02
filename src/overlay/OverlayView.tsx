import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSocket } from '../context/SocketContext';
import { Scoreboard } from '../frontend/components/overlay/Scoreboard';
import { PlayerPanels } from '../frontend/components/overlay/PlayerPanels';
import { ObservedPlayer } from '../frontend/components/overlay/ObservedPlayer';
import { BombStateBanner } from '../frontend/components/overlay/BombStateBanner';
import { RadarMinimap } from '../frontend/components/overlay/RadarMinimap';
import { TeamEconomyPanel } from '../frontend/components/overlay/TeamEconomyPanel';
import { RoundEndBanner } from '../frontend/components/overlay/RoundEndBanner';
import { MatchEndBanner } from '../frontend/components/overlay/MatchEndBanner';
import { ClutchIndicator } from '../frontend/components/overlay/ClutchIndicator';
import { KillEventFeed } from '../frontend/components/overlay/KillEventFeed';
import { SeriesMapStrip } from '../frontend/components/overlay/SeriesMapStrip';
import { BroadcastHud } from './BroadcastHud';
import {
  getOverlayVariantFromModelId,
  getStoredActiveOverlayId,
  OverlayVariant,
} from '../frontend/lib/overlayModels';
import { loadCloudLiveBootstrap } from '../frontend/lib/cloudLive';

import { findRegisteredPlayer, getPlayerAvatar } from '../frontend/lib/players/playerIdentity';

interface OverlayViewProps {
  variant?: OverlayVariant;
}

function getManualTimerStatus(matchStatus: string | undefined) {
  switch (matchStatus) {
    case 'Warmup':
      return { display: 'WARMUP', phase: 'warmup' };
    case 'Pause':
      return { display: 'PAUSE', phase: 'pause' };
    case 'Technical Pause':
      return { display: 'TECH', phase: 'technical_pause' };
    case 'Knife Round':
      return { display: 'KNIFE', phase: 'knife' };
    case 'Overtime':
      return { display: 'OT', phase: 'overtime' };
    case 'Match Point':
      return { display: 'M.POINT', phase: 'match_point' };
    case 'Finished':
      return { display: 'FINAL', phase: 'finished' };
    default:
      return null;
  }
}

export function OverlayView({ variant }: OverlayViewProps) {
  const { socket, connected, sessionId, transport } = useSocket();
  const [selectedVariant, setSelectedVariant] = useState<OverlayVariant>(() => {
    return variant || getOverlayVariantFromModelId(getStoredActiveOverlayId());
  });

  const [hudState, setHudState] = useState<any>(null);
  const [gsiState, setGsiState] = useState<any>(null);
  const pendingGsiRef = useRef<any>(null);
  const gsiFrameRef = useRef<number | null>(null);
  const [dbPlayers, setDbPlayers] = useState<any[]>([]);
  const [steamProfiles, setSteamProfiles] = useState<Record<string, any>>({});
  const [recentKills, setRecentKills] = useState<Set<string>>(new Set());
  const damageTrackerRef = useRef<{
    mapName: string | null;
    activeRound: number | null;
    lastScore: number | null;
    observedScoredRounds: number;
    currentRoundDamage: Record<string, number>;
    totalDamage: Record<string, number>;
  }>({
    mapName: null,
    activeRound: null,
    lastScore: null,
    observedScoredRounds: 0,
    currentRoundDamage: {},
    totalDamage: {},
  });
  const [playerDamageStats, setPlayerDamageStats] = useState<
    Record<string, { damage: number; dmr: number; rounds: number }>
  >({});

  useEffect(() => {
    if (variant) {
      setSelectedVariant(variant);
      return;
    }

    let isMounted = true;

    if (transport === 'supabase' && sessionId !== 'local') {
      loadCloudLiveBootstrap(sessionId)
        .then((bootstrap) => {
          if (isMounted && bootstrap?.overlayModelId) {
            setSelectedVariant(getOverlayVariantFromModelId(bootstrap.overlayModelId));
          }
        })
        .catch((error) => console.error('Erro ao carregar modelo da overlay:', error));

      return () => {
        isMounted = false;
      };
    }

    const syncFromStorage = () => {
      setSelectedVariant(getOverlayVariantFromModelId(getStoredActiveOverlayId()));
    };

    fetch(`/api/overlays/active?session=${encodeURIComponent(sessionId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((activeModel) => {
        if (!isMounted || !activeModel?.id) return;
        setSelectedVariant(getOverlayVariantFromModelId(activeModel.id));
      })
      .catch(syncFromStorage);

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('doutrinahud:overlay-model-change', syncFromStorage);

    return () => {
      isMounted = false;
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('doutrinahud:overlay-model-change', syncFromStorage);
    };
  }, [variant, sessionId, transport]);

  // Fetch Steam profiles when new players appear
  useEffect(() => {
    if (!gsiState?.allplayers) return;
    if (transport === 'supabase') return;

    const steamids = Object.keys(gsiState.allplayers);
    const missingSteamids = steamids.filter(id => {
      if (steamProfiles[id]) return false;
      const dbPlayer = findRegisteredPlayer({ steamid: id, ...gsiState.allplayers[id] }, dbPlayers);
      return !dbPlayer?.avatar;
    });

    if (missingSteamids.length > 0) {
      fetch('/api/steam/players', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ steamids: missingSteamids })
      })
      .then(res => res.json())
      .then(data => {
        if (data.profiles) {
          setSteamProfiles(prev => ({ ...prev, ...data.profiles }));
        }
      })
      .catch(err => console.warn('Error fetching steam profiles:', err));
    }
  }, [gsiState?.allplayers, dbPlayers, steamProfiles, transport]);

  // Handle kill detection for panel highlighting
  const handleKillDetected = (steamid: string) => {
    setRecentKills(prev => {
      const next = new Set(prev);
      next.add(steamid);
      return next;
    });

    // Remove highlight after 2 seconds
    setTimeout(() => {
      setRecentKills(prev => {
        const next = new Set(prev);
        next.delete(steamid);
        return next;
      });
    }, 2000);
  };

  useEffect(() => {
    if (transport === 'supabase' && sessionId !== 'local') {
      loadCloudLiveBootstrap(sessionId)
        .then((bootstrap) => setDbPlayers(bootstrap?.players || []))
        .catch((error) => console.error('Erro ao carregar jogadores do Supabase:', error));
      return;
    }

    fetch('/api/players')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setDbPlayers(data);
      })
      .catch(err => console.error('Error fetching players:', err));
  }, [sessionId, transport]);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleHud = (data: any) => {
      setHudState(data);
    };

    const handleGsi = (data: any) => {
      pendingGsiRef.current = data;

      if (gsiFrameRef.current !== null) {
        return;
      }

      gsiFrameRef.current = window.requestAnimationFrame(() => {
        gsiFrameRef.current = null;
        const nextGsi = pendingGsiRef.current;
        pendingGsiRef.current = null;

        if (nextGsi) {
          setGsiState(nextGsi);
        }
      });
    };

    socket.on('hud:update', handleHud);
    socket.on('gsi:update', handleGsi);
    socket.emit('overlay:ready');

    return () => {
      socket.off('hud:update', handleHud);
      socket.off('gsi:update', handleGsi);

      if (gsiFrameRef.current !== null) {
        window.cancelAnimationFrame(gsiFrameRef.current);
        gsiFrameRef.current = null;
      }

      pendingGsiRef.current = null;
    };
  }, [socket, connected]);

  const match = hudState?.match || {};
  const autoMode = hudState?.autoMode || false;

  useEffect(() => {
    if (!autoMode || !gsiState?.allplayers || !gsiState?.map) return;

    const mapName = gsiState.map.name || null;
    const currentRound = Number(gsiState.map.round ?? 0);
    const ctScore = Number(gsiState.map.team_ct?.score ?? 0);
    const tScore = Number(gsiState.map.team_t?.score ?? 0);
    const totalScore = ctScore + tScore;
    const mapPhase = String(gsiState.map.phase || '').toLowerCase();
    const roundPhase = String(gsiState.round?.phase || '').toLowerCase();
    const isWarmup =
      mapPhase === 'warmup' ||
      roundPhase === 'warmup' ||
      totalScore === 0;
    const tracker = damageTrackerRef.current;

    if (
      tracker.mapName !== mapName ||
      (tracker.activeRound !== null && currentRound < tracker.activeRound)
    ) {
      tracker.mapName = mapName;
      tracker.activeRound = currentRound;
      tracker.lastScore = totalScore;
      tracker.observedScoredRounds = 0;
      tracker.currentRoundDamage = {};
      tracker.totalDamage = {};
    }

    if (tracker.activeRound === null) {
      tracker.activeRound = currentRound;
    }

    if (tracker.lastScore === null) {
      tracker.lastScore = totalScore;
    }

    const scoreIncreased =
      !isWarmup &&
      tracker.lastScore !== null &&
      totalScore > tracker.lastScore;

    if (scoreIncreased || tracker.activeRound !== currentRound) {
      Object.entries(tracker.currentRoundDamage).forEach(([steamid, damage]) => {
        tracker.totalDamage[steamid] =
          (tracker.totalDamage[steamid] || 0) + Number(damage || 0);
      });

      if (scoreIncreased) {
        tracker.observedScoredRounds += totalScore - (tracker.lastScore || 0);
      }

      tracker.currentRoundDamage = {};
      tracker.activeRound = currentRound;
      tracker.lastScore = totalScore;
    }

    if (!isWarmup) {
      Object.entries(gsiState.allplayers).forEach(([steamid, player]: [string, any]) => {
        const roundDamage = Number(player?.state?.round_totaldmg || 0);
        tracker.currentRoundDamage[steamid] = Math.max(
          tracker.currentRoundDamage[steamid] || 0,
          roundDamage
        );
      });
    }

    const hasCurrentRoundDamage = Object.values(tracker.currentRoundDamage).some(
      (damage) => Number(damage || 0) > 0
    );
    const rounds = Math.max(
      1,
      tracker.observedScoredRounds + (hasCurrentRoundDamage ? 1 : 0)
    );
    const nextDamageStats: Record<string, { damage: number; dmr: number; rounds: number }> = {};

    Object.keys(gsiState.allplayers).forEach((steamid) => {
      const damage =
        (tracker.totalDamage[steamid] || 0) +
        (tracker.currentRoundDamage[steamid] || 0);

      nextDamageStats[steamid] = {
        damage,
        dmr: Math.round(damage / rounds),
        rounds,
      };
    });

    setPlayerDamageStats(nextDamageStats);
  }, [autoMode, gsiState?.allplayers, gsiState?.map?.name, gsiState?.map?.round]);

  const round = autoMode && gsiState?.round ? gsiState.round : null;

  const phase =
    autoMode && gsiState?.phase_countdowns
      ? gsiState.phase_countdowns
      : null;

  let timerDisplay = '0:00';
  let timerPhase = 'warmup';

  if (phase && phase.phase_ends_in) {
    const totalSeconds = Math.ceil(parseFloat(phase.phase_ends_in));
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;

    timerDisplay = `${mins}:${secs.toString().padStart(2, '0')}`;
    timerPhase = phase.phase;
  } else if (match.matchStatus) {
    if (match.matchStatus === 'Warmup') timerDisplay = 'WARMUP';
    if (match.matchStatus === 'Pause') timerDisplay = 'PAUSE';
    if (match.matchStatus === 'Technical Pause') timerDisplay = 'TECH';
  }

  const manualTimerStatus = getManualTimerStatus(match.matchStatus);

  if (manualTimerStatus) {
    timerDisplay = manualTimerStatus.display;
    timerPhase = manualTimerStatus.phase;
  }

  let ctPlayers: any[] = [];
  let tPlayers: any[] = [];
  let observerTarget: string | null = null;
  let observedPlayerObj: any = null;

  /*
   ============================================================
   PLAYERS FROM GSI
   ============================================================
   Importante:
   - NÃO usamos observer_slot como número final da HUD.
   - Criamos displayNumber manualmente:
     CT = 1 a 5
     TR = 6 a 10
   ============================================================
  */

  if (autoMode && gsiState?.allplayers) {
    const playersArray = Object.keys(gsiState.allplayers)
      .map((steamid) => ({
        steamid,
        ...gsiState.allplayers[steamid],
      }))
      .filter((player) => {
        return player.name && (player.team === 'CT' || player.team === 'T');
      });

    const sortPlayers = (a: any, b: any) => {
      const slotA = Number(a.observer_slot ?? 999);
      const slotB = Number(b.observer_slot ?? 999);

      if (slotA !== slotB) {
        return slotA - slotB;
      }

      return String(a.name || a.steamid).localeCompare(
        String(b.name || b.steamid)
      );
    };

    ctPlayers = playersArray
      .filter((player) => player.team === 'CT')
      .sort(sortPlayers)
      .slice(0, 5)
      .map((player, index) => {
        const damageStats = playerDamageStats[player.steamid] || {
          damage: 0,
          dmr: 0,
          rounds: 1,
        };

        return {
          ...player,
          match_stats: {
            ...(player.match_stats || {}),
            damage: damageStats.damage,
            dmr: damageStats.dmr,
            damageRounds: damageStats.rounds,
          },
          displayNumber: index + 1,
          avatar: getPlayerAvatar(player, dbPlayers, steamProfiles)
        };
      });

    tPlayers = playersArray
      .filter((player) => player.team === 'T')
      .sort(sortPlayers)
      .slice(0, 5)
      .map((player, index) => {
        const damageStats = playerDamageStats[player.steamid] || {
          damage: 0,
          dmr: 0,
          rounds: 1,
        };

        return {
          ...player,
          match_stats: {
            ...(player.match_stats || {}),
            damage: damageStats.damage,
            dmr: damageStats.dmr,
            damageRounds: damageStats.rounds,
          },
          displayNumber: index + 6,
          avatar: getPlayerAvatar(player, dbPlayers, steamProfiles)
        };
      });

    observerTarget =
      gsiState?.player?.steamid ||
      gsiState?.player?.spec_target ||
      null;

    if (observerTarget) {
      const found = [...ctPlayers, ...tPlayers].find(
        (player) => player.steamid === observerTarget
      );
      
      if (found) {
        const observedGsiPlayer = gsiState?.player || {};
        observedPlayerObj = {
          ...found,
          state: observedGsiPlayer.state
            ? { ...(found.state || {}), ...observedGsiPlayer.state }
            : found.state,
          match_stats: observedGsiPlayer.match_stats
            ? { ...(found.match_stats || {}), ...observedGsiPlayer.match_stats }
            : found.match_stats,
          weapons: observedGsiPlayer.weapons || found.weapons,
        };
      } else {
        const raw = gsiState.allplayers[observerTarget] || gsiState.player;
        observedPlayerObj = {
          steamid: observerTarget,
          ...raw,
          avatar: getPlayerAvatar({ steamid: observerTarget, ...raw }, dbPlayers, steamProfiles)
        };
      }
    }
  } else {
    /*
     ============================================================
     FALLBACK MOCK
     ============================================================
     Usado quando Auto Mode está OFF ou GSI ainda não chegou.
     Também já recebe displayNumber correto.
     ============================================================
    */

    ctPlayers = Array.from({ length: 5 }).map((_, index) => ({
      steamid: `mock_ct_${index}`,
      name: `CT PLAYER ${index + 1}`,
      team: 'CT',
      displayNumber: index + 1,
      avatar: '',
      state: {
        health: 100,
        armor: 100,
        helmet: true,
        money: 800 * (index + 1),
        defusekit: index === 0,
      },
      match_stats: {
        kills: index * 3,
        deaths: index * 2,
        assists: index,
        damage: 620 + index * 95,
        dmr: 78 + index * 8,
      },
      weapons: {
        w1: {
          name: 'weapon_m4a1_silencer',
          type: 'Rifle',
          state: 'active',
        },
      },
    }));

    tPlayers = Array.from({ length: 5 }).map((_, index) => ({
      steamid: `mock_t_${index}`,
      name: `TR PLAYER ${index + 1}`,
      team: 'T',
      displayNumber: index + 6,
      avatar: '',
      state: {
        health: 100,
        armor: 100,
        helmet: true,
        money: 500 * (index + 1),
      },
      match_stats: {
        kills: index * 2,
        deaths: index * 3,
        assists: index,
        damage: 560 + index * 80,
        dmr: 70 + index * 7,
      },
      weapons: {
        w1: {
          name: 'weapon_ak47',
          type: 'Rifle',
          state: 'active',
          ammo_clip: 30,
          ammo_reserve: 90,
        },
        w2: {
          name: index === 4 ? 'weapon_c4' : '',
          type: index === 4 ? 'C4' : '',
          state: 'holstered',
        },
      },
    }));

    observerTarget = 'mock_t_2';
    observedPlayerObj = tPlayers[2];
  }

  /*
   ============================================================
   RADAR PLAYERS OBJECT
   ============================================================
   O RadarMinimap antigo trabalha melhor recebendo objeto:
   {
     steamid: player
   }

   Então não passamos array direto.
   ============================================================
  */

  const radarPlayers = [...ctPlayers, ...tPlayers].reduce(
    (acc: Record<string, any>, player: any) => {
      if (player?.steamid) {
        acc[player.steamid] = player;
      }

      return acc;
    },
    {}
  );

  /*
   ============================================================
   LEFT / RIGHT SIDE
   ============================================================
   Mantém a lógica visual da HUD:
   se Time A estiver CT, CT fica à esquerda;
   se Time A estiver TR, TR fica à esquerda.
   ============================================================
  */

  const leftTeamColor = match.sideHome === 'CT' ? 'CT' : 'T';

  const leftPlayers = leftTeamColor === 'CT' ? ctPlayers : tPlayers;
  const rightPlayers = leftTeamColor === 'CT' ? tPlayers : ctPlayers;
  const radarResetKey = [
    gsiState?.map?.name || match.currentMap || 'unknown_map',
    gsiState?.map?.round ?? '0',
    gsiState?.map?.team_ct?.score ?? '',
    gsiState?.map?.team_t?.score ?? '',
    gsiState?.round?.phase ?? '',
    gsiState?.phase_countdowns?.phase ?? '',
    connected ? 'connected' : 'disconnected',
  ].join(':');

  if (selectedVariant === 'broadcast') {
    return (
      <BroadcastHud
        connected={connected}
        autoMode={autoMode}
        match={match}
        gsiState={gsiState}
        round={round}
        phase={phase}
        timerDisplay={timerDisplay}
        timerPhase={timerPhase}
        leftPlayers={leftPlayers}
        rightPlayers={rightPlayers}
        ctPlayers={ctPlayers}
        tPlayers={tPlayers}
        radarPlayers={radarPlayers}
        observerTarget={observerTarget}
        observedPlayerObj={observedPlayerObj}
        radarResetKey={radarResetKey}
        handleKillDetected={handleKillDetected}
      />
    );
  }

  return (
    <div className="w-[1920px] h-[1080px] bg-transparent text-white font-sans relative overflow-hidden">
      {!connected && (
        <div className="absolute top-4 left-4 px-4 py-2 bg-red-500/80 text-white rounded font-bold text-sm z-50">
          DESCONECTADO DO SERVIDOR
        </div>
      )}

      <RadarMinimap
        key={radarResetKey}
        mapName={gsiState?.map?.name || match.currentMap}
        players={autoMode ? radarPlayers : {}}
        observedSteamId={observerTarget}
        bomb={gsiState?.bomb}
        gsiState={gsiState}
      />

      <SeriesMapStrip 
        series={match.series} 
        teamHome={match.teamHome} 
        teamAway={match.teamAway} 
      />

      <Scoreboard
        match={match}
        timerDisplay={timerDisplay}
        timerPhase={timerPhase}
        round={round}
        autoMode={autoMode}
        gsiState={gsiState}
      />

      {/* Economy Panels */}
      <div className="absolute bottom-[420px] left-6 z-30">
        <TeamEconomyPanel
          players={leftPlayers}
          side={leftTeamColor}
          isRightSide={false}
          phase={phase}
          round={round}
          teamData={leftTeamColor === 'CT' ? gsiState?.map?.team_ct : gsiState?.map?.team_t}
        />
      </div>

      <div className="absolute bottom-[420px] right-6 z-30">
        <TeamEconomyPanel
          players={rightPlayers}
          side={leftTeamColor === 'CT' ? 'T' : 'CT'}
          isRightSide={true}
          phase={phase}
          round={round}
          teamData={leftTeamColor === 'CT' ? gsiState?.map?.team_t : gsiState?.map?.team_ct}
        />
      </div>

      <PlayerPanels
        players={leftPlayers}
        isRightSide={false}
        isObserved={observerTarget}
        isAutoMode={autoMode}
        recentKills={recentKills}
      />

      <PlayerPanels
        players={rightPlayers}
        isRightSide={true}
        isObserved={observerTarget}
        isAutoMode={autoMode}
        recentKills={recentKills}
      />

      <KillEventFeed 
        players={[...ctPlayers, ...tPlayers]}
        round={gsiState?.round}
        map={gsiState?.map}
        autoMode={autoMode}
        onKillDetected={handleKillDetected}
      />

      <AnimatePresence>
        {gsiState?.round?.phase !== 'over' && (
          <ObservedPlayer player={observedPlayerObj} />
        )}
      </AnimatePresence>

      <BombStateBanner 
        gsiState={gsiState} 
        players={[...leftPlayers, ...rightPlayers]} 
      />

      <ClutchIndicator 
        players={[...ctPlayers, ...tPlayers]}
        round={gsiState?.round}
        bomb={gsiState?.bomb}
        phase={gsiState?.phase_countdowns}
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

      {autoMode && (
        <div className="absolute bottom-4 right-4 text-[10px] text-gray-500 font-mono flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          SINCRONIZAÇÃO GSI ATIVA
        </div>
      )}
    </div>
  );
}
