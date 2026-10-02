import { motion } from 'motion/react';
import { Star, Trophy } from 'lucide-react';
import { detectRoundMvp } from '../../lib/gsi/roundMvp';
import { cn } from '../AdminLayout';
import { PlayerPortrait } from './PlayerPortrait';

interface RoundEndBannerProps {
  round: any;
  players: any[];
  match: any;
  gsiState: any;
}

function normalizeSide(side: unknown): 'CT' | 'T' {
  return side === 'T' || side === 'TR' ? 'T' : 'CT';
}

function getTeamForSide(match: any, side: 'CT' | 'T') {
  const leftSide = normalizeSide(match?.sideHome);
  return leftSide === side
    ? match?.teamHome || null
    : match?.teamAway || null;
}

export function RoundEndBanner({ round, players, match, gsiState }: RoundEndBannerProps) {
  const isOver = round?.phase === 'over';
  const winningSide = normalizeSide(round?.win_team);

  if (!isOver || !round?.win_team) return null;

  const winningTeam = getTeamForSide(match, winningSide) || {
    name: winningSide === 'CT' ? 'CONTRATERRORISTAS' : 'TERRORISTAS',
    logo: '',
  };
  const mvpResult = detectRoundMvp(players, winningSide);
  const mvp = mvpResult?.player || null;
  const mvpSide = normalizeSide(mvp?.team);
  const mvpTeam = mvp ? getTeamForSide(match, mvpSide) : null;
  const isWinnerCT = winningSide === 'CT';
  const isMvpCT = mvpSide === 'CT';
  const mvpIsFromWinningTeam = mvpSide === winningSide;
  const roundNumber = Number(gsiState?.map?.round ?? 0) + 1;
  const roundStats = mvp?.state || {};

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/25 backdrop-blur-[2px] pointer-events-none">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 28 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.97, opacity: 0, y: 18 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        className="relative h-[380px] w-[1020px] overflow-hidden rounded-[34px] border border-white/10 bg-[#08090c]/95 shadow-[0_48px_120px_rgba(0,0,0,0.92)] backdrop-blur-3xl"
      >
        <div className={cn(
          'absolute -left-28 top-2 h-[430px] w-[430px] rounded-full opacity-20 blur-[120px]',
          isWinnerCT ? 'bg-blue-500' : 'bg-orange-500',
        )} />
        <div className={cn(
          'absolute -right-28 top-10 h-[390px] w-[390px] rounded-full opacity-15 blur-[120px]',
          isMvpCT ? 'bg-blue-500' : 'bg-orange-500',
        )} />

        <div className="relative z-20 flex h-[52px] items-center justify-between border-b border-white/[0.07] bg-white/[0.025] px-7">
          <div className="flex items-center gap-3">
            <span className={cn(
              'h-2 w-2 rounded-full shadow-[0_0_16px_currentColor]',
              isWinnerCT ? 'bg-blue-400 text-blue-400' : 'bg-orange-400 text-orange-400',
            )} />
            <span className="text-[11px] font-black uppercase tracking-[0.42em] text-white/60">
              RODADA {roundNumber} ENCERRADA
            </span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-[0.4em] text-white/25">
            DOUTRINA HUD
          </span>
        </div>

        <div className="relative z-10 grid h-[328px] grid-cols-[360px_1fr]">
          <section className="relative flex flex-col items-center justify-center overflow-hidden border-r border-white/[0.08] px-7 text-center">
            <span className={cn(
              'absolute -bottom-14 -left-5 select-none text-[210px] font-black italic leading-none opacity-[0.035]',
              isWinnerCT ? 'text-blue-400' : 'text-orange-400',
            )}>
              {winningSide === 'CT' ? 'CT' : 'TR'}
            </span>

            <div className={cn(
              'mb-3 flex items-center gap-2 rounded-full border px-3 py-1.5',
              isWinnerCT
                ? 'border-blue-400/30 bg-blue-500/10 text-blue-300'
                : 'border-orange-400/30 bg-orange-500/10 text-orange-300',
            )}>
              <Trophy className="h-3.5 w-3.5" />
              <span className="text-[9px] font-black uppercase tracking-[0.26em]">
                {winningSide === 'CT' ? 'CT VENCEU' : 'TR VENCEU'}
              </span>
            </div>

            {winningTeam.logo ? (
              <img
                src={winningTeam.logo}
                alt={winningTeam.name}
                className="h-[126px] w-[160px] object-contain drop-shadow-[0_18px_28px_rgba(0,0,0,0.8)]"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className={cn(
                'grid h-[126px] w-[126px] place-items-center rounded-full border text-4xl font-black',
                isWinnerCT
                  ? 'border-blue-500/30 bg-blue-500/10 text-blue-300'
                  : 'border-orange-500/30 bg-orange-500/10 text-orange-300',
              )}>
                {winningSide === 'CT' ? 'CT' : 'TR'}
              </div>
            )}

            <span className="mt-2 text-[9px] font-black uppercase tracking-[0.38em] text-white/35">
              TIME VENCEDOR
            </span>
            <span className="mt-1 max-w-full truncate text-[35px] font-black uppercase italic leading-none tracking-[-0.055em] text-white drop-shadow-xl">
              {winningTeam.name}
            </span>
            <div className={cn(
              'mt-4 h-1 w-24 rounded-full',
              isWinnerCT ? 'bg-blue-500' : 'bg-orange-500',
            )} />
          </section>

          <section className="relative overflow-hidden">
            {mvp ? (
              <>
                <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between px-7 pt-5">
                  <div>
                    <span className="block text-[9px] font-black uppercase tracking-[0.34em] text-white/30">
                      DESTAQUE INDIVIDUAL
                    </span>
                    <span className={cn(
                      'mt-1 block text-[12px] font-black uppercase tracking-[0.28em]',
                      isMvpCT ? 'text-blue-300' : 'text-orange-300',
                    )}>
                      MVP DA RODADA
                    </span>
                  </div>

                  <div className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1.5',
                    isMvpCT
                      ? 'border-blue-400/25 bg-blue-500/10 text-blue-300'
                      : 'border-orange-400/25 bg-orange-500/10 text-orange-300',
                  )}>
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="text-[8px] font-black uppercase tracking-[0.2em]">
                      {mvpIsFromWinningTeam ? 'TIME VENCEDOR' : 'TIME ADVERSÁRIO'}
                    </span>
                  </div>
                </div>

                <PlayerPortrait
                  avatar={mvp.avatar}
                  transparent
                  className="absolute bottom-0 left-1 h-[282px] w-[250px] drop-shadow-[0_20px_28px_rgba(0,0,0,0.85)]"
                />
                <div className={cn(
                  'absolute bottom-0 left-0 h-1.5 w-[250px]',
                  isMvpCT ? 'bg-blue-500' : 'bg-orange-500',
                )} />

                {mvpResult?.specialTag && (
                  <div className={cn(
                    'absolute bottom-5 left-6 z-30 rounded-lg border border-white/15 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-2xl',
                    isMvpCT ? 'bg-blue-600' : 'bg-orange-600',
                  )}>
                    {mvpResult.specialTag}
                  </div>
                )}

                <div className="absolute bottom-0 left-[225px] right-0 top-[68px] z-20 flex flex-col px-6 pb-5 pt-2">
                  <span className="truncate text-[45px] font-black uppercase italic leading-none tracking-[-0.065em] text-white drop-shadow-xl">
                    {mvp.name || mvp.nickname || 'MVP'}
                  </span>

                  <div className="mt-2 flex items-center gap-3">
                    {mvpTeam?.logo && (
                      <img
                        src={mvpTeam.logo}
                        alt={mvpTeam.name}
                        className="h-7 w-8 object-contain"
                      />
                    )}
                    <span className={cn(
                      'truncate text-[12px] font-black uppercase tracking-[0.2em]',
                      isMvpCT ? 'text-blue-300' : 'text-orange-300',
                    )}>
                      {mvpTeam?.name || (mvpSide === 'CT' ? 'CT' : 'TR')}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-[0.24em] text-white/25">
                      {mvpSide === 'CT' ? 'CONTRATERRORISTA' : 'TERRORISTA'}
                    </span>
                  </div>

                  <div className="mt-auto grid grid-cols-3 gap-2.5">
                    <RoundStat
                      label="ABATES"
                      value={roundStats.round_kills || 0}
                      isCT={isMvpCT}
                      highlight
                    />
                    <RoundStat
                      label="HEADSHOTS"
                      value={roundStats.round_killhs || 0}
                      isCT={isMvpCT}
                    />
                    <RoundStat
                      label="DANO"
                      value={roundStats.round_totaldmg || 0}
                      isCT={isMvpCT}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] font-black uppercase tracking-[0.35em] text-white/25">
                MVP NÃO IDENTIFICADO
              </div>
            )}
          </section>
        </div>
      </motion.div>
    </div>
  );
}

function RoundStat({
  label,
  value,
  isCT,
  highlight = false,
}: {
  label: string;
  value: string | number;
  isCT: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      'flex h-[70px] min-w-0 flex-col items-center justify-center rounded-xl border',
      highlight
        ? isCT
          ? 'border-blue-400/30 bg-blue-500/10'
          : 'border-orange-400/30 bg-orange-500/10'
        : 'border-white/[0.08] bg-white/[0.035]',
    )}>
      <span className="text-[8px] font-black uppercase tracking-[0.22em] text-white/30">
        {label}
      </span>
      <span className={cn(
        'mt-1 text-[27px] font-black leading-none tabular-nums',
        highlight
          ? isCT ? 'text-blue-300' : 'text-orange-300'
          : 'text-white',
      )}>
        {value}
      </span>
    </div>
  );
}
