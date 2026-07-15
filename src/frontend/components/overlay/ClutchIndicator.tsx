import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../AdminLayout';
import { 
  getAliveCountBySide, 
  getClutchState, 
  getPostPlantContext, 
  shouldShowIndicator 
} from '../../lib/gsi/aliveSituation';

interface ClutchIndicatorProps {
  players: any[];
  round: any;
  bomb: any;
  phase: any;
}

export function ClutchIndicator({ players, round, bomb, phase }: ClutchIndicatorProps) {
  const isBombActive = bomb && (bomb.state === 'planted' || bomb.state === 'defusing');
  const isRoundOver = round && round.phase === 'over';

  if (!shouldShowIndicator(round, phase) || isBombActive || isRoundOver) return null;

  const counts = getAliveCountBySide(players);
  const clutch = getClutchState(players);
  
  // Only show if there's an advantage/disadvantage OR a clutch
  // Both teams must have at least one player
  const isAdvantage = counts.ct !== counts.t && counts.ct > 0 && counts.t > 0;
  const is1v1 = counts.ct === 1 && counts.t === 1;
  
  if (!isAdvantage && !clutch.isClutch && !is1v1) return null;

  // Decide what primary label to show
  let mainLabel = `${counts.ct}v${counts.t}`;
  let subLabel = '';
  let accentColor = 'bg-white/20';
  let isClutchActive = false;

  if (clutch.isClutch) {
    mainLabel = `CLUTCH 1v${clutch.opponentCount}`;
    subLabel = clutch.clutchPlayer?.name ? `ÚLTIMO VIVO — ${clutch.clutchPlayer.name}` : 'ÚLTIMO VIVO';
    accentColor = clutch.side === 'CT' ? 'bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.3)]' : 'bg-orange-600 shadow-[0_0_15px_rgba(234,88,12,0.3)]';
    isClutchActive = true;
  } else if (isAdvantage) {
    const isCTAdvantage = counts.ct > counts.t;
    const lastAliveTeam = counts.ct === 1 ? 'CT' : counts.t === 1 ? 'T' : null;
    
    subLabel = isCTAdvantage ? 'VANTAGEM CT' : 'VANTAGEM TR';
    
    if (lastAliveTeam) {
      const lastPlayer = players.find(p => p.team === lastAliveTeam && (p.state?.health ?? 0) > 0);
      subLabel = lastPlayer ? `ÚLTIMO VIVO — ${lastPlayer.name}` : 'ÚLTIMO VIVO';
    }
    
    accentColor = isCTAdvantage ? 'bg-blue-600/80' : 'bg-orange-600/80';
  } else if (is1v1) {
    mainLabel = 'DUELO 1v1';
    subLabel = 'ÚLTIMOS VIVOS';
    accentColor = 'bg-white/40';
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${mainLabel}-${subLabel}`}
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        className="absolute top-[155px] left-1/2 -translate-x-1/2 z-40 flex flex-col items-center"
      >
        <div className="relative">
          {/* Compact Banner */}
          <div className={cn(
            "flex items-center bg-neutral-950/95 backdrop-blur-2xl border border-white/5 rounded shadow-[0_15px_40px_rgba(0,0,0,0.6)]",
            isClutchActive ? "min-w-[220px]" : "min-w-[140px]"
          )}>
            {/* Side Accent */}
            <div className={cn("w-1 self-stretch", accentColor)} />
            
            <div className="flex flex-col px-4 py-1.5 items-center justify-center w-full">
              <span className={cn(
                "font-black italic tracking-tighter tabular-nums leading-none text-white",
                isClutchActive ? "text-xl" : "text-lg"
              )}>
                {mainLabel}
              </span>
              
              {subLabel && (
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-white/40 mt-0.5 truncate max-w-[180px]">
                  {subLabel}
                </span>
              )}
            </div>
          </div>

          {/* Background Glow for Clutch */}
          {isClutchActive && (
            <motion.div 
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={cn("absolute -inset-2 rounded-xl blur-xl -z-10", accentColor)} 
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
