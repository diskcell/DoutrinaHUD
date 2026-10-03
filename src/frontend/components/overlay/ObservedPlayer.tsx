import { cn } from '../../components/AdminLayout';
import { Crosshair, Skull, Activity } from 'lucide-react';
import { getWeaponIcon } from './OverlayHelpers';
import { PlayerPortrait } from './PlayerPortrait';
import { motion } from 'motion/react';
import { useImmediateActiveWeapon } from './useImmediateActiveWeapon';
import { PlayerHealthBar, getHealthTextClass } from './PlayerHealthBar';

function getWeaponText(weapon: any, field: 'name' | 'type') {
  return String(weapon?.[field] || '').toLowerCase();
}

function isGrenadeWeapon(weapon: any) {
  const name = getWeaponText(weapon, 'name');
  const type = getWeaponText(weapon, 'type');

  return (
    type.includes('grenade') ||
    name.includes('grenade') ||
    name.includes('flashbang') ||
    name.includes('smoke') ||
    name.includes('molotov') ||
    name.includes('incgrenade') ||
    name.includes('decoy') ||
    name.includes('hegrenade')
  );
}

function isNonAmmoItem(weapon: any) {
  const name = getWeaponText(weapon, 'name');
  const type = getWeaponText(weapon, 'type');

  return (
    isGrenadeWeapon(weapon) ||
    type.includes('knife') ||
    type.includes('c4') ||
    name.includes('knife') ||
    name.includes('c4')
  );
}

function hasWeaponAmmo(weapon: any) {
  const ammoClip = Number(weapon?.ammo_clip);
  return Number.isFinite(ammoClip) && ammoClip >= 0;
}

export function ObservedPlayer({ player }: { player: any }) {
  const { activeWeapon } = useImmediateActiveWeapon(player?.weapons);

  if (!player) return null;

  const health = player.state?.health ?? 0;
  const isDead = health <= 0;
  const stats = player.match_stats || { kills: 0, deaths: 0, assists: 0 };
  const armor = player.state?.armor ?? 0;
  const helmet = player.state?.helmet ?? false;
  
  const showAmmo = activeWeapon && !isNonAmmoItem(activeWeapon) && hasWeaponAmmo(activeWeapon);

  const isCT = player.team === 'CT';

  // Determine font size based on nickname length
  const nameLength = player.name?.length || 0;
  const fontSizeClass = nameLength > 15 ? "text-lg" : nameLength > 12 ? "text-xl" : "text-2xl";

  return (
    <motion.div 
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0 }}
      className="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-end z-40 w-[720px]"
    >
      {/* 1. Compact Hero Portrait - Very close to the bar */}
      <div className="relative z-50 shrink-0 pointer-events-none select-none">
        <div className="w-[180px] h-[180px] relative flex items-end justify-center -mb-2">
          <PlayerPortrait 
            avatar={player.avatar} 
            transparent
            className="w-full h-full drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)] z-10" 
          />
        </div>
      </div>

      {/* 2. HUD Body */}
      <div className="flex flex-col flex-1 -ml-28">
        
        {/* Main Info Bar */}
        <div className={cn(
          "w-full h-[82px] bg-neutral-950/95 backdrop-blur-2xl shadow-[0_25px_50px_rgba(0,0,0,0.8)] flex items-center relative overflow-visible rounded-xl border border-white/5",
          isCT ? "shadow-blue-500/10" : "shadow-orange-500/10"
        )}>

          {/* Team identity never changes with health. */}
          <div
            className={cn(
              'absolute inset-x-0 top-0 z-20 h-[3px] rounded-t-xl',
              isCT ? 'bg-blue-500' : 'bg-orange-500',
            )}
          />
          <div
            className={cn(
              'absolute inset-0 z-0 rounded-xl opacity-[0.08]',
              isCT
                ? 'bg-gradient-to-r from-blue-500 via-blue-500/20 to-transparent'
                : 'bg-gradient-to-r from-orange-500 via-orange-500/20 to-transparent',
            )}
          />

          {/* Content Container */}
          <div className="flex items-center w-full h-full relative z-10 pl-28">
             
             {/* Center Section: HP, Name and Stats */}
             <div className="flex-1 flex flex-col justify-center px-3 min-w-0">
               {/* Top Row: Name & HP */}
               <div className="flex items-center gap-3 mb-0.5 overflow-visible min-w-0">
                 <div className="flex flex-col items-center justify-center shrink-0">
                   <motion.span 
                     key={health}
                     className={cn(
                       "text-3xl font-black tabular-nums italic leading-none drop-shadow-2xl",
                       getHealthTextClass(health)
                     )}
                   >
                     {health}
                   </motion.span>
                   <span className="text-[7px] font-black text-white/30 uppercase tracking-[0.2em]">HP</span>
                 </div>

                 <div className="w-[1px] h-8 bg-white/10 shrink-0" />

                 <motion.span 
                   key={player.name}
                   initial={{ x: -10, opacity: 0 }}
                   animate={{ x: 0, opacity: 1 }}
                   className={cn(
                     "min-w-0 flex-1 font-black text-white tracking-tighter uppercase italic drop-shadow-2xl truncate leading-[1.25] py-1.5 pl-1 pr-3",
                     fontSizeClass
                   )}
                 >
                   {player.name}
                 </motion.span>
               </div>

               {/* Bottom Row: BIGGER STATS */}
               <div className="flex gap-5 text-xs font-black uppercase tracking-wider text-white/70">
                 <span className="flex items-center gap-1.5"><Crosshair className="w-4 h-4 text-emerald-500" /> {stats.kills}</span>
                 <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-blue-500" /> {stats.assists}</span>
                 <span className="flex items-center gap-1.5"><Skull className="w-4 h-4 text-red-500" /> {stats.deaths}</span>
               </div>
             </div>

             {/* Right Section: Weapon & Ammo - COMPACT */}
             <div className="w-[170px] flex items-center justify-end gap-3 pr-6 pl-3 shrink-0 border-l border-white/10 h-full bg-black/20 overflow-visible rounded-r-xl">
               <div className="flex-1 flex justify-center items-center overflow-visible min-w-0">
                 {activeWeapon && (
                   <img
                     key={activeWeapon.name}
                     src={getWeaponIcon(activeWeapon.name)}
                     className="h-8 w-auto max-w-[105px] object-contain brightness-0 invert opacity-90 drop-shadow-2xl"
                     onError={(e) => (e.currentTarget.style.display = 'none')}
                   />
                 )}
               </div>

               {showAmmo && (
                 <div className="flex items-baseline gap-1 shrink-0 w-[45px] justify-end">
                   <motion.span 
                     key={activeWeapon.ammo_clip}
                     className="text-2xl font-black text-white tabular-nums drop-shadow-lg leading-none"
                   >
                     {activeWeapon.ammo_clip}
                   </motion.span>
                   <span className="text-[10px] font-black text-white/20 tabular-nums leading-none">
                     {activeWeapon.ammo_reserve}
                   </span>
                 </div>
               )}
             </div>
          </div>

          <PlayerHealthBar
            health={health}
            className="absolute inset-x-0 bottom-0 z-30 h-[8px] rounded-b-xl"
          />
        </div>
      </div>
    </motion.div>
  );
}
