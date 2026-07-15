import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../AdminLayout';
import { detectNewKills, KillEvent, getMultiKillLabel } from '../../lib/gsi/killEvents';

interface KillEventFeedProps {
  players: any[];
  round: any;
  map: any;
  autoMode: boolean;
  onKillDetected?: (attackerSteamId: string) => void;
}

export function KillEventFeed({ players, round, map, autoMode, onKillDetected }: KillEventFeedProps) {
  const [activeEvents, setActiveEvents] = useState<KillEvent[]>([]);
  const prevKillsRef = useRef<Record<string, number>>({});
  const prevMapName = useRef<string>('');

  // 1. Detect Kills
  useEffect(() => {
    if (!autoMode || !players.length) return;

    // Reset on map change
    if (map?.name !== prevMapName.current) {
      prevKillsRef.current = {};
      prevMapName.current = map?.name || '';
      return;
    }

    const { events, newKillsMap } = detectNewKills(players, prevKillsRef.current);
    prevKillsRef.current = newKillsMap;

    if (events.length > 0) {
      // Notify parent for panel highlighting
      events.forEach(e => onKillDetected?.(e.attackerSteamId));

      // Filter for multi-kills (2K+) to show banners
      // Normal kills can be ignored or shown as very small hints
      const multiKills = events.filter(e => e.roundKills >= 2);
      
      if (multiKills.length > 0) {
        setActiveEvents(prev => [...prev, ...multiKills]);
      }
    }
  }, [players, autoMode, map, onKillDetected]);

  // 2. Auto-remove events after duration
  useEffect(() => {
    if (activeEvents.length === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setActiveEvents(prev => prev.filter(e => {
        const duration = e.roundKills >= 3 ? 5000 : 3000;
        return now - e.timestamp < duration;
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [activeEvents]);

  return (
    <div className="absolute top-[140px] right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {activeEvents.map((event) => (
          <MultiKillBanner key={event.id} event={event} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function MultiKillBanner({ event }: { event: KillEvent }) {
  const label = getMultiKillLabel(event.roundKills);
  const isCT = event.attackerTeam === 'CT';
  const isMajor = event.roundKills >= 4; // 4K or ACE

  return (
    <motion.div
      initial={{ x: 50, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 20, opacity: 0, scale: 0.9 }}
      className={cn(
        "flex items-stretch bg-neutral-950/95 backdrop-blur-xl border border-white/10 rounded-lg overflow-hidden shadow-2xl min-w-[200px]",
        isMajor ? "border-white/20 scale-105" : ""
      )}
    >
      {/* Team Accent Line */}
      <div className={cn(
        "w-1.5 self-stretch",
        isCT ? "bg-blue-600" : "bg-orange-600"
      )} />

      <div className="flex items-center gap-4 px-5 py-2.5">
        {/* Multi-kill Label (2K, 3K, etc) */}
        <div className="flex flex-col items-center justify-center">
          <span className={cn(
            "text-2xl font-black italic tracking-tighter leading-none",
            isMajor ? "text-yellow-400 drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" : "text-white"
          )}>
            {label}
          </span>
          <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em] mt-0.5">
            MULTIKILL
          </span>
        </div>

        <div className="w-[1px] h-8 bg-white/10" />

        {/* Player Name */}
        <div className="flex flex-col">
          <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] mb-0.5">
            JOGADOR
          </span>
          <span className="text-lg font-black text-white uppercase italic tracking-tighter leading-none truncate max-w-[150px]">
            {event.attackerName}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
