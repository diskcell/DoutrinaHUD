import { Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function RoundResult({ round, autoMode, gsiState }: any) {
  // Só aparece se a fase do round for 'over'
  if (round?.phase !== 'over') return null;

  const winTeam = round?.win_team; // 'CT' ou 'T'
  const isCTWin = winTeam === 'CT';

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: -50, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: -20, opacity: 0, scale: 0.95 }}
        className="absolute top-1/4 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center"
      >
        {/* Decorative Top Glow */}
        <div className={`w-64 h-1 blur-2xl absolute -top-4 ${isCTWin ? 'bg-blue-500' : 'bg-orange-500'}`} />

        <div className="bg-neutral-950/90 backdrop-blur-2xl border border-white/10 px-12 py-6 rounded-xl shadow-[0_40px_80px_rgba(0,0,0,0.9)] flex flex-col items-center relative overflow-hidden">
          {/* Subtle Shine Effect */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <div className="flex items-center gap-6">
            <Trophy className={`w-10 h-10 ${isCTWin ? 'text-blue-400' : 'text-orange-400'} drop-shadow-[0_0_15px_rgba(0,0,0,0.5)]`} />
            
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.5em] mb-1">
                VENCEDOR DA RODADA
              </span>
              <span className={`text-4xl font-black uppercase tracking-tighter italic ${isCTWin ? 'text-blue-500' : 'text-orange-500'} drop-shadow-sm`}>
                {isCTWin ? 'Contraterroristas' : 'Terroristas'}
              </span>
            </div>
          </div>
        </div>

        {/* Victory Accent Bar */}
        <div className={`h-1 w-full rounded-b-xl ${isCTWin ? 'bg-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'bg-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.5)]'}`} />
      </motion.div>
    </AnimatePresence>
  );
}