import { cn } from '../AdminLayout';
import { motion } from 'motion/react';
import { getWeaponIcon } from './OverlayHelpers';
import { PlayerPortrait } from './PlayerPortrait';

interface PlayerCardProps {
  player: any;
  isRightSide?: boolean;
  isObserved?: boolean;
}

export function PlayerCard({ player, isRightSide, isObserved }: PlayerCardProps) {
  const p = player;
  
  const health = p.state?.health ?? 0;
  const armor = p.state?.armor ?? 0;
  const helmet = p.state?.helmet ?? false;
  const money = p.state?.money ?? 0;
  const defuseKit = p.state?.defusekit ?? false;
  const stats = p.match_stats || { kills: 0, assists: 0, deaths: 0 };
  
  const isDead = health <= 0;
  const isCT = p.team === 'CT';
  const isLowHP = health > 0 && health <= 25;
  
  // Weapons logic
  const weapons = Object.values<{name: string, type: string, state: string}>(p.weapons || {});
  const activeWeapon = weapons.find(w => w.state === 'active');
  const grenades = weapons.filter(w => w.type === 'Grenade');
  const c4 = weapons.find(w => w.type === 'C4' || w.name === 'weapon_c4');

  // Side-specific colors
  const teamColorHex = isCT ? '#3b82f6' : '#f97316';
  const teamShadowHex = isCT ? 'rgba(59, 130, 246, 0.4)' : 'rgba(249, 115, 22, 0.4)';

  return (
    <motion.div 
      animate={{
        scale: isObserved && !isDead ? 1.05 : 1,
        x: isObserved && !isDead ? (isRightSide ? -10 : 10) : 0,
      }}
      transition={{ type: 'spring', damping: 20, stiffness: 150 }}
      className={cn(
        "w-[340px] h-[64px] relative flex transition-all duration-300 overflow-hidden",
        "bg-neutral-950/90 border border-white/5",
        isDead ? 'opacity-40' : 'opacity-100',
        isObserved && !isDead ? 'z-30' : 'z-10',
        isRightSide ? "flex-row-reverse" : "flex-row"
      )}
      style={{
        boxShadow: isObserved && !isDead ? `0 0 25px ${teamShadowHex}` : 'none',
        borderColor: isObserved && !isDead ? teamColorHex : 'rgba(255, 255, 255, 0.05)'
      }}
    >
      
      {/* HP Bar Background (Animated) */}
      <motion.div 
        initial={false}
        animate={{ 
          width: `${health}%`,
          backgroundColor: isLowHP ? '#dc2626' : teamColorHex
        }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className={cn(
          "absolute bottom-0 h-[4px] z-20",
          isRightSide ? "right-0" : "left-0"
        )}
      />

      {/* Team Indicator Strip */}
      <div className={cn(
        "w-1.5 h-full shrink-0 z-30",
        isCT ? "bg-blue-600" : "bg-orange-600"
      )} />

      {/* Player Portrait - Larger Framing */}
      <PlayerPortrait 
        avatar={p.avatar} 
        isDead={isDead} 
        className="w-[52px] h-full"
      />

      {/* Main Stats Area */}
      <div className={cn(
        "flex-1 flex flex-col justify-center px-3 relative z-10",
        isRightSide ? "text-right items-end" : "text-left items-start"
      )}>
        {/* Name and Health Row */}
        <div className={cn(
          "flex items-baseline gap-2 w-full",
          isRightSide ? "flex-row-reverse" : "flex-row"
        )}>
          <span className={cn(
            "text-[17px] font-black uppercase truncate tracking-tighter text-white drop-shadow-md",
            isDead ? "text-neutral-500" : ""
          )}>
            {p.name}
          </span>
          <span className={cn(
            "text-2xl font-black tabular-nums leading-none ml-auto",
            isDead ? "text-neutral-700" : isLowHP ? "text-red-500 animate-pulse" : "text-white"
          )}>
            {health}
          </span>
        </div>

        {/* Bottom Row: Money, Armor, Stats */}
        <div className={cn(
          "flex items-center gap-3 w-full mt-[-2px]",
          isRightSide ? "flex-row-reverse" : "flex-row"
        )}>
          <span className="text-[13px] font-bold text-green-400 tabular-nums">
            ${money.toLocaleString()}
          </span>
          
          <div className="flex items-center gap-1.5 opacity-80">
             {armor > 0 && (
               <img 
                 src={helmet ? "/icons/cs2/armor_helmet.svg" : "/icons/cs2/armor.svg"} 
                 className="w-4 h-4 brightness-0 invert" 
               />
             )}
             {defuseKit && (
               <img src="/icons/cs2/defuser.svg" className="w-4 h-4 brightness-0 invert" />
             )}
             {c4 && (
               <img src="/icons/cs2/c4.svg" className="w-4 h-4 animate-pulse" />
             )}
          </div>

          <div className={cn(
            "flex items-center gap-1 text-[11px] font-bold text-white/40 ml-auto tabular-nums",
            isRightSide ? "flex-row-reverse" : "flex-row"
          )}>
            <span>{stats.kills}</span>
            <span className="opacity-30">/</span>
            <span>{stats.assists}</span>
            <span className="opacity-30">/</span>
            <span>{stats.deaths}</span>
          </div>
        </div>
      </div>

      {/* Weapons & Utility Strip */}
      <div className={cn(
        "w-22 flex flex-col items-center justify-center gap-1 bg-black/30 border-white/5 shrink-0",
        isRightSide ? "border-r" : "border-l"
      )}>
        {/* Active Weapon Icon */}
        <div className="h-7 flex items-center justify-center px-2">
          {activeWeapon && (
            <img 
              src={getWeaponIcon(activeWeapon.name)} 
              className="h-full w-auto object-contain brightness-0 invert drop-shadow-lg"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          )}
        </div>

        {/* Grenades Grid */}
        <div className="flex gap-1 px-1">
          {grenades.slice(0, 4).map((g, i) => (
            <img 
              key={i} 
              src={getWeaponIcon(g.name)} 
              className="w-4 h-4 brightness-0 invert opacity-40 object-contain"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ))}
        </div>
      </div>

      {/* Low HP Red Overlay Flash */}
      {isLowHP && (
        <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none z-0" />
      )}
    </motion.div>
  );
}
