import { motion } from 'motion/react';
import { detectRoundMvp } from '../../lib/gsi/roundMvp';
import { MVPPanel } from './MVPPanel';
import { cn } from '../AdminLayout';

interface RoundEndBannerProps {
  round: any;
  players: any[];
  match: any;
  gsiState: any;
}

export function RoundEndBanner({ round, players, match, gsiState }: RoundEndBannerProps) {
  const isOver = round?.phase === 'over';
  if (!isOver) return null;

  const winningSide = round?.win_team;
  if (!winningSide) return null;

  const isCTWin = winningSide === 'CT';
  const sideHome = match.sideHome || 'CT';

  const teamHome = match.teamHome || { name: 'Time A', logo: '' };
  const teamAway = match.teamAway || { name: 'Time B', logo: '' };

  const winningTeam = sideHome === winningSide ? teamHome : teamAway;
  const mvpResult = detectRoundMvp(players, winningSide);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none pb-10">
      <motion.div
        initial={{ scale: 0.97, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 14 }}
        transition={{ type: 'spring', damping: 24, stiffness: 210 }}
        className="relative flex w-[780px] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-neutral-950/90 shadow-[0_42px_90px_rgba(0,0,0,0.9)] backdrop-blur-2xl"
      >
        <div
          className={cn(
            'absolute inset-0 opacity-[0.07] blur-[90px]',
            isCTWin ? 'bg-blue-600' : 'bg-orange-600'
          )}
        />

        {/* Winner Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-white/5 bg-white/[0.025] px-8 py-4">
          <div className="flex items-center gap-5 min-w-0">
            {winningTeam.logo ? (
              <div className="relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/95 p-2 shadow-2xl">
                <img src={winningTeam.logo} alt="Winner Logo" className="h-full w-full object-contain" />
              </div>
            ) : (
              <div
                className={cn(
                  'grid h-14 w-14 shrink-0 place-items-center rounded-2xl border border-white/10',
                  isCTWin ? 'bg-blue-600/10' : 'bg-orange-600/10'
                )}
              >
                <span className={cn('text-xl font-black', isCTWin ? 'text-blue-500' : 'text-orange-500')}>
                  {winningSide}
                </span>
              </div>
            )}

            <div className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-[0.5em] text-white/35">
                RODADA VENCIDA
              </span>
              <span
                className={cn(
                  'mt-1 block truncate text-[40px] font-black uppercase italic leading-none tracking-[-0.06em] drop-shadow-xl',
                  isCTWin ? 'text-blue-500' : 'text-orange-500'
                )}
              >
                {winningTeam.name}
              </span>
            </div>
          </div>

          <span
            className={cn(
              'pointer-events-none absolute right-8 select-none text-7xl font-black italic opacity-[0.035]',
              isCTWin ? 'text-blue-500' : 'text-orange-500'
            )}
          >
            {winningSide}
          </span>
        </div>

        {mvpResult && (
          <div className="relative z-20 flex justify-center px-7 py-6">
            <MVPPanel
              type="round"
              mvp={mvpResult.player}
              specialTag={mvpResult.specialTag}
              side={winningSide}
              team={winningTeam}
            />
          </div>
        )}
      </motion.div>
    </div>
  );
}
