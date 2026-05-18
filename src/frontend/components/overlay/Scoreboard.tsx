import { motion } from 'motion/react';
import { cn } from '../AdminLayout';
import { SeriesStrip } from './SeriesStrip';

export function Scoreboard({ match, timerDisplay, timerPhase, round, autoMode, gsiState }: any) {
  const scoreHome = match.scoreHome || 0;
  const scoreAway = match.scoreAway || 0;
  const teamHome = match.teamHome || { name: 'TEAM A', tag: 'TMA' };
  const teamAway = match.teamAway || { name: 'TEAM B', tag: 'TMB' };
  const format = match.format || 'BO3';
  const stage = match.stage || 'Grand Final';
  
  const sideHome = match.sideHome || 'CT';
  const leftIsCT = sideHome === 'CT';

  const formatRoundCount = autoMode && gsiState?.map?.round ? gsiState.map.round + 1 : 1;

  // Derive mapIndex for SeriesStrip, if not BO1
  // Mock logic: Home Score + Away Score + 1, wait for series this is map score, not round score.
  // Actually, match.scoreHome is the map score in BO3/BO5.
  const seriesMapIndex = scoreHome + scoreAway + 1;

  return (
    <motion.div 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center mt-6 z-20"
    >
      <div className="flex flex-col items-center">
        {/* Top Info Bar */}
        <div className="bg-neutral-900/95 text-white font-bold text-[11px] px-8 py-1 tracking-widest uppercase shadow-md flex items-center justify-center min-w-[500px]">
          {stage}
        </div>

        {/* Main Scoreboard */}
        <div className="flex h-[66px] bg-neutral-800/80 backdrop-blur-xl shadow-2xl overflow-hidden font-sans border border-white/10">
          
          {/* Team Left */}
          <div className={cn("flex items-center w-[220px] relative px-4", leftIsCT ? 'bg-gradient-to-r from-transparent to-blue-600/30' : 'bg-gradient-to-r from-transparent to-yellow-500/30')}>
            <span className="flex-1 text-right text-xl font-bold uppercase tracking-wider z-10 truncate text-white drop-shadow-md">
              {teamHome.name}
            </span>
          </div>

          {/* Score Left */}
          <div className={cn(
            "w-[50px] flex items-center justify-center text-3xl font-black text-white relative",
            leftIsCT ? 'bg-blue-600' : 'bg-yellow-500'
          )}>
            <div className="absolute inset-0 bg-black/20" />
            <span className="z-10 drop-shadow-lg">{match.scoreHome}</span>
          </div>

          {/* Center Timer Area */}
          <div className="flex flex-col items-center justify-center w-[120px] bg-neutral-950/95 relative border-x border-black/50">
             <div className="absolute top-0 w-full h-[3px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
             
             {timerPhase === 'bomb' ? (
                <motion.div
                   animate={{ opacity: [1, 0.5, 1] }}
                   transition={{ repeat: Infinity, duration: 1 }}
                   className="flex items-center justify-center w-full h-full bg-red-600 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]"
                >
                   <span className="text-2xl font-black text-white tracking-widest">BOMB</span>
                </motion.div>
             ) : timerPhase === 'defuse' ? (
                <div className="flex items-center justify-center w-full h-full bg-blue-600 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]">
                   <span className="text-3xl font-black text-white tabular-nums tracking-tighter">{timerDisplay}</span>
                </div>
             ) : (
                <>
                  <span className={cn(
                    "text-3xl font-black tabular-nums tracking-tighter mt-1", 
                    timerPhase === 'live' || timerPhase === 'warmup' ? 'text-white drop-shadow-md' : 'text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]'
                  )}>
                    {timerDisplay}
                  </span>
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none mt-0.5">
                    Round {formatRoundCount}
                  </span>
                </>
             )}
          </div>

          {/* Score Right */}
          <div className={cn(
            "w-[50px] flex items-center justify-center text-3xl font-black text-white relative",
            !leftIsCT ? 'bg-blue-600' : 'bg-yellow-500'
          )}>
            <div className="absolute inset-0 bg-black/20" />
            <span className="z-10 drop-shadow-lg">{match.scoreAway}</span>
          </div>

          {/* Team Right */}
          <div className={cn("flex items-center w-[220px] relative px-4", !leftIsCT ? 'bg-gradient-to-l from-transparent to-blue-600/30' : 'bg-gradient-to-l from-transparent to-yellow-500/30')}>
            <span className="flex-1 text-left text-xl font-bold uppercase tracking-wider z-10 truncate text-white drop-shadow-md">
              {teamAway.name}
            </span>
          </div>

        </div>
        
        {/* Format / BO Bottom Bar */}
        <SeriesStrip format={format} mapIndex={seriesMapIndex} />
      </div>
    </motion.div>
  );
}
