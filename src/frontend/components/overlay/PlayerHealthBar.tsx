import { useEffect, useRef, useState } from 'react';
import { cn } from '../AdminLayout';

interface PlayerHealthBarProps {
  health: number;
  isRightSide?: boolean;
  className?: string;
}

function clampHealth(health: number) {
  return Math.max(0, Math.min(100, Number(health) || 0));
}

export function getHealthColor(health: number) {
  const value = clampHealth(health);

  if (value <= 25) return '#ef4444';
  if (value <= 60) return '#facc15';
  return '#22c55e';
}

export function getHealthTextClass(health: number) {
  const value = clampHealth(health);

  if (value <= 0) return 'text-neutral-600';
  if (value <= 25) return 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.65)]';
  if (value <= 60) return 'text-yellow-300';
  return 'text-white';
}

export function PlayerHealthBar({
  health,
  isRightSide = false,
  className,
}: PlayerHealthBarProps) {
  const currentHealth = clampHealth(health);
  const previousHealthRef = useRef(currentHealth);
  const [trailingHealth, setTrailingHealth] = useState(currentHealth);

  useEffect(() => {
    const previousHealth = previousHealthRef.current;
    previousHealthRef.current = currentHealth;

    if (currentHealth >= previousHealth) {
      setTrailingHealth(currentHealth);
      return;
    }

    setTrailingHealth((value) => Math.max(value, previousHealth));

    const timeout = window.setTimeout(() => {
      setTrailingHealth(currentHealth);
    }, 140);

    return () => window.clearTimeout(timeout);
  }, [currentHealth]);

  const anchorClass = isRightSide ? 'right-0' : 'left-0';

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-black/75 ring-1 ring-inset ring-white/10',
        className,
      )}
    >
      <div
        className={cn(
          'absolute inset-y-0 bg-white/35 transition-[width] duration-700 ease-out',
          anchorClass,
        )}
        style={{ width: `${trailingHealth}%` }}
      />

      <div
        className={cn(
          'absolute inset-y-0 transition-[width,background-color] duration-150 ease-out',
          anchorClass,
        )}
        style={{
          width: `${currentHealth}%`,
          backgroundColor: getHealthColor(currentHealth),
          boxShadow: `0 0 12px ${getHealthColor(currentHealth)}99`,
        }}
      />

      <div className="absolute inset-y-0 left-1/4 w-px bg-black/30" />
      <div className="absolute inset-y-0 left-1/2 w-px bg-black/25" />
      <div className="absolute inset-y-0 left-3/4 w-px bg-black/30" />
    </div>
  );
}
