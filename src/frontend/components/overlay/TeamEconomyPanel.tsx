import { cn } from '../AdminLayout';
import { motion, AnimatePresence } from 'motion/react';
import { 
  getTeamMoney, 
  getTeamEquipmentValue, 
  getUtilityCounts, 
  getUtilityLevelLabel,
  getLossBonusValue,
  shouldShowEconomyPanel 
} from '../../lib/gsi/economy';
import { UtilitySummary } from './UtilitySummary';

interface TeamEconomyPanelProps {
  players: any[];
  side: 'CT' | 'T';
  isRightSide: boolean;
  phase: any;
  round: any;
  teamData?: any; 
}

export function TeamEconomyPanel({ players, side, isRightSide, phase, round, teamData }: TeamEconomyPanelProps) {
  const isVisible = shouldShowEconomyPanel(phase, round);
  
  if (!players || players.length === 0) return null;

  const totalMoney = getTeamMoney(players);
  const equipValue = getTeamEquipmentValue(players);
  const utility = getUtilityCounts(players);
  const utilityLevel = getUtilityLevelLabel(utility.total);
  
  // CS2 GSI consecutive_round_losses: 0 to 4+
  const streak = teamData?.consecutive_round_losses;
  const lossBonusMoney = getLossBonusValue(streak);
  const activeDots = streak !== undefined ? Math.min(streak, 5) : 0;

  const isCT = side === 'CT';
  const teamColorClass = isCT ? "text-blue-400" : "text-orange-400";
  const teamDotClass = isCT ? "bg-blue-500" : "bg-orange-500";

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, x: isRightSide ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRightSide ? 50 : -50 }}
          className={cn(
            "w-[360px] bg-neutral-950/95 backdrop-blur-2xl border border-white/5 p-4 flex flex-col gap-3 z-30",
            "shadow-[0_25px_50px_rgba(0,0,0,0.6)]",
            isRightSide ? "rounded-l-xl border-r-0" : "rounded-r-xl border-l-0"
          )}
          style={{
            borderLeft: !isRightSide ? `5px solid ${isCT ? '#3b82f6' : '#f97316'}` : undefined,
            borderRight: isRightSide ? `5px solid ${isCT ? '#3b82f6' : '#f97316'}` : undefined,
          }}
        >
          {/* Section 1: Money and Equipment */}
          <div className={cn(
            "flex items-start justify-between",
            isRightSide ? "flex-row-reverse" : "flex-row"
          )}>
            <div className={cn("flex flex-col", isRightSide ? "items-end" : "items-start")}>
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/30">Dinheiro do Time</span>
              <span className={cn("text-3xl font-black tabular-nums leading-none tracking-tighter mt-1", teamColorClass)}>
                ${totalMoney.toLocaleString()}
              </span>
            </div>
            <div className={cn("flex flex-col", isRightSide ? "items-start" : "items-end")}>
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/30">Valor em Equip.</span>
              <span className="text-xl font-black tabular-nums leading-none text-white/80 mt-1">
                ${equipValue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="h-[1px] bg-white/10 w-full" />

          {/* Section 2: Utilities & Loss Bonus */}
          <div className={cn(
            "flex items-center justify-between",
            isRightSide ? "flex-row-reverse" : "flex-row"
          )}>
            {/* Left: Utilities */}
            <div className={cn("flex flex-col gap-2", isRightSide ? "items-end text-right" : "items-start text-left")}>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/30">Utilitários</span>
                <span className={cn(
                  "text-[10px] font-black px-2 py-0.5 rounded uppercase",
                  utilityLevel === 'Ótimo' ? "bg-emerald-500/20 text-emerald-400" : 
                  utilityLevel === 'Médio' ? "bg-yellow-500/20 text-yellow-400" : 
                  "bg-red-500/20 text-red-400"
                )}>
                  {utilityLevel}
                </span>
              </div>
              <UtilitySummary counts={utility} isRightSide={isRightSide} />
            </div>

            {/* Right: Loss Bonus */}
            <div className={cn("flex flex-col gap-1", isRightSide ? "items-start" : "items-end")}>
              <span className="text-[11px] font-black uppercase tracking-[0.15em] text-white/30">Bônus de Derrota</span>
              <span className="text-lg font-black text-white/90 leading-none tabular-nums text-right">
                {lossBonusMoney}
              </span>
              <div className={cn("flex gap-1 mt-1", isRightSide ? "flex-row" : "flex-row-reverse")}>
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div 
                    key={idx}
                    className={cn(
                      "w-3.5 h-1.5 rounded-full transition-all duration-500",
                      idx <= activeDots ? teamDotClass : "bg-white/10"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
