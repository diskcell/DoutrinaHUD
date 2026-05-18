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
  
  // Weapons logic
  const weapons = Object.values<{name: string, type: string, state: string}>(p.weapons || {});
  const mainWeapon = weapons.find(w => ['Rifle', 'SniperRifle', 'Submachine Gun', 'Shotgun', 'Machine Gun'].includes(w.type));
  const pistol = weapons.find(w => w.type === 'Pistol');
  const grenades = weapons.filter(w => w.type === 'Grenade');
  const c4 = weapons.find(w => w.type === 'C4' || w.name === 'weapon_c4');
  const activeWeapon = weapons.find(w => w.state === 'active');

  return (
    <div className={cn(
      "w-[230px] h-[52px] relative flex bg-neutral-900/40 backdrop-blur-md border border-white/5 transition-all duration-300",
      isDead ? 'opacity-30 grayscale saturate-0' : 'opacity-100',
      isObserved && !isDead ? 'ring-2 ring-white z-20 scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)] bg-neutral-800/80' : '',
      isRightSide ? "flex-row-reverse text-right" : "flex-row text-left"
    )}>
      
      {/* HP Bar Background (Full card width) */}
      <div className={cn(
        "absolute bottom-0 left-0 h-[3px] transition-all duration-700 ease-out z-20",
        isDead ? "bg-transparent" : isCT ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
      )} style={{ width: `${health}%` }} />

      {/* Team Color Accent (Side) */}
      <div className={cn(
        "w-1 h-full shrink-0",
        isCT ? "bg-blue-600" : "bg-orange-600"
      )} />

      {/* Main Info Area */}
      <div className="flex-1 flex flex-col justify-between py-1.5 px-3 relative overflow-hidden">
        
        {/* Top Row: Name and Money */}
        <div className={cn("flex items-center justify-between", isRightSide ? "flex-row-reverse" : "flex-row")}>
          <div className="flex items-center gap-2 overflow-hidden">
            <span className={cn(
              "text-sm font-black uppercase truncate tracking-tight text-white drop-shadow-sm",
              isObserved && !isDead ? "text-white" : ""
            )}>
              {p.name}
            </span>
          </div>
          <span className="text-[11px] font-black text-green-400 tabular-nums">
            ${money}
          </span>
        </div>

        {/* Bottom Row: Weapons, Armor, Stats */}
        <div className={cn("flex items-center justify-between mt-auto", isRightSide ? "flex-row-reverse" : "flex-row")}>
           <div className={cn("flex items-center gap-2", isRightSide ? "flex-row-reverse" : "flex-row")}>
              {/* Armor Indicator */}
              {armor > 0 && (
                <div className="text-white/40">
                  {helmet ? <ShieldCheck className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                </div>
              )}
              {/* Main Weapon Text */}
              <span className={cn(
                "text-[10px] font-bold uppercase tracking-widest",
                activeWeapon?.name === mainWeapon?.name ? 'text-white' : 'text-white/30'
              )}>
                {mainWeapon ? formatWeaponName(mainWeapon.name) : pistol ? formatWeaponName(pistol.name) : 'KNIFE'}
              </span>
           </div>

           {/* Utilitaries and Kills */}
           <div className={cn("flex items-center gap-2", isRightSide ? "flex-row-reverse" : "flex-row")}>
              {/* Grenades */}
              <div className="flex gap-1">
                {grenades.map((g, i) => (
                  <div key={i} className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    g.name.includes('smoke') ? 'bg-gray-300' : 
                    g.name.includes('flash') ? 'bg-white' : 
                    g.name.includes('molotov') || g.name.includes('inc') ? 'bg-orange-400' : 'bg-green-500'
                  )} />
                ))}
              </div>
              {/* Kit / Bomb */}
              {(defuseKit || c4) && (
                <div className="flex items-center">
                   {defuseKit && <Scissors className="w-3.5 h-3.5 text-blue-400" />}
                   {c4 && <Bomb className="w-3.5 h-3.5 text-orange-500 animate-pulse" />}
                </div>
              )}
              {/* Kills for current round or total? Let's show ADR/Kills placeholder */}
              <div className={cn(
                "px-1.5 py-0.5 rounded-sm bg-black/40 text-[9px] font-black tabular-nums text-white/50",
              )}>
                {stats.kills}
              </div>
           </div>
        </div>

        {/* Health overlay (very subtle pulse when low) */}
        {health > 0 && health <= 20 && (
          <div className="absolute inset-0 bg-red-600/10 animate-pulse pointer-events-none" />
        )}
      </div>

      {/* HP Indicator (Side) */}
      <div className={cn(
        "w-10 flex flex-col items-center justify-center shrink-0 border-l border-white/5 bg-black/20",
        isRightSide ? "border-l-0 border-r" : ""
      )}>
        <span className={cn(
          "text-lg font-black tabular-nums leading-none",
          isDead ? "text-neutral-700" : health <= 20 ? "text-red-500 animate-pulse" : "text-white"
        )}>
          {health}
        </span>
      </div>
    </div>
  );
}
