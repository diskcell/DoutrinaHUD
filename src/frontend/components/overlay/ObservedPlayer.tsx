import { cn } from '../../components/AdminLayout';
import { Crosshair, Skull, Activity } from 'lucide-react';
import { formatWeaponName } from './PlayerCard';

export function ObservedPlayer({ player }: { player: any }) {
  if (!player) return null;

  const stats = player.match_stats || { kills: 0, deaths: 0, assists: 0 };
  const weapons = player.weapons ? Object.values(player.weapons) : [];
  const activeWeapon = weapons.find((w: any) => w.state === 'active') as any;

  const isCT = player.team === 'CT';

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center z-40 transition-all duration-500 w-[600px]">
      
      {/* Stats and Weapon Name Top Bar */}
      <div className="flex items-center justify-between w-full px-6 py-1 bg-neutral-900/60 backdrop-blur-xl border-x border-t border-white/10 rounded-t-lg">
        <div className="flex gap-6 text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
          <span className="flex items-center gap-2"><Crosshair className="w-3 h-3 text-emerald-500" /> {stats.kills} KILLS</span>
          <span className="flex items-center gap-2"><Activity className="w-3 h-3 text-blue-500" /> {stats.assists} ASST</span>
          <span className="flex items-center gap-2"><Skull className="w-3 h-3 text-red-500" /> {stats.deaths} DEATHS</span>
        </div>
        <span className="text-[11px] font-black text-white/80 uppercase tracking-widest">
           {activeWeapon ? formatWeaponName(activeWeapon.name) : 'KNIFE'}
        </span>
      </div>

      {/* Main Info Bar */}
      <div className={cn(
        "w-full h-[80px] bg-neutral-950/90 backdrop-blur-2xl border-b-4 shadow-[0_30px_60px_rgba(0,0,0,0.8)] flex items-center justify-between px-10 relative overflow-hidden",
        isCT ? "border-blue-600 shadow-[inset_0_-20px_40px_rgba(37,99,235,0.1)]" : "border-orange-600 shadow-[inset_0_-20px_40px_rgba(234,88,12,0.1)]"
      )}>
        {/* Animated Background Pulse */}
        <div className={cn(
          "absolute left-0 top-0 w-1 h-full",
          isCT ? "bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]" : "bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)]"
        )} />

        <div className="flex flex-col">
          <span className="text-4xl font-black text-white tracking-tighter uppercase italic">
            {player.name}
          </span>
          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mt-[-4px]">
            OBSERVING PLAYER
          </span>
        </div>

        {activeWeapon?.ammo_clip >= 0 && (
          <div className="flex items-baseline gap-2 border-l border-white/5 pl-10">
            <span className="text-6xl font-black text-white tabular-nums drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              {activeWeapon.ammo_clip}
            </span>
            <span className="text-2xl font-black text-white/20 tabular-nums">
              / {activeWeapon.ammo_reserve}
            </span>
          </div>
        )}
      </div>

      {/* Reflection effect */}
      <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent mt-[-1px]" />
    </div>
  );
}