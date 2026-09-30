import { PlayerCard } from './PlayerCard';
import { cn } from '../AdminLayout';
import { motion, AnimatePresence } from 'motion/react';

interface PlayerPanelsProps {
  players: any[];
  isRightSide?: boolean;
  isObserved?: string | null;
  isAutoMode?: boolean;
  recentKills?: Set<string>;
}

export function PlayerPanels({ players, isRightSide, isObserved }: PlayerPanelsProps) {
  if (!players || players.length === 0) return null;

  return (
    <div 
      className={cn(
        "flex flex-col gap-1 absolute bottom-8 z-20", 
        isRightSide ? "right-6" : "left-6"
      )}
    >
      <AnimatePresence mode="popLayout">
        {players.map((p, i) => (
          <motion.div
            key={p.steamid || i}
            layout
            initial={{ opacity: 0, x: isRightSide ? 50 : -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ 
              type: 'spring', 
              damping: 20, 
              stiffness: 100,
              delay: i * 0.05 
            }}
          >
            <PlayerCard 
              player={p} 
              isRightSide={isRightSide} 
              isObserved={isObserved === p.steamid} 
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
