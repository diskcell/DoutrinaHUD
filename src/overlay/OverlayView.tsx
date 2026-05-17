import { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';

export function OverlayView() {
  const { socket, connected } = useSocket();
  const [hudState, setHudState] = useState<any>(null);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('overlay:ready');

    socket.on('hud:update', (data) => {
      setHudState(data);
    });

    return () => {
      socket.off('hud:update');
    };
  }, [socket, connected]);

  return (
    <div className="w-[1920px] h-[1080px] bg-transparent text-white font-sans relative overflow-hidden">
      {/* Test Background for Development (can be keyed out in OBS or set to transparent) */}
      <div className="absolute inset-0 bg-green-500/10 pointer-events-none flex flex-col items-center justify-center border border-dashed border-green-500/50">
        <p className="text-green-500/50 font-mono text-sm uppercase tracking-widest">OBS Overlay Bounds (1920x1080)</p>
        
        {!connected && (
          <div className="mt-4 px-4 py-2 bg-red-500/80 text-white rounded font-bold text-sm">
            DESCONECTADO DO SERVIDOR
          </div>
        )}

        {hudState && (
          <div className="mt-4 px-4 py-2 bg-black/80 text-white rounded font-mono text-sm">
            DATA: {JSON.stringify(hudState)}
          </div>
        )}
      </div>

      {/* Top Scoreboard Area (Placeholder) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-4 bg-neutral-900/90 border border-neutral-700/50 rounded-lg p-4 flex items-center gap-8 shadow-2xl backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold">TIME A</span>
          <span className="text-4xl font-black text-emerald-500">0</span>
        </div>
        <div className="w-px h-8 bg-neutral-700" />
        <div className="flex flex-col items-center">
          <span className="text-xs text-neutral-400 font-bold tracking-widest">BO3</span>
          <span className="text-lg font-bold">INF</span>
        </div>
        <div className="w-px h-8 bg-neutral-700" />
        <div className="flex items-center gap-4">
          <span className="text-4xl font-black text-emerald-500">0</span>
          <span className="text-2xl font-bold">TIME B</span>
        </div>
      </div>

      {/* Player Stats / Custom HUD items will go here */}
      
    </div>
  );
}
