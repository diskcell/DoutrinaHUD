import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useSocket } from '../../context/SocketContext';
import { cn } from '../components/AdminLayout';
import { Check, X, Shield, Swords, Map as MapIcon, Loader2, Trophy } from 'lucide-react';

const MAP_ASSETS: Record<string, string> = {
  'Ancient': 'de_ancient',
  'Anubis': 'de_anubis',
  'Dust2': 'de_dust2',
  'Inferno': 'de_inferno',
  'Mirage': 'de_mirage',
  'Nuke': 'de_nuke',
  'Overpass': 'de_overpass',
};

const getMapThumb = (mapName: string) => {
  const folder = MAP_ASSETS[mapName] || 'de_mirage';
  // Tentamos carregar veto.png, veto.jpg ou veto.webp. 
  // Em ambientes web, o navegador tentará resolver. 
  // Como não sabemos a extensão exata de cada um sem checar o FS no cliente,
  // vamos usar uma estratégia de fallback ou assumir a que foi vista no Mirage (webp) ou Dust2 (jpg).
  // Para ser robusto, vou mapear as extensões conhecidas.
  const EXTENSIONS: Record<string, string> = {
    'Ancient': 'jpg',
    'Anubis': 'jpg',
    'Dust2': 'jpg',
    'Inferno': 'jpg',
    'Mirage': 'webp',
    'Nuke': 'jpg',
    'Overpass': 'webp',
  };
  const ext = EXTENSIONS[mapName] || 'png';
  return `./maps/${folder}/veto.${ext}`;
};

