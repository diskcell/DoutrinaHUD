import { cn } from '../../components/AdminLayout'; // Ajuste o caminho do 'cn' se necessário

interface ScoreboardProps {
  match: any;
  timerDisplay: string;
  timerPhase: string;
  round: any;
  autoMode: boolean;
  gsiState: any;
}

export function Scoreboard({ match, timerDisplay, timerPhase, round, autoMode, gsiState }: ScoreboardProps) {
  // Lê os dados do CS2 se o Auto Mode estiver ligado
  const map = autoMode && gsiState?.map ? gsiState.map : null;

  // Cruza a informação do time com o lado que eles estão jogando para pegar o placar certo
  const scoreHome = autoMode && map 
    ? (match.sideHome === 'CT' ? map.team_ct?.score : map.team_t?.score) || 0 
    : (match.scoreHome || 0);

  const scoreAway = autoMode && map 
    ? (match.sideHome === 'CT' ? map.team_t?.score : map.team_ct?.score) || 0 
    : (match.scoreAway || 0);

  const teamHomeName = match.teamHome?.name || 'TIME A';
  const teamAwayName = match.teamAway?.name || 'TIME B';
  const format = match.format || 'BO3';

  // Lógica de cores baseada no lado
  const homeColor = match.sideHome === 'CT' ? 'border-blue-500' : 'border-yellow-500';
  const awayColor = match.sideHome === 'TR' ? 'border-blue-500' : 'border-yellow-500';

  // Verifica estado da bomba
  const isBombPlanted = timerPhase === 'bomb' || round?.bomb === 'planted';

  return (
    <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-6 flex items-start justify-center gap-2 z-50">
      
      {/* Time Home (Esquerda) */}
      <div className="flex items-stretch shadow-2xl">
        <div className="bg-neutral-900/90 backdrop-blur-md px-8 py-3 flex flex-col justify-center items-end min-w-[250px] rounded-l-xl border-t border-l border-b border-white/10">
          <span className="text-2xl font-black text-white tracking-widest uppercase truncate max-w-[200px]">
            {teamHomeName}
          </span>
        </div>
        <div className={cn(
          "w-16 flex items-center justify-center bg-neutral-950/95 backdrop-blur-md border-b-4", 
          homeColor
        )}>
          <span className="text-4xl font-black text-white">{scoreHome}</span>
        </div>
      </div>

      {/* Relógio Central */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "w-32 py-2 flex items-center justify-center rounded-b-xl shadow-2xl transition-colors duration-300",
          isBombPlanted ? "bg-red-600 animate-pulse border-red-500" : "bg-neutral-950/95 border-white/10 backdrop-blur-md border"
        )}>
          <span className={cn(
            "text-4xl font-black tracking-tighter tabular-nums",
            isBombPlanted ? "text-white" : timerPhase === 'live' ? "text-white" : "text-yellow-500"
          )}>
            {isBombPlanted ? "BOMB" : timerDisplay}
          </span>
        </div>
        
        {/* Info da Partida embaixo do relógio */}
        <div className="mt-2 px-4 py-1 bg-neutral-900/80 backdrop-blur-sm rounded-full text-[10px] font-bold text-neutral-400 uppercase tracking-[0.2em] shadow-lg border border-white/5">
          {format} • ROUND {map?.round ? map.round + 1 : 1}
        </div>
      </div>

      {/* Time Away (Direita) */}
      <div className="flex items-stretch shadow-2xl flex-row-reverse">
        <div className="bg-neutral-900/90 backdrop-blur-md px-8 py-3 flex flex-col justify-center items-start min-w-[250px] rounded-r-xl border-t border-r border-b border-white/10">
          <span className="text-2xl font-black text-white tracking-widest uppercase truncate max-w-[200px]">
            {teamAwayName}
          </span>
        </div>
        <div className={cn(
          "w-16 flex items-center justify-center bg-neutral-950/95 backdrop-blur-md border-b-4", 
          awayColor
        )}>
          <span className="text-4xl font-black text-white">{scoreAway}</span>
        </div>
      </div>

    </div>
  );
}