import { motion } from 'motion/react';
import { MVPPanel } from './MVPPanel';
import { cn } from '../AdminLayout';
import { Trophy } from 'lucide-react';

interface MatchEndBannerProps {
  map: any;
  players: any[];
  match: any;
}

export function MatchEndBanner({ map, players, match }: MatchEndBannerProps) {
  const isGameOver = map?.phase === 'gameover';
  if (!isGameOver) return null;

  const sortedPlayers = [...players].sort((a, b) => {
    const statsA = a.match_stats?.kills || 0;
    const statsB = b.match_stats?.kills || 0;
    return statsB - statsA;
  });

  const matchMvp = sortedPlayers[0];
  if (!matchMvp) return null;

  const isCTWinner = matchMvp.team === 'CT';

  const teamHome = match.teamHome || { name: 'Time A', logo: '' };
  const teamAway = match.teamAway || { name: 'Time B', logo: '' };
  const winningTeam = matchMvp.team === (match.sideHome || 'CT') ? teamHome : teamAway;

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md pointer-events-none">
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex w-[860px] flex-col overflow-hidden rounded-[34px] border border-white/10 bg-neutral-950/92 shadow-[0_48px_110px_rgba(0,0,0,0.92)] backdrop-blur-2xl"
      >
        <div className={cn('absolute inset-0 opacity-[0.08] blur-[110px]', isCTWinner ? 'bg-blue-600' : 'bg-orange-600')} />

        <div className="relative z-10 flex items-center justify-between border-b border-white/5 bg-white/[0.025] px-9 py-5">
          <div className="flex items-center gap-5 min-w-0">
            <div
              className={cn(
                'grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-white/10',
                isCTWinner ? 'bg-blue-600/10' : 'bg-orange-600/10'
              )}
            >
              <Trophy className={cn('h-9 w-9', isCTWinner ? 'text-blue-400' : 'text-orange-400')} />
            </div>

            <div className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.55em] text-white/35">
                VENCEDOR DA PARTIDA
              </span>
              <span
                className={cn(
                  'mt-1 block truncate text-[48px] font-black uppercase italic leading-none tracking-[-0.07em] drop-shadow-xl',
                  isCTWinner ? 'text-blue-500' : 'text-orange-500'
                )}
              >
                {winningTeam.name}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">
            DOUTRINA HUD
          </span>
        </div>

        <div className="relative z-20 flex justify-center px-8 py-7">
          <MVPPanel
            type="match"
            mvp={matchMvp}
            side={matchMvp.team as 'CT' | 'T'}
            team={winningTeam}
          />
        </div>
      </motion.div>
    </div>
  );
}
