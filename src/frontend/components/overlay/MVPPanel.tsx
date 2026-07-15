import { cn } from '../AdminLayout';
import { PlayerPortrait } from './PlayerPortrait';
import { motion } from 'motion/react';

export interface MVPPanelProps {
  type?: 'round' | 'match';
  mvp: any;
  specialTag?: string;
  side: 'CT' | 'T' | null;
  team?: any;
}

export function MVPPanel({ type = 'round', mvp, specialTag, side, team }: MVPPanelProps) {
  const isCT = side === 'CT';

  const accentText = isCT ? 'text-blue-400' : 'text-orange-400';
  const accentBg = isCT ? 'bg-blue-600' : 'bg-orange-600';
  const accentBorder = isCT ? 'border-blue-500/40' : 'border-orange-500/40';
  const accentRing = isCT ? 'ring-blue-500/35' : 'ring-orange-500/35';
  const glowShadow = isCT
    ? 'shadow-[0_0_45px_rgba(37,99,235,0.26)]'
    : 'shadow-[0_0_45px_rgba(234,88,12,0.26)]';
  const gradientBg = isCT
    ? 'from-blue-600/16 via-neutral-950/80 to-neutral-950/95'
    : 'from-orange-600/16 via-neutral-950/80 to-neutral-950/95';

  const roundStats = mvp.state || {};
  const matchStats = mvp.match_stats || { kills: 0, assists: 0, deaths: 0, damage: 0 };
  const matchKills = Number(matchStats.kills || 0);
  const matchDeaths = Number(matchStats.deaths || 0);
  const matchDmr = Math.round(
    Number(matchStats.dmr ?? matchStats.adr ?? matchStats.damage_per_round ?? 0)
  );
  const kdr = matchDeaths > 0 ? (matchKills / matchDeaths).toFixed(2) : matchKills.toFixed(2);

  const title = type === 'match' ? 'MELHOR JOGADOR' : 'MVP DA RODADA';
  const playerName = mvp.name || mvp.nickname || 'MVP';
  const playerRealName = mvp.real_name || mvp.realName || '';
  const teamName = team?.name || mvp.teamName || '';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 14 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96, y: 10 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'relative w-full max-w-[720px] h-[230px] overflow-hidden rounded-[28px] border border-white/10 bg-neutral-950/95 backdrop-blur-3xl',
        glowShadow
      )}
    >
      {/* Background layers */}
      <div className={cn('absolute inset-0 bg-gradient-to-r pointer-events-none', gradientBg)} />
      <div className={cn('absolute inset-y-0 left-0 w-1.5 z-30', accentBg)} />
      <div className={cn('absolute bottom-0 left-0 right-0 h-1.5 z-30', accentBg)} />
      <div className="absolute -right-14 -top-20 w-64 h-64 rounded-full bg-white/[0.035] blur-3xl pointer-events-none" />

      <div className="relative z-10 flex h-full">
        {/* HERO PORTRAIT */}
        <div className="relative h-full w-[305px] shrink-0 overflow-hidden bg-neutral-900/80">
          <div className={cn('absolute inset-3 rounded-[22px] ring-2 overflow-hidden bg-black/40', accentRing)}>
            <PlayerPortrait
              avatar={mvp.avatar}
              className="h-full w-full object-cover object-top scale-[1.18] origin-top drop-shadow-[0_18px_28px_rgba(0,0,0,0.75)]"
            />
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-black/10 pointer-events-none" />
          <div className={cn('absolute -bottom-16 left-10 h-36 w-36 rounded-full opacity-30 blur-3xl', accentBg)} />

          {specialTag && (
            <motion.div
              initial={{ x: -18, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.28, type: 'spring', damping: 18, stiffness: 240 }}
              className={cn(
                'absolute left-6 bottom-6 z-30 rounded-lg px-3.5 py-2 text-[12px] font-black uppercase tracking-[0.18em] text-white shadow-2xl border border-white/15',
                accentBg
              )}
            >
              {specialTag}
            </motion.div>
          )}
        </div>

        {/* INFO AREA */}
        <div className="relative flex min-w-0 flex-1 flex-col justify-between px-7 py-6">
          <div className="absolute right-7 top-5 opacity-40">
            <span className="text-[8px] font-black uppercase tracking-[0.32em] text-white">
              POWERED BY <span className="text-white/80">DOUTRINA</span><span className={accentText}>HUD</span>
            </span>
          </div>

          <div className="min-w-0 pr-24">
            <span className={cn('block text-[11px] font-black uppercase tracking-[0.38em]', accentText)}>
              {title}
            </span>

            <div className="mt-3 min-w-0">
              <span className="block truncate text-[44px] font-black uppercase italic leading-[0.9] tracking-[-0.06em] text-white drop-shadow-xl">
                {playerName}
              </span>

              <div className="mt-2 flex items-center gap-3 min-w-0">
                {teamName && (
                  <span className="truncate text-[12px] font-black uppercase tracking-[0.24em] text-white/45">
                    {teamName}
                  </span>
                )}
                {playerRealName && (
                  <span className="truncate text-[11px] font-bold uppercase tracking-[0.2em] text-white/30">
                    {playerRealName}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {type === 'round' ? (
              <>
                <StatBox label="ABATES" value={roundStats.round_kills || 0} isCT={isCT} highlight />
                <StatBox label="HEADSHOTS" value={roundStats.round_killhs || 0} isCT={isCT} />
                <StatBox label="DANO" value={roundStats.round_totaldmg || 0} isCT={isCT} />
              </>
            ) : (
              <>
                <StatBox label="KILLS/MORTES" value={`${matchKills}/${matchDeaths}`} isCT={isCT} highlight />
                <StatBox label="DMR" value={matchDmr} isCT={isCT} />
                <StatBox label="KDR" value={kdr} isCT={isCT} />
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StatBox({
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
  const accentText = isCT ? 'text-blue-300' : 'text-orange-300';
  const borderCol = highlight ? (isCT ? 'border-blue-500/35' : 'border-orange-500/35') : 'border-white/10';
  const bgCol = highlight ? (isCT ? 'bg-blue-500/[0.09]' : 'bg-orange-500/[0.09]') : 'bg-white/[0.045]';

  return (
    <div className={cn('min-w-0 rounded-xl border px-3 py-3.5 flex flex-col items-center justify-center', borderCol, bgCol)}>
      <span className="mb-1 text-[9px] font-black uppercase tracking-[0.22em] text-white/35">
        {label}
      </span>
      <span className={cn('text-[28px] font-black leading-none tabular-nums tracking-tight', highlight ? accentText : 'text-white/95')}>
        {value}
      </span>
    </div>
  );
}
