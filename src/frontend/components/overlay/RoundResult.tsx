import { Trophy } from 'lucide-react';

export function RoundResult({ round, autoMode, gsiState }: any) {
  // Só aparece se a fase do round for 'over'
  if (round?.phase !== 'over') return null;

  const winTeam = round?.win_team; // 'CT' ou 'T'
  const isCTWin = winTeam === 'CT';

  return (
    <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-neutral-950/95 border-b-4 border-white/10 p-8 rounded-2xl flex flex-col items-center shadow-[0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-md z-50 animate-in fade-in zoom-in duration-300">
      <Trophy className={`w-16 h-16 mb-4 ${isCTWin ? 'text-blue-500' : 'text-yellow-500'}`} />
      <span className="text-sm font-bold text-neutral-400 uppercase tracking-[0.3em] mb-2">Fim de Round</span>
      <span className={`text-5xl font-black uppercase tracking-widest ${isCTWin ? 'text-blue-500' : 'text-yellow-500'}`}>
        Vitória dos {isCTWin ? 'Contra-Terroristas' : 'Terroristas'}
      </span>
    </div>
  );
}