import { PlayerCard } from './PlayerCard';
import { cn } from '../AdminLayout';
import { motion } from 'motion/react';

export function PlayerPanels({ players, isRightSide, isObserved, isAutoMode }: any) {
  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 25, stiffness: 120 }}
      className={cn(
        "flex flex-col gap-1.5 absolute bottom-10 z-20", 
        isRightSide ? "right-10" : "left-10"
      )}
    >
      {players.map((p: any, i: number) => (
        <motion.div
          key={p.steamid}
          initial={{ opacity: 0, x: isRightSide ? 40 : -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1, duration: 0.4 }}
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
