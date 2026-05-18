import { Shield, ShieldAlert, Crosshair, Dagger } from 'lucide-react';
import { cn } from '../AdminLayout'; // Ajuste o caminho se necessário

interface PlayerPanelsProps {
  players: any[];
  isRightSide: boolean;
  isObserved: string | null;
  isAutoMode: boolean;
}

// Função simples para traduzir o nome da arma do CS2 para um ícone temporário
const getWeaponIcon = (weaponName: string) => {
  if (!weaponName) return null;
  if (weaponName.includes('knife') || weaponName.includes('bayonet')) return <Dagger className="w-5 h-5 opacity-70" />;
  if (weaponName.includes('pistol') || weaponName.includes('deagle') || weaponName.includes('glock')) return <span className="font-bold text-xs opacity-70">PISTOL</span>;
  return <Crosshair className="w-5 h-5 opacity-70" />; // Default para Rifles/SMGs
};

export function PlayerPanels({ players, isRightSide, isObserved, isAutoMode }: PlayerPanelsProps) {
  if (!players || players.length === 0) return null;

  const teamColor = players[0]?.team === 'CT' ? 'bg-blue-600' : 'bg-yellow-500';
  const teamBorder = players[0]?.team === 'CT' ? 'border-blue-500' : 'border-yellow-500';

  return (
    <div className={cn(
      "absolute bottom-8 flex gap-3",
      isRightSide ? "right-12 flex-row-reverse" : "left-12 flex-row"
    )}>
      {players.map((player) => {
        const isDead = player.state?.health === 0;
        const isActive = isObserved === player.steamid;
        const hp = player.state?.health || 0;
        
        // Pega a arma ativa (se houver)
        const activeWeapon = player.weapons 
          ? Object.values(player.weapons).find((w: any) => w.state === 'active') as any
          : null;

        return (
          <div 
            key={player.steamid}
            className={cn(
              "w-[300px] h-[70px] bg-neutral-900/95 backdrop-blur-md rounded-lg overflow-hidden border-b-4 flex flex-col relative transition-all duration-200 shadow-xl",
              teamBorder,
              isActive ? "scale-105 border-white ring-2 ring-white/20" : "",
              isDead ? "opacity-40 grayscale" : ""
            )}
          >
            {/* Barra de Vida Background */}
            <div className="absolute top-0 left-0 w-full h-full bg-neutral-800/50 z-0" />
            
            {/* Barra de Vida Preenchimento (Animada) */}
            <div 
              className={cn("absolute top-0 left-0 h-full z-0 transition-all duration-500 opacity-20", teamColor)}
              style={{ width: `${hp}%` }}
            />

            {/* Conteúdo Principal */}
            <div className="relative z-10 flex flex-col h-full p-2 px-3 justify-between">
              
              {/* Topo: Nome e HP */}
              <div className="flex justify-between items-center">
                <span className={cn(
                  "font-bold text-sm tracking-wide truncate max-w-[180px]",
                  isActive ? "text-white" : "text-neutral-200"
                )}>
                  {player.name}
                </span>
                <span className={cn(
                  "font-black text-lg font-mono",
                  hp <= 20 ? "text-red-500 animate-pulse" : "text-white"
                )}>
                  {hp}
                </span>
              </div>

              {/* Base: Colete, Dinheiro e Arma */}
              <div className="flex justify-between items-end">
                <div className="flex items-center gap-3">
                  {/* Dinheiro */}
                  <span className="text-green-400 font-mono font-bold text-sm tracking-tighter">
                    ${player.state?.money || 0}
                  </span>
                  
                  {/* Armor / Helmet Indicator */}
                  {player.state?.armor > 0 && (
                    <div className="flex items-center">
                      {player.state?.helmet ? (
                        <ShieldAlert className="w-4 h-4 text-neutral-300" />
                      ) : (
                        <Shield className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                  )}
                </div>

                {/* Ícone da Arma Ativa */}
                <div className="text-white flex items-center justify-center">
                  {getWeaponIcon(activeWeapon?.name)}
                </div>
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
}