export function CaptainVetoView() {
  const { matchId, teamToken } = useParams<{ matchId: string; teamToken: string }>();
  const { socket, connected } = useSocket();
  const [session, setSession] = useState<any>(null);
  
  const [selectedMaps, setSelectedMaps] = useState<string[]>([]);
  const [isConfirmingAction, setIsConfirmingAction] = useState(false);
  
  const [pendingSide, setPendingSide] = useState<'CT' | 'TR' | null>(null);
  const [isConfirmingSide, setIsConfirmingSide] = useState(false);

  useEffect(() => {
    if (!socket || !connected || !matchId || !teamToken) return;

    socket.emit('veto:join', { matchId, token: teamToken });
    socket.emit('veto:get_status', { matchId, token: teamToken });

    const handleUpdate = (data: any) => {
      if (data?.matchId === matchId) {
        setSession(data);
        // Reset local selection when session updates
        setSelectedMaps([]);
        setIsConfirmingAction(false);
        setPendingSide(null);
        setIsConfirmingSide(false);
      }
    };

    socket.on('veto:update', handleUpdate);
    return () => {
      socket.off('veto:update', handleUpdate);
    };
  }, [socket, connected, matchId, teamToken]);

  if (!session) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto" />
          <h1 className="text-xl font-black uppercase tracking-widest">Carregando Sessão de Veto...</h1>
        </div>
      </div>
    );
  }

  const isLeft = session.viewerSide === 'left' || teamToken === session.leftToken;
  const isRight = session.viewerSide === 'right' || teamToken === session.rightToken;
  const myTeam = isLeft ? session.leftTeam : session.rightTeam;
  const mySide = isLeft ? 'left' : 'right';
  const myReady = isLeft ? session.leftReady : session.rightReady;
  const isMyTurn = session.currentTurn === mySide;
  
  const currentStep = session.flow[session.currentStepIndex];
  const isActionStep = currentStep?.action === 'ban' || currentStep?.action === 'pick';
  const isSideStep = currentStep?.action === 'side_choice';
  
  const requiredAmount = currentStep?.amount || 1;

  const handleReady = () => {
    socket?.emit('veto:captain_ready', { matchId, token: teamToken, ready: !myReady });
  };

  const handleMapClick = (mapName: string) => {
    if (!isMyTurn || session.status !== 'live' || !isActionStep) return;
    if (!session.availableMaps.includes(mapName)) return;

    if (requiredAmount === 1) {
      setSelectedMaps([mapName]);
      setIsConfirmingAction(true);
    } else {
      if (selectedMaps.includes(mapName)) {
        setSelectedMaps(prev => prev.filter(m => m !== mapName));
      } else if (selectedMaps.length < requiredAmount) {
        setSelectedMaps(prev => [...prev, mapName]);
      }
    }
  };

  const confirmAction = () => {
    if (selectedMaps.length !== requiredAmount) return;
    socket?.emit('veto:submit_action', { matchId, token: teamToken, mapNames: selectedMaps });
  };

  const handleSideClick = (side: 'CT' | 'TR') => {
    if (!isMyTurn || session.status !== 'live' || !isSideStep) return;
    setPendingSide(side);
    setIsConfirmingSide(true);
  };

  const confirmSide = () => {
    if (!pendingSide) return;
    socket?.emit('veto:submit_side_choice', { matchId, token: teamToken, startingSide: pendingSide });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans flex flex-col overflow-x-hidden">
      
      {/* Header */}
      <header className="bg-neutral-900/50 border-b border-white/5 p-6 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center border-2 shadow-lg",
              isLeft ? "bg-blue-600/20 border-blue-500 shadow-blue-500/20" : "bg-orange-600/20 border-orange-500 shadow-orange-500/20"
            )}>
              {myTeam?.logo ? <img src={myTeam.logo} className="w-8 h-8 object-contain" /> : <Shield className="w-6 h-6" />}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black text-neutral-500 uppercase tracking-widest">Painel do Capitão</span>
              <span className="text-xl font-black uppercase italic tracking-tighter">{myTeam?.name || 'Seu Time'}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em]">Formato da Série</span>
              <span className="text-sm font-bold text-white uppercase">{session.format === 'BO1' ? 'Melhor de 1' : 'Melhor de 3'}</span>
            </div>
            
            {(session.status === 'waiting' || session.status === 'setup') ? (
              <button 
                onClick={handleReady}
                className={cn(
                  "px-6 py-2.5 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2",
                  myReady 
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/20" 
                    : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white"
                )}
              >
                {myReady ? <Check className="w-4 h-4" /> : null}
                {myReady ? 'ESTOU PRONTO' : 'CLIQUE QUANDO ESTIVER PRONTO'}
              </button>
            ) : (
              <div className={cn(
                "px-4 py-2 rounded-lg border text-[10px] font-black uppercase tracking-[0.2em]",
                session.status === 'finished' ? "bg-neutral-800 border-neutral-700 text-neutral-400" : "bg-blue-600/20 border-blue-500 text-blue-400"
              )}>
                {session.status === 'finished' ? 'VETO FINALIZADO' : 'VETO EM ANDAMENTO'}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 space-y-8">
        
        {/* Turn Status */}
        <section className="relative">
          <AnimatePresence mode="wait">
            {session.status === 'waiting' || session.status === 'setup' ? (
              <motion.div 
                key="waiting"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-neutral-900 border border-white/5 rounded-2xl p-8 text-center space-y-4 shadow-2xl"
              >
                <div className="w-16 h-16 bg-neutral-950 rounded-full flex items-center justify-center mx-auto border border-white/10">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                </div>
                <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">Aguardando Início</h2>
                  <p className="text-neutral-500 text-sm mt-2">
                    {session.leftReady && session.rightReady 
                      ? "Ambos os capitães estão prontos! O administrador iniciará o veto em breve." 
                      : "Aguardando que ambos os capitães marquem 'Pronto' para começar."}
                  </p>
                </div>
                <div className="flex items-center justify-center gap-12 pt-4">
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", session.leftReady ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-neutral-800")} />
                    <span className="text-[10px] font-black text-neutral-500 uppercase">{session.leftTeam?.name || 'Time Esquerda'}</span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className={cn("w-3 h-3 rounded-full", session.rightReady ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-neutral-800")} />
                    <span className="text-[10px] font-black text-neutral-500 uppercase">{session.rightTeam?.name || 'Time Direita'}</span>
                  </div>
                </div>
              </motion.div>
            ) : session.status === 'live' ? (
              <motion.div 
                key="live"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  "bg-neutral-900 border-2 rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-2xl transition-colors duration-500",
                  isMyTurn ? "border-emerald-500 shadow-emerald-500/10" : "border-white/5"
                )}
              >
                <div className={cn(
                  "w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500",
                  isMyTurn ? "bg-emerald-600 scale-110 shadow-emerald-500/20" : "bg-neutral-800"
                )}>
                  {isMyTurn ? <Swords className="w-10 h-10 text-white" /> : <Loader2 className="w-10 h-10 text-neutral-600 animate-spin" />}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className={cn(
                    "text-3xl font-black uppercase italic tracking-tighter mb-1 transition-colors duration-500",
                    isMyTurn ? "text-white" : "text-neutral-500"
                  )}>
                    {isMyTurn 
                      ? `SUA VEZ: ${currentStep.label.replace('{leftTeam}', session.leftTeam?.name).replace('{rightTeam}', session.rightTeam?.name).toUpperCase()}` 
                      : 'AGUARDANDO ADVERSÁRIO...'}
                  </h2>
                  <p className="text-neutral-500 text-sm">
                    {isMyTurn 
                      ? (isSideStep ? "Selecione o lado que deseja começar a partida." : `Selecione ${requiredAmount} mapa${requiredAmount > 1 ? 's' : ''} abaixo.`)
                      : "O capitão adversário está tomando uma decisão."}
                  </p>
                </div>
                {isMyTurn && (
                  <div className="flex flex-col items-center gap-1 bg-neutral-950 px-6 py-3 rounded-xl border border-white/5">
                    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">AÇÃO ATUAL</span>
                    <span className={cn(
                      "text-xl font-black uppercase italic",
                      currentStep.action === 'ban' ? "text-red-500" : "text-emerald-500"
                    )}>
                      {currentStep.action === 'ban' ? 'BANIR' : currentStep.action === 'pick' ? 'ESCOLHER' : 'LADO INICIAL'}
                    </span>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="finished"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neutral-900 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4 shadow-2xl shadow-emerald-500/5"
              >
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/50">
                  <Trophy className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-emerald-500">Veto Concluído!</h2>
                <p className="text-neutral-500 text-sm max-w-lg mx-auto">
                  A série foi definida. Confira os detalhes abaixo. Boa sorte na partida!
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Action Components */}
        {session.status === 'live' && isMyTurn && isSideStep && (
          <section className="bg-neutral-900 border border-white/5 rounded-2xl p-10 flex flex-col items-center gap-8 animate-in fade-in slide-in-from-bottom-4">
             <div className="text-center space-y-2">
                <h3 className="text-sm font-black text-neutral-500 uppercase tracking-[0.3em]">Escolha o Lado Inicial</h3>
                <p className="text-white/60 text-sm">Seu time deve escolher se começa como CT ou Terrorista.</p>
             </div>
             <div className="flex gap-6 w-full max-w-md">
                <button 
                  onClick={() => handleSideClick('CT')}
                  className="flex-1 aspect-square bg-blue-600/10 border-2 border-blue-500 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-blue-600 hover:text-white transition-all group shadow-xl shadow-blue-500/5"
                >
                   <Shield className="w-16 h-16 text-blue-500 group-hover:text-white" />
                   <span className="text-2xl font-black italic uppercase tracking-tighter">Começar CT</span>
                </button>
                <button 
                  onClick={() => handleSideClick('TR')}
                  className="flex-1 aspect-square bg-orange-600/10 border-2 border-orange-500 rounded-3xl flex flex-col items-center justify-center gap-4 hover:bg-orange-600 hover:text-white transition-all group shadow-xl shadow-orange-500/5"
                >
                   <Swords className="w-16 h-16 text-orange-500 group-hover:text-white" />
                   <span className="text-2xl font-black italic uppercase tracking-tighter">Começar TR</span>
                </button>
             </div>
          </section>
        )}

        {/* Map Pool */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <MapIcon className="w-5 h-5 text-neutral-500" />
            <h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.3em]">Map Pool Ativo</h3>
            {isMyTurn && isActionStep && requiredAmount > 1 && (
              <div className="px-3 py-1 bg-amber-500 rounded text-[10px] font-black text-white uppercase animate-pulse">
                Selecione {requiredAmount} mapas: {selectedMaps.length}/{requiredAmount}
              </div>
            )}
            <div className="h-[1px] flex-1 bg-white/5" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
            {session.activeMapPool.map((mapName: string) => {
              const action = session.actions.find((a: any) => (a.mapName === mapName || (a.mapNames && a.mapNames.includes(mapName))));
              const isAvailable = session.availableMaps.includes(mapName);
              const isSelected = selectedMaps.includes(mapName);

              return (
                <button
                  key={mapName}
                  disabled={!isAvailable || !isMyTurn || session.status !== 'live' || !isActionStep}
                  onClick={() => handleMapClick(mapName)}
                  className={cn(
                    "relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all duration-300 group",
                    isSelected ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)] scale-105 z-10" : 
                    !isAvailable ? "border-neutral-800 opacity-40 grayscale pointer-events-none" : 
                    isMyTurn ? "border-white/10 hover:border-white/30 hover:scale-105" : "border-white/5 opacity-60"
                  )}
                >
                  <img src={getMapThumb(mapName)} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                  
                  <div className="absolute inset-0 p-4 flex flex-col justify-end">
                    <span className="text-lg font-black uppercase italic tracking-tighter drop-shadow-lg">{mapName}</span>
                    {action && (
                      <div className={cn(
                        "mt-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest self-start",
                        action.action === 'ban' ? "bg-red-600 text-white" : action.action === 'decider' ? "bg-amber-500 text-white" : "bg-emerald-600 text-white"
                      )}>
                        {action.action === 'ban' ? 'BANIDO' : action.action === 'decider' ? 'DECISOR' : 'ESCOLHIDO'}
                      </div>
                    )}
                  </div>

                  {action?.action === 'ban' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-950/20 backdrop-blur-[1px]">
                      <X className="w-12 h-12 text-red-600 opacity-60" />
                    </div>
                  )}
                  
                  {isSelected && requiredAmount > 1 && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                       <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
          
          {isMyTurn && isActionStep && requiredAmount > 1 && selectedMaps.length === requiredAmount && (
            <div className="flex justify-center pt-4">
               <button 
                onClick={() => setIsConfirmingAction(true)}
                className="px-12 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-sm rounded-2xl transition-all shadow-2xl shadow-emerald-900/20"
               >
                 Confirmar Banimento dos Mapas Selecionados
               </button>
            </div>
          )}
        </section>

        {/* Selected Maps Summary */}
        {session.selectedMaps.length > 0 && (
          <section className="space-y-6 pt-8 border-t border-white/5">
            <div className="flex items-center gap-4">
              <Check className="w-5 h-5 text-neutral-500" />
              <h3 className="text-xs font-black text-neutral-500 uppercase tracking-[0.3em]">Série Definida</h3>
              <div className="h-[1px] flex-1 bg-white/5" />
            </div>

            <div className="flex flex-wrap gap-4">
              {session.selectedMaps.map((map: any) => (
                <div key={map.mapName} className="bg-neutral-900 border border-white/5 rounded-xl p-4 flex items-center gap-4 min-w-[240px]">
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center text-sm font-black",
                    map.pickedBy === 'decider' ? "bg-amber-500/20 text-amber-500" : map.pickedBy === 'left' ? "bg-blue-600/20 text-blue-500" : "bg-orange-600/20 text-orange-500"
                  )}>
                    {map.mapNumber === 3 ? 'DEC' : `M${map.mapNumber}`}
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-[9px] font-black text-neutral-500 uppercase tracking-widest">
                      {map.pickedBy === 'decider' ? 'MAPA DECISOR' : `ESCOLHA DE ${map.pickedBy === 'left' ? session.leftTeam?.tag : session.rightTeam?.tag}`}
                    </span>
                    <span className="text-xl font-black uppercase italic tracking-tighter">{map.mapName}</span>
                  </div>
                  <div className="flex flex-col items-end">
                     <span className="text-[8px] font-black text-neutral-500 uppercase tracking-widest">Lado Inicial</span>
                     <span className={cn(
                       "text-xs font-black",
                       map.startingSide === 'CT' ? "text-blue-500" : map.startingSide === 'TR' ? "text-orange-500" : "text-neutral-600"
                     )}>
                       {map.startingSide || (map.sideChoiceBy === 'knife' ? 'Knife Round' : 'A definir')}
                     </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Confirmation Modals */}
      <AnimatePresence>
        {isConfirmingAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <h3 className="text-sm font-black text-neutral-500 uppercase tracking-[0.3em]">Confirmar Ação</h3>
                <div className="text-3xl font-black uppercase italic tracking-tighter">
                  {currentStep.action === 'ban' ? 'BANIR' : 'ESCOLHER'} {selectedMaps.length > 1 ? `${selectedMaps.length} MAPAS` : selectedMaps[0]}?
                </div>
                <p className="text-neutral-500 text-sm">
                  Esta ação não pode ser desfeita.
                </p>
              </div>

              <div className="flex gap-2 justify-center">
                 {selectedMaps.map(m => (
                    <div key={m} className="w-20 aspect-[3/4] rounded-lg overflow-hidden border border-white/10 relative">
                       <img src={getMapThumb(m)} className="w-full h-full object-cover" />
                       <div className="absolute inset-0 bg-black/40" />
                       <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black uppercase text-white/60">{m}</div>
                    </div>
                 ))}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { setIsConfirmingAction(false); if (requiredAmount === 1) setSelectedMaps([]); }}
                  className="flex-1 py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-black uppercase text-xs rounded-2xl transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={confirmAction}
                  className={cn(
                    "flex-1 py-4 text-white font-black uppercase text-xs rounded-2xl transition-all shadow-lg",
                    currentStep.action === 'ban' ? "bg-red-600 hover:bg-red-500 shadow-red-900/20" : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20"
                  )}
                >
                  CONFIRMAR
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isConfirmingSide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-900 border border-white/10 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-8"
            >
              <div className="text-center space-y-2">
                <h3 className="text-sm font-black text-neutral-500 uppercase tracking-[0.3em]">Confirmar Lado Inicial</h3>
                <div className="text-3xl font-black uppercase italic tracking-tighter">
                  Começar como {pendingSide === 'CT' ? 'Contra-Terrorista' : 'Terrorista'}?
                </div>
              </div>

              <div className="flex items-center justify-center">
                 {pendingSide === 'CT' ? (
                   <Shield className="w-24 h-24 text-blue-500" />
                 ) : (
                   <Swords className="w-24 h-24 text-orange-500" />
                 )}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { setIsConfirmingSide(false); setPendingSide(null); }}
                  className="flex-1 py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-black uppercase text-xs rounded-2xl transition-all"
                >
                  CANCELAR
                </button>
                <button 
                  onClick={confirmSide}
                  className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-2xl transition-all shadow-lg shadow-emerald-900/20"
                >
                  CONFIRMAR
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="p-8 text-center border-t border-white/5">
        <span className="text-[10px] font-black text-neutral-700 uppercase tracking-[0.5em]">DoutrinaHUD Engine — Veto System v2.1</span>
      </footer>

    </div>
  );
}
