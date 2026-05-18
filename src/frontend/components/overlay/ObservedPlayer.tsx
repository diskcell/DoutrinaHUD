import { cn } from '../../components/AdminLayout';
import { Crosshair, Skull, Activity } from 'lucide-react';

export function ObservedPlayer({ player }: { player: any }) {
  if (!player) return null;

  const stats = player.match_stats || { kills: 0, deaths: 0, assists: 0 };
  const activeWeapon = player.weapons 
    ? Object.values(player.weapons).find((w: any) => w.state === 'active') as any
    : null;

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-40 transition-all duration-300">
      
      {/* KDA Stats */}
      <div className="bg-neutral-900/90 backdrop-blur-md px-6 py-2 rounded-t-lg border-t border-l border-r border-white/10 flex gap-6 text-sm font-bold uppercase tracking-widest text-neutral-400">
        <span className="flex items-center gap-2"><Crosshair className="w-4 h-4 text-emerald-500" /> {stats.kills}</span>
        <span className="flex items-center gap-2"><Activity className="w-4 h-4 text-blue-500" /> {stats.assists}</span>
        <span className="flex items-center gap-2"><Skull className="w-4 h-4 text-red-500" /> {stats.deaths}</span>
      </div>

      {/* Main Bar */}
      <div className={cn(
        "bg-neutral-950/95 backdrop-blur-md px-12 py-4 rounded-xl border-b-4 shadow-2xl flex items-center gap-12",
        player.team === 'CT' ? 'border-blue-500' : 'border-yellow-500'
      )}>
        <span className="text-3xl font-black text-white tracking-widest uppercase">
          {player.name}
        </span>

        {activeWeapon?.ammo_clip >= 0 && (
          <div className="flex items-baseline gap-1 border-l border-white/10 pl-12">
            <span className="text-5xl font-black text-white">{activeWeapon.ammo_clip}</span>
            <span className="text-2xl font-bold text-neutral-500">/ {activeWeapon.ammo_reserve}</span>
          </div>
        )}
      </div>
    </div>
  );
}