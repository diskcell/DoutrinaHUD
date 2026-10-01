import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../AdminLayout';
import { parseBombState } from '../../lib/gsi/bombState';

interface BombStateBannerProps {
  gsiState: any;
  players: any[];
}

export function BombStateBanner({ gsiState, players }: BombStateBannerProps) {
  const { status, countdown, defuserPlayer, defuseProgress, hasKit } = parseBombState(gsiState, players);
  
  // Local estimated timer if real countdown is missing
  const [localTimer, setLocalTimer] = useState<number | null>(null);

  useEffect(() => {
    if (status === 'planted' && countdown === null) {
      if (localTimer === null) {
        setLocalTimer(40.0);
      } else {
        const interval = setInterval(() => {
          setLocalTimer(prev => {
            if (prev === null) return null;
            const next = prev - 0.1;
            return next > 0 ? next : 0;
          });
        }, 100);
        return () => clearInterval(interval);
      }
    } else if (status !== 'planted' && status !== 'defusing') {
      setLocalTimer(null);
    }
  }, [status, countdown, localTimer]);

  const displayTime = countdown !== null ? countdown : localTimer;

  // Format time: 1 decimal if < 10, else integer
  const formattedTime = displayTime !== null 
    ? (displayTime < 10 ? displayTime.toFixed(1) : Math.ceil(displayTime).toString())
    : '--';

  // Visibility Logic
  if (status === 'idle' || status === 'planting') return null;

  const isPlanted = status === 'planted';
  const isDefusing = status === 'defusing';
  const isDropped = status === 'dropped';
  const isDefused = status === 'defused';
  const isExploded = status === 'exploded';

  return (
    <div className="absolute top-[420px] left-6 z-40 flex flex-col items-start pointer-events-none">
      <AnimatePresence mode="wait">
        
        {/* BOMB PLANTED OR DEFUSING */}
        {(isPlanted || isDefusing) && (
          <motion.div
            key="active-bomb"
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -50, opacity: 0 }}
            className={cn(
              "w-[340px] h-[58px] bg-neutral-950/95 backdrop-blur-2xl border flex items-center relative overflow-hidden shadow-[0_20px_40px_rgba(0,0,0,0.8)] rounded-r-lg",
              isDefusing ? "border-blue-500/50 border-l-0" : "border-red-600/50 border-l-0"
            )}
          >
            {/* Background animated pulse */}
            <motion.div 
              animate={{ opacity: isDefusing ? [0.1, 0.2, 0.1] : (displayTime && displayTime < 10 ? [0.2, 0.4, 0.2] : [0.1, 0.2, 0.1]) }}
              transition={{ repeat: Infinity, duration: isDefusing ? 1 : (displayTime && displayTime < 10 ? 0.4 : 1) }}
              className={cn(
                "absolute inset-0 blur-xl",
                isDefusing ? "bg-blue-600" : "bg-red-600"
              )}
            />

            {/* Left side: Icon and Label */}
            <div className="flex items-center gap-3 px-4 relative z-10 flex-1 min-w-0">
              <img 
                src={isDefusing ? "./icons/cs2/defuser.svg" : "./icons/cs2/c4.svg"}
                className={cn(
                  "w-7 h-7 drop-shadow-md shrink-0",
                  isDefusing ? "brightness-0 invert" : "animate-pulse"
                )} 
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <div className="flex flex-col min-w-0">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-[0.3em] mb-0.5 truncate",
                  isDefusing ? "text-blue-400" : "text-red-400"
                )}>
                  {isDefusing ? 'Defusando' : 'Sistema de C4'}
                </span>
                <span className="text-[17px] font-black text-white uppercase tracking-tighter italic leading-none drop-shadow-md truncate">
                  {isDefusing ? (defuserPlayer ? defuserPlayer.name : 'Desarmando...') : 'Bomba Plantada'}
                </span>
              </div>
            </div>

            {/* Right side: Timer / Kit Info */}
            <div className={cn(
              "h-full flex items-center justify-center px-6 shrink-0 relative z-10 border-l border-white/10",
              isDefusing ? "bg-blue-600/20" : "bg-red-600/20"
            )}>
              {isDefusing ? (
                <div className="flex flex-col items-center">
                  <span className="text-xl font-black text-white tabular-nums drop-shadow-md leading-none">
                    {formattedTime}s
                  </span>
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-widest mt-1",
                    hasKit ? "text-emerald-400" : "text-red-400"
                  )}>
                    {hasKit ? 'KIT' : 'SEM KIT'}
                  </span>
                </div>
              ) : (
                <span className={cn(
                  "text-3xl font-black tabular-nums drop-shadow-lg leading-none",
                  displayTime && displayTime < 10 ? "text-red-500 animate-pulse" : "text-white"
                )}>
                  {formattedTime}
                </span>
              )}
            </div>

            {/* Defuse Progress Bar Overlay */}
            {isDefusing && defuseProgress !== null && (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${defuseProgress}%` }}
                className="absolute bottom-0 left-0 h-1.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] z-20"
              />
            )}
            {/* Indeterminate Defuse Bar */}
            {isDefusing && defuseProgress === null && (
              <motion.div 
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="absolute bottom-0 left-0 w-1/2 h-1.5 bg-blue-500/50 blur-sm z-20"
              />
            )}
          </motion.div>
        )}

        {/* BOMB DROPPED */}
        {isDropped && (
          <motion.div
            key="dropped-bomb"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            className="px-6 py-2 bg-neutral-950/90 backdrop-blur-md border border-yellow-500/30 rounded-full flex items-center gap-3 shadow-lg"
          >
            <img src="./icons/cs2/c4.svg" className="w-4 h-4 opacity-70" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <span className="text-xs font-black text-yellow-500 uppercase tracking-widest">C4 Dropada</span>
          </motion.div>
        )}

        {/* ROUND END BOMB EVENTS (Defused / Exploded) */}
        {(isDefused || isExploded) && (
          <motion.div
            key="end-bomb"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={cn(
              "px-10 py-4 bg-neutral-950/95 backdrop-blur-xl border-y-4 shadow-2xl flex items-center gap-4",
              isDefused ? "border-blue-500 shadow-[0_10px_40px_rgba(59,130,246,0.3)]" : "border-red-600 shadow-[0_10px_40px_rgba(220,38,38,0.3)]"
            )}
          >
            <img 
              src={isDefused ? "./icons/cs2/defuser.svg" : "./icons/cs2/c4.svg"}
              className={cn("w-10 h-10", isDefused ? "brightness-0 invert drop-shadow-md" : "drop-shadow-lg")} 
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <span className={cn(
              "text-3xl font-black uppercase tracking-tighter italic drop-shadow-lg",
              isDefused ? "text-blue-400" : "text-red-500"
            )}>
              {isDefused ? 'Bomba Desarmada' : 'Bomba Explodiu'}
            </span>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
