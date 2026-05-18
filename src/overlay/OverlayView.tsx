import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Scoreboard } from '../frontend/components/overlay/Scoreboard';
import { EconomyBar } from '../frontend/components/overlay/EconomyBar';
import { PlayerPanels } from '../frontend/components/overlay/PlayerPanels';
import { ObservedPlayer } from '../frontend/components/overlay/ObservedPlayer';
import { RoundResult } from '../frontend/components/overlay/RoundResult';
import { BombOverlay } from '../frontend/components/overlay/BombOverlay';

export function OverlayView() {
  const { socket, connected } = useSocket();
  const [hudState, setHudState] = useState<any>(null);
  const [gsiState, setGsiState] = useState<any>(null);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('overlay:ready');

    const handleHud = (data: any) => setHudState(data);
    const handleGsi = (data: any) => setGsiState(data);

    socket.on('hud:update', handleHud);
    socket.on('gsi:update', handleGsi);

    return () => {
      socket.off('hud:update', handleHud);
      socket.off('gsi:update', handleGsi);
    };
  }, [socket, connected]);

  const match = hudState?.match || {};
  const autoMode = hudState?.autoMode || false;

  // Use GSI data if Auto Mode is ON, otherwise fallback to Manual Admin Dashboard State
  const map = autoMode && gsiState?.map ? gsiState.map : null;
  const round = autoMode && gsiState?.round ? gsiState.round : null;
  const phase = autoMode && gsiState?.phase_countdowns ? gsiState.phase_countdowns : null;

  const format = match.format || 'BO3';
  const stage = match.stage || 'Live Match';

  // Extract timer
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

  // --- PLAYER PANELS LOGIC ---
  let ctPlayers: any[] = [];
  let tPlayers: any[] = [];
  let observerTarget = null;
  let observedPlayerObj = null;

  if (autoMode && gsiState?.allplayers) {
    const playersArray = Object.keys(gsiState.allplayers).map(steamid => ({
      steamid,
      ...gsiState.allplayers[steamid]
    }));
    ctPlayers = playersArray.filter(p => p.team === 'CT').sort((a, b) => (a.observer_slot || 0) - (b.observer_slot || 0));
    tPlayers = playersArray.filter(p => p.team === 'T').sort((a, b) => (a.observer_slot || 0) - (b.observer_slot || 0));
    
    // Find who we are observing
    observerTarget = gsiState?.player?.steamid || null;
    if (observerTarget && gsiState.player.name) {
      // Sometimes gsiState.player is minimal, pull full from allplayers
      observedPlayerObj = gsiState.allplayers[observerTarget] || gsiState.player;
      if (!observedPlayerObj.steamid) observedPlayerObj.steamid = observerTarget;
    }
  } else {
    // Generate Mock Fallback Players for Professional Broadcast appearance when autoMode is OFF
    ctPlayers = Array.from({length: 5}).map((_, i) => ({
      steamid: `mock_ct_${i}`,
      name: `CT PLAYER ${i+1}`,
      team: 'CT',
      state: { health: 100, armor: 100, helmet: true, money: 800 * (i+1), defusekit: i === 0 },
      match_stats: { kills: i*3, deaths: i*2, assists: i },
      weapons: { 'w1': { name: 'weapon_m4a1_silencer', type: 'Rifle', state: 'active' } }
    }));
    
    tPlayers = Array.from({length: 5}).map((_, i) => ({
      steamid: `mock_t_${i}`,
      name: `TR PLAYER ${i+1}`,
      team: 'T',
      state: { health: 100, armor: 100, helmet: true, money: 500 * (i+1) },
      match_stats: { kills: i*2, deaths: i*3, assists: i },
      weapons: { 'w1': { name: 'weapon_ak47', type: 'Rifle', state: 'active', ammo_clip: 30, ammo_reserve: 90 }, 'w2': { name: i === 4 ? 'weapon_c4' : '', type: i === 4 ? 'C4' : '', state: 'holstered' } }
    }));
    
    observerTarget = 'mock_t_2';
    observedPlayerObj = tPlayers[2];
  }

  const leftTeamColor = match.sideHome === 'CT' ? 'CT' : 'T';
  const leftPlayers = leftTeamColor === 'CT' ? ctPlayers : tPlayers;
  const rightPlayers = leftTeamColor === 'CT' ? tPlayers : ctPlayers;

  return (
    <div className="w-[1920px] h-[1080px] bg-transparent text-white font-sans relative overflow-hidden">
      {!connected && (
        <div className="absolute top-4 left-4 px-4 py-2 bg-red-500/80 text-white rounded font-bold text-sm z-50">
          DESCONECTADO DO SERVIDOR
        </div>
      )}

      {/* Top Scoreboard */}
      <Scoreboard 
        match={match} 
        timerDisplay={timerDisplay} 
        timerPhase={timerPhase} 
        round={round} 
        autoMode={autoMode} 
        gsiState={gsiState} 
      />
      
      {/* Economy Bars */}
      <EconomyBar players={leftPlayers} isRightSide={false} isAutoMode={autoMode} />
      <EconomyBar players={rightPlayers} isRightSide={true} isAutoMode={autoMode} />

      {/* Player Panels (Bottom Horizon) */}
      <PlayerPanels 
        players={leftPlayers}
        isRightSide={false}
        isObserved={observerTarget}
        isAutoMode={autoMode}
      />

      <PlayerPanels 
        players={rightPlayers}
        isRightSide={true}
        isObserved={observerTarget}
        isAutoMode={autoMode}
      />

      {/* Center Observed Player */}
      <ObservedPlayer player={observedPlayerObj} />

      {/* Bomb planted indicator and Match state overrides */}
      <BombOverlay round={round} timerPhase={timerPhase} />
      
      {/* Round Winner / MVP display if applicable (end of round) */}
      <RoundResult round={round} autoMode={autoMode} gsiState={gsiState} />

      {/* Auto Mode Indicator (Dev only) */}
      {autoMode && (
         <div className="absolute bottom-4 right-4 text-[10px] text-gray-500 font-mono flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            CS2 GSI AUTO SYNC
         </div>
      )}
    </div>
  );
}
