import { motion } from 'motion/react';
import { cn } from '../AdminLayout';

export function SeriesStrip({ format, mapIndex = 1 }: any) {
  if (format === 'BO1') return null;

  const totalMaps = format === 'BO3' ? 3 : format === 'BO5' ? 5 : 1;
  const maps = Array.from({ length: totalMaps });

  return (
    <div className="bg-neutral-950/95 flex items-center justify-center p-1 px-4 rounded-b-lg border border-t-0 border-white/10 shadow-lg">
      <div className="flex gap-2">
        {maps.map((_, i) => (
          <div 
            key={i} 
            className={cn(
              "w-6 h-1.5 rounded-full transition-colors",
              i + 1 < mapIndex ? "bg-emerald-500" :
              i + 1 === mapIndex ? "bg-white" : "bg-neutral-700"
            )}
          />
        ))}
      </div>
    </div>
  );
}
