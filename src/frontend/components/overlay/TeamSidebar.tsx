import { PlayerPanel } from './PlayerPanel';
import { cn } from '../AdminLayout';
import { motion } from 'motion/react';

export function TeamSidebar({ players, isRightSide, isObserved, isAutoMode }: any) {
  return (
    <motion.div 
      initial={{ x: isRightSide ? 100 : -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120, staggerChildren: 0.1 }}
      className={cn("flex flex-col gap-3 absolute top-1/2 -translate-y-1/2", isRightSide ? "right-8" : "left-8")}
    >
      {players.map((p: any, i: number) => (
        <motion.div
          key={p.steamid}
          initial={{ opacity: 0, x: isRightSide ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          <PlayerPanel 
            player={p} 
            isRightSide={isRightSide} 
            isObserved={isObserved === p.steamid} 
            isAutoMode={isAutoMode} 
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
