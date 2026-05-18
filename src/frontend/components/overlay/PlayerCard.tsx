import { Shield, ShieldCheck, Bomb, Scissors } from 'lucide-react';
import { cn } from '../AdminLayout';
import { motion } from 'motion/react';

export function formatWeaponName(name: string) {
  if (!name) return '';
  const clean = name.replace('weapon_', '');
  const map: Record<string, string> = {
    'm4a1_silencer': 'M4A1-S',
    'm4a1': 'M4A4',
    'ak47': 'AK-47',
    'awp': 'AWP',
    'deagle': 'Deagle',
    'usp_silencer': 'USP-S',
    'glock': 'Glock-18',
    'incgrenade': 'Incendiary',
    'molotov': 'Molotov',
    'smokegrenade': 'Smoke',
    'flashbang': 'Flash',
    'hegrenade': 'HE',
    'decoy': 'Decoy',
    'c4': 'C4'
  };
  return map[clean] || clean.toUpperCase();
}

export function PlayerCard({ player, isRightSide, isObserved }: any) {
  const p = player;
  
  const health = p.state?.health ?? 0;
  const armor = p.state?.armor ?? 0;
  const helmet = p.state?.helmet ?? false;
  const money = p.state?.money ?? 0;
  const defuseKit = p.state?.defusekit ?? false;
  const stats = p.match_stats || { kills: 0, assists: 0, deaths: 0 };
  
  const isDead = health <= 0;
  const isCT = p.team === 'CT';
  const teamColorClass = isCT ? 'bg-blue-600' : 'bg-yellow-500';
  const accentBorderClass = isCT ? 'border-blue-500' : 'border-yellow-500';
  
  // Weapons
  const weapons = Object.values<{name: string, type: string, state: string}>(p.weapons || {});
  const mainWeapon = weapons.find(w => ['Rifle', 'SniperRifle', 'Submachine Gun', 'Shotgun', 'Machine Gun'].includes(w.type));
  const pistol = weapons.find(w => w.type === 'Pistol');
  const grenades = weapons.filter(w => w.type === 'Grenade');
  const c4 = weapons.find(w => w.type === 'C4' || w.name === 'weapon_c4');
  
  const activeWeapon = weapons.find(w => w.state === 'active');
  const showWeapon = mainWeapon || pistol;

  return (
    <div className={cn(
      "w-[160px] h-[64px] relative overflow-hidden transition-all duration-300 flex bg-neutral-900/95 border border-white/5 shadow-[0_5px_15px_rgba(0,0,0,0.5)] backdrop-blur-md", 
      isDead ? 'opacity-40 grayscale' : '', 
      isObserved && !isDead ? 'border-white z-10 shadow-[0_0_10px_rgba(255,255,255,0.2)] bg-neutral-800' : 'bg-neutral-950/90',
      isRightSide ? "flex-row-reverse" : "flex-row"
    )}>
      
      {/* Avatar (Side) */}
      <div className="w-[38px] shrink-0 bg-neutral-800/80 border-r border-white/10 flex items-center justify-center relative z-10" style={isRightSide ? {borderRight: 'none', borderLeft: '1px solid rgba(255,255,255,0.1)'} : {}}>
          <span className="text-[9px] text-gray-500 font-bold uppercase rotate-[-90deg] tracking-widest opacity-50">PIC</span>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative w-0">
        
        {/* Top Row: Name, HP, Armor */}
        <div className={cn(
          "h-5 w-full flex items-center justify-between px-1.5",
          isObserved && !isDead ? 'bg-white text-black' : isCT ? 'bg-blue-600/90 text-white' : 'bg-yellow-500/90 text-black',
          isRightSide ? "flex-row-reverse" : "flex-row"
        )}>
          <span className={cn(
              "text-[9px] font-black uppercase truncate flex-1",
              isRightSide ? "text-right" : "text-left"
          )}>
              {p.name}
          </span>
          <div className={cn("flex items-center gap-1 shrink-0", isRightSide ? "flex-row-reverse pl-1" : "pl-1")}>
             {helmet ? <ShieldCheck className="w-[10px] h-[10px] opacity-80" /> : armor > 0 ? <Shield className="w-[10px] h-[10px] opacity-80" /> : null}
             <span className={cn("text-[11px] font-black leading-none tabular-nums", health <= 20 && !isDead ? 'text-red-300 animate-pulse' : 'text-current')}>{health}</span>
          </div>
        </div>

        {/* HP Bar Background (Subtle) under stats */}
        <div 
          className={cn("absolute bottom-0 transition-all duration-500 opacity-20 z-0", 
            isRightSide ? "right-0" : "left-0",
            teamColorClass, 
            health <= 20 && !isDead ? 'bg-red-600 opacity-[0.35] animate-pulse' : ''
          )} 
          style={{ width: `${health}%`, height: 'calc(100% - 20px)' }} 
        />

        <div className="relative z-10 px-1.5 py-1 flex flex-col h-full justify-center gap-[3px]">
          
          {/* Middle Row: Main Weapon, Pistol, Money */}
          <div className={cn("flex items-center justify-between", isRightSide ? "flex-row-reverse" : "flex-row")}>
              <div className={cn("flex items-center gap-1 whitespace-nowrap overflow-hidden pr-2", isRightSide ? "flex-row-reverse pl-2 pr-0" : "flex-row pr-2")}>
                  <span className={cn("text-[9px] font-bold tracking-widest uppercase truncate max-w-[45px]", activeWeapon?.name === mainWeapon?.name ? 'text-white drop-shadow-md' : 'text-gray-400', isRightSide ? "text-right" : "text-left")}>
                     {formatWeaponName(mainWeapon?.name)}
                  </span>
                  {pistol && (
                    <span className={cn("text-[7px] font-bold uppercase truncate max-w-[30px] opacity-70", activeWeapon?.name === pistol?.name ? 'text-white' : 'text-gray-500')}>
                       {formatWeaponName(pistol?.name)}
                    </span>
                  )}
              </div>
              <span className="text-[9px] font-bold text-green-400 drop-shadow-[0_0_2px_green] tabular-nums shrink-0">${money}</span>
          </div>

          {/* Bottom utility & Stats Row */}
          <div className={cn("flex items-center justify-between mt-auto", isRightSide ? "flex-row-reverse" : "flex-row")}>
              <div className={cn("flex items-center gap-[2px] opacity-90", isRightSide ? "flex-row-reverse" : "flex-row")}>
                  {grenades.map((g, i) => (
                     <div key={i} className={cn("w-[4px] h-1.5 rounded-[1px]", 
                       g.name.includes('smoke') ? 'bg-gray-400' : 
                       g.name.includes('flash') ? 'bg-white' : 
                       g.name.includes('molotov') || g.name.includes('inc') ? 'bg-orange-500' : 
                       g.name.includes('hegrenade') ? 'bg-green-600' : 'bg-gray-600'
                     )} />
                  ))}
              </div>
              <div className={cn("flex items-center gap-1.5", isRightSide ? "flex-row-reverse" : "flex-row")}>
                 <span className="text-[7.5px] font-bold text-gray-400 tabular-nums tracking-wider leading-none mt-0.5">{stats.kills}/{stats.assists}/{stats.deaths}</span>
                 <div className={cn("flex items-center gap-0.5", isRightSide ? "flex-row-reverse" : "flex-row")}>
                     {defuseKit && <Scissors className="w-2.5 h-2.5 text-blue-400" />}
                     {c4 && <Bomb className="w-2.5 h-2.5 text-red-500 animate-pulse" />}
                 </div>
              </div>
          </div>

        </div>
      </div>
    </div>
  );
}
