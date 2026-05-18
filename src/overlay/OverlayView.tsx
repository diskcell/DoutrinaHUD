import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Trophy, Clock, Target } from 'lucide-react';
import { cn } from '../frontend/components/AdminLayout'; // fallback for cn

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

  const scoreHome = match.scoreHome || 0;
  const scoreAway = match.scoreAway || 0;
  const teamHome = match.teamHome || { name: 'TIME A' };
  const teamAway = match.teamAway || { name: 'TIME B' };
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

  return (
    <div className="w-[1920px] h-[1080px] bg-transparent text-white font-sans relative overflow-hidden">
      {!connected && (
        <div className="absolute top-4 left-4 px-4 py-2 bg-red-500/80 text-white rounded font-bold text-sm">
          DESCONECTADO DO SERVIDOR
        </div>
      )}

      {/* Top Scoreboard */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-8 bg-neutral-900/95 border-b-2 border-emerald-500 rounded-b-xl p-4 px-12 flex items-center justify-between gap-12 shadow-2xl backdrop-blur-md min-w-[800px]">
        
        {/* Team Home */}
        <div className="flex items-center gap-6 flex-1 justify-end">
          <div className="flex flex-col items-end">
            <span className="text-3xl font-black tracking-wider uppercase text-white truncate max-w-[250px]">
              {teamHome.name}
            </span>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              {match.sideHome === 'CT' ? 'Counter-Terrorist' : 'Terrorist'}
            </span>
          </div>
          <div className={cn("w-20 h-20 bg-neutral-800 rounded flex items-center justify-center shadow-inner", match.sideHome === 'CT' ? 'border-b-4 border-blue-500' : 'border-b-4 border-yellow-500')}>
            <span className="text-6xl font-black text-white">{scoreHome}</span>
          </div>
        </div>

        {/* Center Timer & Info */}
        <div className="flex flex-col items-center justify-center shrink-0 w-[140px] relative">
          
          {timerPhase === 'bomb' ? (
             <div className="bg-red-600 animate-pulse w-full py-2 flex items-center justify-center rounded">
                <span className="text-3xl font-black text-white animate-bounce">BOMB</span>
             </div>
          ) : timerPhase === 'defuse' ? (
             <div className="bg-blue-600 w-full py-2 flex items-center justify-center rounded shadow-[0_0_20px_blue]">
                <span className="text-3xl font-black text-white">{timerDisplay}</span>
             </div>
          ) : (
            <div className="bg-neutral-950 w-full py-2 flex items-center justify-center rounded border border-neutral-800">
               <span className={cn("text-4xl font-black tabular-nums tracking-tighter", timerPhase === 'live' ? 'text-white' : 'text-yellow-500')}>
                  {timerDisplay}
               </span>
            </div>
          )}
          
          <div className="mt-2 text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] text-center w-full bg-neutral-900 py-1 rounded">
            {format} • {stage}
          </div>
        </div>

        {/* Team Away */}
        <div className="flex items-center gap-6 flex-1 justify-start">
          <div className={cn("w-20 h-20 bg-neutral-800 rounded flex items-center justify-center shadow-inner", match.sideHome === 'TR' ? 'border-b-4 border-blue-500' : 'border-b-4 border-yellow-500')}>
            <span className="text-6xl font-black text-white">{scoreAway}</span>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-3xl font-black tracking-wider uppercase text-white truncate max-w-[250px]">
              {teamAway.name}
            </span>
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">
              {match.sideHome === 'TR' ? 'Counter-Terrorist' : 'Terrorist'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Bomb planted indicator pop and Match state overrides */}
      {round?.bomb === 'planted' && timerPhase !== 'bomb' && timerPhase !== 'defuse' && (
         <div className="absolute top-[140px] left-1/2 -translate-x-1/2 bg-red-600 text-white font-black uppercase tracking-widest px-8 py-2 rounded-full shadow-[0_0_30px_red] animate-pulse">
            Bomba Plantada
         </div>
      )}
      
      {/* MVP display if applicable (end of round) */}
      {round?.phase === 'over' && (
         <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-neutral-900/90 border border-emerald-500/50 p-6 rounded-xl flex items-center gap-6 shadow-2xl backdrop-blur-md">
            <Trophy className="w-12 h-12 text-yellow-500" />
            <div className="flex flex-col">
               <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest">Fim de Round</span>
               <span className="text-3xl font-black text-white uppercase">Preparando próximo round...</span>
            </div>
         </div>
      )}

      {/* Auto Mode Indicator (Dev only) */}
      {autoMode && (
         <div className="absolute bottom-4 right-4 text-[10px] text-neutral-500 font-mono flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            CS2 GSI AUTO SYNC ACTIVE
         </div>
      )}

    </div>
  );
}
