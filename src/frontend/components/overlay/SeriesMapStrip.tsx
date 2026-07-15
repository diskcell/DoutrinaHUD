import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../AdminLayout';

interface SeriesMapStripProps {
  series: {
    format: string;
    scoreHome: number;
    scoreAway: number;
    maps: any[];
  } | null;
  teamHome?: any;
  teamAway?: any;
}

export function SeriesMapStrip({ series, teamHome, teamAway }: SeriesMapStripProps) {
  if (!series || !series.maps || series.maps.length === 0) return null;

  // Filter out bans if desired, or show them differently. 
  // Professional broadcast usually shows the picks and decider prominently.
  const displayMaps = series.maps.filter(m => m.type !== 'ban');
  const banMaps = series.maps.filter(m => m.type === 'ban');

  return (
    <div className="absolute top-[440px] left-6 z-40 flex flex-col gap-4 max-w-[350px]">
      
      {/* Series Info Header */}
      <div className="flex items-center gap-3 bg-neutral-950/90 backdrop-blur-xl border border-white/10 rounded-lg px-4 py-2 shadow-2xl self-start">
        <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none">Série</span>
          <span className="text-sm font-black text-white uppercase tracking-tighter italic">
            {series.format === 'BO1' ? 'Melhor de 1' : series.format === 'BO3' ? 'Melhor de 3' : 'Melhor de 5'}
          </span>
        </div>
        <div className="ml-4 flex items-center gap-3">
          <div className="flex items-center gap-1.5">
             <span className="text-xl font-black text-white tabular-nums">{series.scoreHome}</span>
             <span className="text-[10px] font-bold text-neutral-500">:</span>
             <span className="text-xl font-black text-white tabular-nums">{series.scoreAway}</span>
          </div>
        </div>
      </div>

      {/* Map Strip */}
      <div className="flex flex-col gap-2">
        <AnimatePresence mode="popLayout">
          {displayMaps.map((map, idx) => {
            const isFinished = map.status === 'finished';
            const isLive = map.status === 'live';
            const isPending = map.status === 'pending';
            
            const pickTeamName = map.pickedBy === 'home' ? (teamHome?.tag || teamHome?.name || 'HOME') : (teamAway?.tag || teamAway?.name || 'AWAY');
            const hasWinner = map.winner && map.winner !== 'none';
            const winnerIsHome = map.winner === 'home';

            return (
              <motion.div
                key={map.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className={cn(
                  "flex items-stretch bg-neutral-900/90 backdrop-blur-xl border border-white/5 rounded-lg overflow-hidden shadow-lg transition-all",
                  isLive ? "border-emerald-500/50 ring-1 ring-emerald-500/20 scale-105 ml-2" : "opacity-90"
                )}
              >
                {/* Status Indicator */}
                <div className={cn(
                  "w-1.5 self-stretch",
                  isLive ? "bg-emerald-500 animate-pulse" : isFinished ? "bg-neutral-700" : "bg-neutral-800"
                )} />

                <div className="flex-1 flex flex-col px-4 py-2 justify-center">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[8px] font-black uppercase tracking-[0.2em]",
                      isLive ? "text-emerald-400" : "text-white/30"
                    )}>
                      {isLive ? 'AO VIVO' : map.type === 'decider' ? 'DECISOR' : `PICK ${pickTeamName}`}
                    </span>
                    {isFinished && (
                      <span className="text-[10px] font-black text-emerald-500 italic">VENCEU</span>
                    )}
                  </div>
                  
                  <span className={cn(
                    "text-lg font-black uppercase tracking-tighter italic leading-tight",
                    isFinished ? "text-white/60" : "text-white"
                  )}>
                    {map.name}
                  </span>
                </div>

                {/* Score / Result Area */}
                <div className={cn(
                  "px-4 flex items-center justify-center border-l border-white/5 min-w-[80px]",
                  isLive ? "bg-emerald-500/10" : "bg-black/20"
                )}>
                  {isFinished ? (
                    <div className="flex items-center gap-1.5">
                      <span className={cn("text-lg font-black tabular-nums", winnerIsHome ? "text-white" : "text-white/30")}>{map.scoreHome}</span>
                      <span className="text-[10px] font-bold text-neutral-600">:</span>
                      <span className={cn("text-lg font-black tabular-nums", !winnerIsHome ? "text-white" : "text-white/30")}>{map.scoreAway}</span>
                    </div>
                  ) : isLive ? (
                    <div className="flex flex-col items-center">
                       <span className="text-[8px] font-black text-emerald-500 animate-pulse uppercase">Live</span>
                       <span className="text-lg font-black text-white">EM JOGO</span>
                    </div>
                  ) : (
                    <span className="text-[10px] font-black text-white/20 uppercase">Pendente</span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Bans Summary (Optional, very compact) */}
      {banMaps.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5">
           <span className="text-[7px] font-black text-white/20 uppercase tracking-widest w-full">Mapas Banidos</span>
           {banMaps.map(m => (
             <div key={m.id} className="px-2 py-0.5 bg-neutral-950/50 rounded border border-white/5 flex items-center gap-2">
               <span className="text-[8px] font-black text-white/40 uppercase line-through">{m.name}</span>
             </div>
           ))}
        </div>
      )}
    </div>
  );
}
