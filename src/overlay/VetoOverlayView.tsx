import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSocket } from '../context/SocketContext';
import { cn } from '../frontend/components/AdminLayout';

const MAP_ASSETS: Record<string, string> = {
  'Ancient': 'de_ancient',
  'Anubis': 'de_anubis',
  'Dust2': 'de_dust2',
  'Inferno': 'de_inferno',
  'Mirage': 'de_mirage',
  'Nuke': 'de_nuke',
  'Overpass': 'de_overpass',
};

const getMapThumb = (mapName: string) => {
  const folder = MAP_ASSETS[mapName] || 'de_mirage';
  const EXTENSIONS: Record<string, string> = {
    'Ancient': 'jpg',
    'Anubis': 'jpg',
    'Dust2': 'jpg',
    'Inferno': 'jpg',
    'Mirage': 'webp',
    'Nuke': 'jpg',
    'Overpass': 'webp',
  };
  const ext = EXTENSIONS[mapName] || 'png';
  return `/maps/${folder}/veto.${ext}`;
};

export function VetoOverlayView() {
  const { socket, connected } = useSocket();
  const [hudState, setHudState] = useState<any>(null);

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('overlay:ready');

    const handleHud = (data: any) => {
      setHudState(data);
    };

    socket.on('hud:update', handleHud);
    return () => {
      socket.off('hud:update', handleHud);
    };
  }, [socket, connected]);

  const veto = hudState?.match?.veto;
  const match = hudState?.match || {};

  if (!veto || !veto.isActive) {
    return (
      <div className="w-[1920px] h-[1080px] bg-neutral-950 flex items-center justify-center">
         <div className="text-center space-y-4">
            <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <span className="text-xl font-black text-white uppercase tracking-[0.3em]">Aguardando Início do Veto</span>
         </div>
      </div>
    );
  }

  const teamLeft = match.teamHome || { name: 'TIME ESQUERDA', tag: 'LEFT', logo: '' };
  const teamRight = match.teamAway || { name: 'TIME DIREITA', tag: 'RIGHT', logo: '' };

  const revealedActions = veto.revealedActions || [];
  const currentRevealId = veto.currentRevealId;

  const mapActions = revealedActions.filter((a: any) => a.action === 'ban' || a.action === 'pick' || a.action === 'decider');

  return (
    <div className="w-[1920px] h-[1080px] bg-neutral-950 text-white font-sans relative overflow-hidden flex flex-col p-12">
      
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-900 via-transparent to-orange-900" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[1200px] border border-white/5 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between relative z-10 mb-8">
         {/* Team Left */}
         <div className="flex items-center gap-6 flex-1">
            <div className="w-28 h-28 bg-neutral-900 border-4 border-blue-600 rounded-3xl flex items-center justify-center p-4 shadow-[0_0_50px_rgba(37,99,235,0.2)]">
               {teamLeft.logo ? <img src={teamLeft.logo} className="w-full h-full object-contain" /> : <span className="text-4xl font-black text-white/20">A</span>}
            </div>
            <div className="flex flex-col">
               <span className="text-4xl font-black italic tracking-tighter uppercase">{teamLeft.name}</span>
               <span className="text-base font-bold text-blue-500 uppercase tracking-[0.4em]">Time da Esquerda</span>
            </div>
         </div>

         {/* Center Info */}
         <div className="flex flex-col items-center gap-1 px-10 text-center">
            <div className="px-5 py-1.5 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-[0.4em] shadow-lg mb-1">Veto de Mapas</div>
            <span className="text-5xl font-black tracking-tighter uppercase italic">{match.stage || 'Partida'}</span>
            <span className="text-lg font-bold text-white/40 uppercase tracking-[0.3em]">{veto.format === 'BO1' ? 'Melhor de 1' : 'Melhor de 3'}</span>
         </div>

         {/* Team Right */}
         <div className="flex items-center gap-6 flex-1 justify-end text-right">
            <div className="flex flex-col">
               <span className="text-4xl font-black italic tracking-tighter uppercase">{teamRight.name}</span>
               <span className="text-xl font-bold text-orange-500 uppercase tracking-[0.4em]">Time da Direita</span>
            </div>
            <div className="w-28 h-28 bg-neutral-900 border-4 border-orange-600 rounded-3xl flex items-center justify-center p-4 shadow-[0_0_50px_rgba(234,88,12,0.2)]">
               {teamRight.logo ? <img src={teamRight.logo} className="w-full h-full object-contain" /> : <span className="text-4xl font-black text-white/20">B</span>}
            </div>
         </div>
      </div>

      {/* Map Actions Grid */}
      <div className="flex flex-wrap items-center justify-center gap-4 flex-1 relative z-10 px-10">
        <AnimatePresence mode="popLayout">
          {mapActions.map((action: any) => {
            const isCurrent = action.id === currentRevealId;
            const actionLabel = action.action === 'ban' ? 'BANIDO' : action.action === 'decider' ? 'DECISOR' : 'ESCOLHA';
            const teamSide = action.teamSide;
            const teamColor = teamSide === 'left' ? 'text-blue-500' : 'text-orange-500';
            const teamBg = teamSide === 'left' ? 'bg-blue-600' : 'bg-orange-600';
            const teamName = teamSide === 'left' ? teamLeft.tag : teamRight.tag;

            const mapNames = action.mapNames || [action.mapName];

            return mapNames.map((mapName: string, subIdx: number) => (
              <motion.div 
                key={`${action.id}_${mapName}`}
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: isCurrent ? 1.05 : 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25, delay: subIdx * 0.1 }}
                layout
                className={cn(
                  "relative w-[190px] aspect-[3/4] rounded-3xl overflow-hidden border-4 transition-all duration-700 group shadow-2xl",
                  isCurrent ? "border-white shadow-[0_0_80px_rgba(255,255,255,0.3)] z-20" : 
                  action.action === 'ban' ? "border-red-600/30 opacity-60" : 
                  action.action === 'decider' ? "border-amber-500/50" : "border-emerald-500/50"
                )}
              >
                <div className="absolute inset-0 bg-neutral-900">
                  <img src={getMapThumb(mapName)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </div>

                <div className="absolute inset-0 flex flex-col justify-end p-4 gap-1">
                   <span className="text-lg font-black uppercase tracking-tighter italic drop-shadow-2xl">{mapName}</span>
                   
                   <div className="flex flex-col">
                      <div className={cn(
                        "self-start px-2 py-0.5 rounded text-[7px] font-black uppercase tracking-widest text-white shadow-lg",
                        action.action === 'ban' ? "bg-red-600" : action.action === 'decider' ? "bg-amber-500" : teamBg
                      )}>
                        {actionLabel} {action.mapNumber ? `M${action.mapNumber}` : ''}
                      </div>
                      {action.action !== 'decider' && (
                        <span className={cn("text-[7px] font-black uppercase tracking-widest mt-1", teamColor)}>
                          POR {teamName}
                        </span>
                      )}
                   </div>
                </div>

                {action.action === 'ban' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-950/20">
                     <div className="w-20 h-[3px] bg-red-600 rotate-45 absolute opacity-60" />
                     <div className="w-20 h-[3px] bg-red-600 -rotate-45 absolute opacity-60" />
                  </div>
                )}

                {isCurrent && (
                  <motion.div 
                    animate={{ opacity: [0.2, 0.4, 0.2] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute inset-0 bg-white shadow-[inset_0_0_100px_rgba(255,255,255,0.2)] pointer-events-none"
                  />
                )}
              </motion.div>
            ));
          })}
        </AnimatePresence>
      </div>

      <div className="mt-6 relative z-10 flex flex-col items-center">
         <div className="flex items-center gap-4 mb-3">
            <div className="h-[1px] w-20 bg-white/10" />
            <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em]">Resumo da Série</span>
            <div className="h-[1px] w-20 bg-white/10" />
         </div>
         
         <div className="flex flex-wrap justify-center gap-4">
            {veto.selectedMaps && veto.selectedMaps.map((m: any) => {
              const isDecider = m.pickedBy === 'decider';
              const pickTeam = m.pickedBy === 'left' ? teamLeft : m.pickedBy === 'right' ? teamRight : null;
              const sideTeam = m.startingSide ? (m.sideChoiceBy === 'left' ? teamLeft : teamRight) : null;

              return (
                <motion.div 
                 key={m.mapName} 
                 initial={{ scale: 0.8, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 className="bg-neutral-900/90 backdrop-blur-xl border border-white/20 rounded-2xl flex flex-col overflow-hidden shadow-2xl min-w-[340px]"
                >
                   <div className={cn("h-1.5 w-full", isDecider ? "bg-amber-500" : m.pickedBy === 'left' ? "bg-blue-600" : "bg-orange-600")} />
                   <div className="p-5 flex items-center justify-between gap-8">
                     <div className="flex flex-col">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                          {isDecider ? 'MAPA DECISOR' : `PICK DE ${pickTeam?.tag}`}
                        </span>
                        <span className="text-3xl font-black uppercase italic tracking-tighter">{m.mapName}</span>
                     </div>
                     <div className="flex flex-col items-end">
                        <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Lado Inicial</span>
                        <span className={cn(
                          "text-base font-black uppercase tracking-tighter italic",
                          m.startingSide === 'CT' ? "text-blue-500" : m.startingSide === 'TR' ? "text-orange-500" : "text-neutral-500"
                        )}>
                          {m.startingSide 
                            ? `${m.startingSide} (${m.sideChoiceBy === 'left' ? teamLeft.tag : teamRight.tag})` 
                            : (m.sideChoiceBy === 'knife' 
                                ? 'Knife Round' 
                                : (m.sideChoiceBy === 'left' ? `Escolha ${teamLeft.tag}` : m.sideChoiceBy === 'right' ? `Escolha ${teamRight.tag}` : 'Sorteio')
                              )
                          }
                        </span>
                     </div>
                   </div>
                </motion.div>
              );
            })}
            {(!veto.selectedMaps || veto.selectedMaps.length === 0) && (
              <span className="text-sm font-black text-white/10 uppercase italic tracking-widest">Aguardando definições da série...</span>
            )}
         </div>
      </div>
    </div>
  );
}
