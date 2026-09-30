import { cn } from '../AdminLayout';
import { getWeaponIcon } from './OverlayHelpers';

export function PlayerPanel({ player, isRightSide, isObserved, isAutoMode }: any) {
  const p = player;
  
  const health = p.state?.health ?? 0;
  const armor = p.state?.armor ?? 0;
  const helmet = p.state?.helmet ?? false;
  const money = p.state?.money ?? 0;
  const defuseKit = p.state?.defusekit ?? false;
  const stats = p.match_stats || { kills: 0, assists: 0, deaths: 0 };
  
  const isDead = health <= 0;
  const isCT = p.team === 'CT';
  const teamColorClass = isCT ? 'bg-blue-600' : 'bg-orange-600';
  const accentBorderClass = isCT ? 'border-blue-500' : 'border-orange-500';
  
  // Weapons
  const weapons = Object.values<{name: string, type: string, state: string}>(p.weapons || {});
  const mainWeapon = weapons.find(w => ['Rifle', 'SniperRifle', 'Submachine Gun', 'Shotgun', 'Machine Gun'].includes(w.type));
  const pistol = weapons.find(w => w.type === 'Pistol');
  const grenades = weapons.filter(w => w.type === 'Grenade');
  const c4 = weapons.find(w => w.type === 'C4' || w.name === 'weapon_c4');
  
  const activeWeapon = weapons.find(w => w.state === 'active');
  const showWeapon = mainWeapon || pistol || weapons.find(w => w.type === 'Knife');

  return (
    <div className={cn(
      "relative w-[400px] h-[80px] overflow-hidden transition-all duration-300 backdrop-blur-xl flex items-center border border-white/10 shadow-2xl", 
      isDead ? 'opacity-50 grayscale' : '', 
      isObserved && !isDead ? 'scale-[1.03] z-10 shadow-[0_0_30px_rgba(255,255,255,0.15)] bg-neutral-800/90' : 'bg-neutral-950/80',
      isRightSide ? "flex-row-reverse rounded-l-xl" : "flex-row rounded-r-xl"
    )}>
      
      {/* Side Accent Line */}
      <div className={cn(
        "w-1.5 h-full", 
        accentBorderClass,
        isObserved && !isDead ? "bg-white" : teamColorClass
      )} />

      {/* HP Bar Background (Subtle) */}
      <div 
        className={cn("absolute top-0 bottom-0 transition-all duration-500 opacity-[0.15] z-0", 
          teamColorClass, 
          health <= 20 && !isDead ? 'bg-red-600 opacity-40 animate-pulse' : '',
          isRightSide ? 'right-1.5' : 'left-1.5'
        )} 
        style={{ width: `calc(${health}% - 6px)` }} 
      />

      {/* Content Container */}
      <div className={cn("relative z-10 flex h-full flex-1 px-4 py-2", isRightSide ? "flex-row-reverse" : "flex-row")}>
        
        {/* Info Column */}
        <div className={cn("flex flex-col justify-between flex-1 min-w-0", isRightSide ? "items-end" : "items-start")}>
          <div className={cn("flex items-center gap-2", isRightSide ? "flex-row-reverse" : "flex-row")}>
             <span className={cn("font-black tracking-wider uppercase truncate", isObserved && !isDead ? "text-white text-xl" : "text-gray-100 text-lg")}>
               {p.name}
             </span>
             {c4 && (
               <img 
                 src="/icons/cs2/c4.svg" 
                 className="w-5 h-5 animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]" 
                 onError={(e) => (e.currentTarget.style.display = 'none')}
               />
             )}
             {defuseKit && (
               <img 
                 src="/icons/cs2/defuser.svg" 
                 className="w-5 h-5 brightness-0 invert opacity-80" 
                 onError={(e) => (e.currentTarget.style.display = 'none')}
               />
             )}
             {armor > 0 && (
               <img 
                 src={helmet ? "/icons/cs2/armor_helmet.svg" : "/icons/cs2/armor.svg"} 
                 className="w-4 h-4 brightness-0 invert opacity-40" 
                 onError={(e) => (e.currentTarget.style.display = 'none')}
               />
             )}
          </div>
          <div className={cn("flex items-center gap-2 text-[11px] font-bold tracking-widest uppercase truncate mt-0.5", isRightSide ? "flex-row-reverse" : "flex-row")}>
            <span className={cn("w-10 tabular-nums", health <= 20 && !isDead ? 'text-red-400 drop-shadow-[0_0_5px_red]' : 'text-white', isRightSide ? 'text-right' : 'text-left')}>{health}</span>
            <span className="text-gray-600">|</span>
            <span className="text-green-400 drop-shadow-[0_0_2px_green] w-14 tabular-nums">${money}</span>
            <span className="text-gray-600">|</span>
            <span className="text-gray-400 tabular-nums">{stats.kills}/{stats.deaths}/{stats.assists}</span>
          </div>
        </div>

        {/* Weapons Column */}
        <div className={cn("flex flex-col justify-end shrink-0 max-w-[120px]", isRightSide ? "items-start ml-2" : "items-end mr-2")}>
          <div className="flex items-center gap-2 mb-1">
            {showWeapon && (
              <img 
                src={getWeaponIcon(showWeapon.name)} 
                className={cn(
                  "h-5 w-auto object-contain brightness-0 invert",
                  activeWeapon?.name === showWeapon.name ? 'opacity-100' : 'opacity-30'
                )} 
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
            )}
          </div>
          <div className={cn("flex items-center gap-1.5", isRightSide ? "flex-row-reverse" : "flex-row")}>
            {grenades.map((g, i) => (
               <img 
                 key={i} 
                 src={getWeaponIcon(g.name)} 
                 className="w-3 h-4 brightness-0 invert opacity-60 object-contain"
                 onError={(e) => (e.currentTarget.style.display = 'none')}
               />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
