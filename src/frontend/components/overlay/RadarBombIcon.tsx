import { useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '../AdminLayout';

interface RadarBombIconProps {
  x: number;
  y: number;
  state: 'planted' | 'dropped' | 'carried';
  sampleReceivedAt?: string | null;
}

const DEFAULT_BOMB_TWEEN_SECONDS = 0.62;

export function RadarBombIcon({ x, y, state, sampleReceivedAt }: RadarBombIconProps) {
  const previousSampleTimeRef = useRef<number | null>(null);
  const tweenDurationRef = useRef(DEFAULT_BOMB_TWEEN_SECONDS);
  const sampleTime = sampleReceivedAt ? Date.parse(sampleReceivedAt) : Number.NaN;

  if (Number.isFinite(sampleTime) && sampleTime !== previousSampleTimeRef.current) {
    if (previousSampleTimeRef.current !== null) {
      const intervalSeconds = (sampleTime - previousSampleTimeRef.current) / 1000;
      if (intervalSeconds > 0 && intervalSeconds < 3) {
        const desiredDuration = Math.min(0.78, Math.max(0.2, intervalSeconds * 1.12));
        tweenDurationRef.current = tweenDurationRef.current * 0.35 + desiredDuration * 0.65;
      }
    }
    previousSampleTimeRef.current = sampleTime;
  }

  if (state === 'carried') return null; // Handled by player icon

  return (
    <motion.div
      initial={false}
      animate={{ left: `${x}%`, top: `${y}%` }}
      transition={{
        duration: state === 'planted' ? 0 : tweenDurationRef.current,
        ease: 'linear',
      }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 z-20",
        state === 'planted' ? "scale-150" : "scale-110"
      )}
      style={{ willChange: 'left, top' }}
    >
      <div className={cn(
        "w-5 h-5 flex items-center justify-center drop-shadow-md",
        state === 'planted' && "animate-pulse"
      )}>
        <img 
          src="./icons/cs2/c4-red.png"
          alt="C4" 
          className="w-full h-full object-contain"
        />
      </div>
      
      {state === 'planted' && (
        <div className="absolute inset-0 bg-red-600 rounded-full blur-md opacity-40 animate-ping -z-10" />
      )}
    </motion.div>
  );
}
