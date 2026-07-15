import { getWeaponIcon } from './OverlayHelpers';
import { UtilityCounts } from '../../lib/gsi/economy';
import { cn } from '../AdminLayout';

interface UtilitySummaryProps {
  counts: UtilityCounts;
  isRightSide?: boolean;
}

export function UtilitySummary({ counts, isRightSide }: UtilitySummaryProps) {
  const items = [
    { key: 'flashbang', name: 'flashbang' },
    { key: 'smokegrenade', name: 'smokegrenade' },
    { key: 'hegrenade', name: 'hegrenade' },
    { key: 'molotov', name: 'molotov' },
    { key: 'decoy', name: 'decoy' },
  ];

  return (
    <div className={cn(
      "flex items-center gap-2.5",
      isRightSide ? "flex-row-reverse" : "flex-row"
    )}>
      {items.map(item => {
        const count = (counts as any)[item.key];
        if (count === 0) return null;

        return (
          <div key={item.key} className="flex items-center gap-1">
            <img 
              src={getWeaponIcon(`weapon_${item.name}`)} 
              className="h-3.5 w-auto brightness-0 invert opacity-60" 
            />
            <span className="text-[10px] font-black text-white/40 tabular-nums">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
