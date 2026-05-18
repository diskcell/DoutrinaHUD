import { cn } from '../AdminLayout';

export function SeriesStrip({ format, mapIndex = 1, scoreHome = 0, scoreAway = 0 }: any) {
  if (format === 'BO1') return null;

  const totalMaps = format === 'BO3' ? 3 : format === 'BO5' ? 5 : 1;
  const mapsNeeded = Math.ceil(totalMaps / 2);
  
  // Create indicators for Home team (left) and Away team (right)
  const homeIndicators = Array.from({ length: mapsNeeded });
  const awayIndicators = Array.from({ length: mapsNeeded });

  return (
    <div className="flex items-center gap-8">
      {/* Home Map Wins */}
      <div className="flex gap-1.5 flex-row-reverse">
        {homeIndicators.map((_, i) => (
          <div 
            key={`home-${i}`} 
            className={cn(
              "w-4 h-1.5 rounded-sm transition-all duration-500",
              i < scoreHome ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-white/10"
            )}
          />
        ))}
      </div>

      <span className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">
        Best of {totalMaps}
      </span>

      {/* Away Map Wins */}
      <div className="flex gap-1.5">
        {awayIndicators.map((_, i) => (
          <div 
            key={`away-${i}`} 
            className={cn(
              "w-4 h-1.5 rounded-sm transition-all duration-500",
              i < scoreAway ? "bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "bg-white/10"
            )}
          />
        ))}
      </div>
    </div>
  );
}
