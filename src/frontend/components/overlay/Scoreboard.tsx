import { motion } from 'motion/react';
import { cn } from '../AdminLayout';
import { SeriesStrip } from './SeriesStrip';

export function Scoreboard({ match, timerDisplay, timerPhase, round, autoMode, gsiState }: any) {
  const scoreHome = match.scoreHome || 0;
  const scoreAway = match.scoreAway || 0;
  const teamHome = match.teamHome || { name: 'TEAM A', tag: 'TMA', logo: '' };
  const teamAway = match.teamAway || { name: 'TEAM B', tag: 'TMB', logo: '' };
  const format = match.format || 'BO3';
  const stage = match.stage || 'Live Match';
  
  const sideHome = match.sideHome || 'CT';
  const leftIsCT = sideHome === 'CT';

  const formatRoundCount = autoMode && gsiState?.map?.round ? gsiState.map.round + 1 : 1;
  const seriesMapIndex = scoreHome + scoreAway + 1;

  return (
    <motion.div 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center mt-4 z-30"
    >
      {/* Top Info Bar (Tournament Name / Stage) */}
      <div className="bg-neutral-950/90 text-white font-black text-[10px] px-10 py-0.5 tracking-[0.3em] uppercase border-x border-t border-white/10 rounded-t-sm backdrop-blur-md">
        {stage}
      </div>

      <div className="flex items-stretch h-[72px] bg-neutral-900/40 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/5 relative overflow-hidden">
        {/* Decorative Background Glows */}
        <div className={cn(
          "absolute left-0 top-0 w-[40%] h-full opacity-20 blur-3xl",
          leftIsCT ? "bg-blue-500" : "bg-orange-500"
        )} />
        <div className={cn(
          "absolute right-0 top-0 w-[40%] h-full opacity-20 blur-3xl",
          !leftIsCT ? "bg-blue-500" : "bg-orange-500"
        )} />

        {/* Team Left */}
        <div className={cn(
          "flex items-center w-[280px] px-6 relative",
          leftIsCT ? "flex-row-reverse" : "flex-row"
        )}>
          {teamHome.logo && (
            <img src={teamHome.logo} alt={teamHome.name} className="w-12 h-12 object-contain drop-shadow-2xl z-10" />
          )}
          <span className={cn(
            "flex-1 text-2xl font-black uppercase tracking-tighter z-10 truncate text-white drop-shadow-md px-4",
            leftIsCT ? "text-right" : "text-left"
          )}>
            {teamHome.name}
          </span>
        </div>

        {/* Score Left */}
        <div className={cn(
          "w-[65px] flex items-center justify-center text-4xl font-black text-white relative border-x border-white/5",
          leftIsCT ? "bg-blue-600/80 shadow-[inset_-10px_0_20px_rgba(0,0,0,0.2)]" : "bg-orange-600/80 shadow-[inset_-10px_0_20px_rgba(0,0,0,0.2)]"
        )}>
          <span className="z-10 drop-shadow-xl">{scoreHome}</span>
        </div>

        {/* Center Timer / Round Area */}
        <div className="flex flex-col items-center justify-center w-[140px] bg-neutral-950/80 relative z-20 overflow-hidden">
          {/* Bomb State Override */}
          {timerPhase === 'bomb' ? (
            <motion.div
              animate={{ backgroundColor: ['rgba(185,28,28,0.8)', 'rgba(220,38,38,1)', 'rgba(185,28,28,0.8)'] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="absolute inset-0 flex items-center justify-center"
            >
              <span className="text-2xl font-black text-white tracking-widest animate-pulse">BOMB</span>
            </motion.div>
          ) : timerPhase === 'defuse' ? (
            <div className="absolute inset-0 bg-blue-600 flex items-center justify-center">
              <span className="text-3xl font-black text-white tabular-nums">{timerDisplay}</span>
            </div>
          ) : (
            <>
              <span className={cn(
                "text-3xl font-black tabular-nums tracking-tight leading-none",
                timerPhase === 'live' ? 'text-white' : 'text-yellow-400'
              )}>
                {timerDisplay}
              </span>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-[1px] w-4 bg-white/20" />
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                  R{formatRoundCount}
                </span>
                <div className="h-[1px] w-4 bg-white/20" />
              </div>
            </>
          )}
          {/* Glass highlight */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-white/10" />
        </div>

        {/* Score Right */}
        <div className={cn(
          "w-[65px] flex items-center justify-center text-4xl font-black text-white relative border-x border-white/5",
          !leftIsCT ? "bg-blue-600/80 shadow-[inset_10px_0_20px_rgba(0,0,0,0.2)]" : "bg-orange-600/80 shadow-[inset_10px_0_20px_rgba(0,0,0,0.2)]"
        )}>
          <span className="z-10 drop-shadow-xl">{scoreAway}</span>
        </div>

        {/* Team Right */}
        <div className={cn(
          "flex items-center w-[280px] px-6 relative",
          !leftIsCT ? "flex-row-reverse" : "flex-row"
        )}>
          <span className={cn(
            "flex-1 text-2xl font-black uppercase tracking-tighter z-10 truncate text-white drop-shadow-md px-4",
            !leftIsCT ? "text-right" : "text-left"
          )}>
            {teamAway.name}
          </span>
          {teamAway.logo && (
            <img src={teamAway.logo} alt={teamAway.name} className="w-12 h-12 object-contain drop-shadow-2xl z-10" />
          )}
        </div>
      </div>
      
      {/* Series Indicator (BO format) */}
      <div className="mt-1 bg-neutral-950/60 backdrop-blur-md px-4 py-0.5 rounded-b-sm border-x border-b border-white/5">
        <SeriesStrip format={format} mapIndex={seriesMapIndex} scoreHome={match.scoreHome} scoreAway={match.scoreAway} />
      </div>
    </motion.div>
  );
}
