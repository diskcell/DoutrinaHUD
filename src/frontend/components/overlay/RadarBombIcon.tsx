import { cn } from '../AdminLayout';

interface RadarBombIconProps {
  x: number;
  y: number;
  state: 'planted' | 'dropped' | 'carried';
}

export function RadarBombIcon({ x, y, state }: RadarBombIconProps) {
  if (state === 'carried') return null; // Handled by player icon

  return (
    <div 
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 z-20",
        state === 'planted' ? "scale-150" : "scale-110"
      )}
      style={{ left: `${x}%`, top: `${y}%` }}
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
    </div>
  );
}
