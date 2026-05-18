import { PlayerCard } from './PlayerCard';
import { cn } from '../AdminLayout';
import { motion } from 'motion/react';

export function PlayerPanels({ players, isRightSide, isObserved, isAutoMode }: any) {
  return (
    <motion.div 
      initial={{ x: isRightSide ? 50 : -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120, staggerChildren: 0.05 }}
      className={cn("flex flex-row gap-1 absolute bottom-6 z-20", isRightSide ? "right-6" : "left-6")}
    >
      {players.map((p: any, i: number) => (
        <motion.div
          key={p.steamid}
          initial={{ opacity: 0, x: isRightSide ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <PlayerCard 
            player={p} 
            isRightSide={isRightSide} 
            isObserved={isObserved === p.steamid} 
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
