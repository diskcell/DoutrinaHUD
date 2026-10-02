import { useState, useEffect } from 'react';
import {
  Play,
  Square,
  RefreshCcw,
  ArrowLeftRight,
  MonitorPlay,
  Pause,
  Swords,
  Map as MapIcon,
  Trophy,
  FastForward,
  Copy,
  Check,
  Link as LinkIcon,
  Users,
} from 'lucide-react';

import { cn } from '../components/AdminLayout';
import { useSocket } from '../../context/SocketContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useOptionalCloudSession } from '../context/CloudSessionContext';
import { listCloudTeams } from '../lib/cloudData';
import { loadCloudLiveBootstrap } from '../lib/cloudLive';

const MOCK_TEAMS = [
  { id: 1, name: 'FURIA Esports', tag: 'FUR', logo: '' },
  { id: 2, name: 'Natus Vincere', tag: 'NAVI', logo: '' },
];

const FORMATS = ['BO1', 'BO3'];

const STAGES = [
  'Grupos',
  'Mata-mata',
  'Quartas de Final',
  'Semifinal',
  'Grande Final',
];

const STATUSES = [
  'Warmup',
  'Live',
  'Pause',
  'Technical Pause',
  'Knife Round',
  'Overtime',
  'Match Point',
  'Finished',
];

const MAPS = [
  'Ancient',
  'Anubis',
  'Dust2',
  'Inferno',
  'Mirage',
  'Nuke',
  'Overpass',
];

export function LiveControl() {
  const { socket, connected, transport, sessionId } = useSocket();
  const cloudSession = useOptionalCloudSession();

  const [teams, setTeams] = useState<any[]>(() =>
    isSupabaseConfigured ? [] : MOCK_TEAMS
  );
  const [teamsLoaded, setTeamsLoaded] = useState(false);
  const [hudHydrated, setHudHydrated] = useState(false);

  /*
   ============================================================
   SETUP STATE
   ============================================================
  */

  const [teamHomeId, setTeamHomeId] = useState<number | ''>('');
  const [teamAwayId, setTeamAwayId] = useState<number | ''>('');

  const [format, setFormat] = useState('BO3');
  const [stage, setStage] = useState('Semifinal');
  const [currentMap, setCurrentMap] = useState('Mirage');

  /*
   ============================================================
   LIVE MATCH STATE
   ============================================================
  */

  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);

  const [scoreSeriesHome, setScoreSeriesHome] = useState(0);
  const [scoreSeriesAway, setScoreSeriesAway] = useState(0);

  const [sideHome, setSideHome] = useState<'CT' | 'TR'>('CT');
  const [matchStatus, setMatchStatus] = useState('Warmup');
  const [manualStatusOverride, setManualStatusOverride] = useState(false);

  /*
   ============================================================
   RECOVER PREVIOUS STATE
   ============================================================
  */

  useEffect(() => {
    if (!socket || !connected) return;

    let cancelled = false;

    const handleInitialSync = (data: any) => {
      if (!cancelled && data && data.match) {
        console.log('Recuperando estado anterior:', data.match);
        const m = data.match;
        
        setTeamHomeId(m.teamHome?.id ? Number(m.teamHome.id) : '');
        setTeamAwayId(m.teamAway?.id ? Number(m.teamAway.id) : '');
        
        if (m.scoreHome !== undefined) setScoreHome(m.scoreHome);
        if (m.scoreAway !== undefined) setScoreAway(m.scoreAway);
        
        if (m.scoreSeriesHome !== undefined) setScoreSeriesHome(m.scoreSeriesHome);
        if (m.scoreSeriesAway !== undefined) setScoreSeriesAway(m.scoreSeriesAway);
        
        if (m.format) setFormat(m.format);
        if (m.stage) setStage(m.stage);
        if (m.currentMap) setCurrentMap(m.currentMap);
        if (m.sideHome) setSideHome(m.sideHome);
        if (m.matchStatus) {
          setMatchStatus(m.matchStatus);
          setManualStatusOverride(
            data.manualStatusOverride !== undefined
              ? Boolean(data.manualStatusOverride)
              : m.matchStatus !== 'Live'
          );
        }
        if (data.autoMode !== undefined) setAutoMode(data.autoMode);
      }

      if (!cancelled) setHudHydrated(true);
    };

    if (transport === 'supabase' && sessionId !== 'local') {
      setHudHydrated(false);

      loadCloudLiveBootstrap(sessionId)
        .then((bootstrap) => {
          if (cancelled) return;
          if (bootstrap?.latestHudState) {
            handleInitialSync(bootstrap.latestHudState);
          }
          setHudHydrated(true);
        })
        .catch((error) => {
          console.error('Falha ao recuperar configuracao da partida:', error);
        });

      return () => {
        cancelled = true;
      };
    }

    socket.on('hud:update', handleInitialSync);
    socket.emit('overlay:ready');

    return () => {
      cancelled = true;
      socket.off('hud:update', handleInitialSync);
    };
  }, [socket, connected, transport, sessionId]);

  /*
   ============================================================
   SERIES / VETO STATE (CAPTAIN CONTROLLED)
   ============================================================
  */

  const [vetoSession, setVetoSession] = useState<any>(null);
  const vetoMatchId = transport === 'supabase' && sessionId !== 'local' ? sessionId : 'default';

  useEffect(() => {
    if (!socket || !connected) return;

    socket.emit('veto:get_status', { matchId: vetoMatchId });

    const handleVetoUpdate = (data: any) => {
      setVetoSession(data);
    };

    const handleVetoError = (data: any) => {
      console.error('ERRO DE VETO:', data);
      alert(`Erro no Servidor: ${data.message}`);
    };

    socket.on('veto:update', handleVetoUpdate);
    socket.on('veto:error', handleVetoError);

    return () => {
      socket.off('veto:update', handleVetoUpdate);
      socket.off('veto:error', handleVetoError);
    };
  }, [socket, connected, vetoMatchId]);

  const handleCreateVeto = () => {
    if (!socket || !connected) {
      alert('Socket não conectado.');
      return;
    }

    if (!teamHomeId || !teamAwayId) {
      alert('Selecione ambos os times antes de criar o veto.');
      return;
    }

    const teamHome = teams.find(t => t.id === Number(teamHomeId));
    const teamAway = teams.find(t => t.id === Number(teamAwayId));

    socket.emit('veto:create', {
      matchId: vetoMatchId,
      format,
      leftTeam: teamHome,
      rightTeam: teamAway
    });
  };

  const handleStartVeto = () => {
    socket?.emit('veto:start', { matchId: vetoMatchId });
  };

  const handleResetVeto = () => {
    if (confirm('Deseja resetar o progresso do veto? (Mantém os times e links)')) {
      socket?.emit('veto:reset', { matchId: vetoMatchId });
    }
  };

  const handleDeleteVeto = () => {
    if (confirm('Deseja EXCLUIR a sessão de veto? (Permite escolher novos times)')) {
      socket?.emit('veto:delete', { matchId: vetoMatchId });
      setVetoSession(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Link copiado!');
  };

  const getCaptainLink = (token: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const sessionQuery = transport === 'supabase'
      ? `?session=${encodeURIComponent(sessionId)}`
      : '';
    return `${baseUrl}#/captain-veto/${encodeURIComponent(vetoMatchId)}/${encodeURIComponent(token)}${sessionQuery}`;
  };

  const vetoOverlayUrl = `${window.location.origin}${window.location.pathname}#/veto${
    transport === 'supabase' ? `?session=${encodeURIComponent(sessionId)}` : ''
  }`;

  /*
   ============================================================
   GSI AUTO MODE
   ============================================================
  */

  const [autoMode, setAutoMode] = useState(true);
  const [gsiData, setGsiData] = useState<any>(null);

  /*
   ============================================================
   LOAD TEAMS
   ============================================================
  */

  useEffect(() => {
    if (isSupabaseConfigured && cloudSession) {
      setTeamsLoaded(false);
      setTeams([]);

      listCloudTeams(cloudSession.workspaceId)
        .then((data) => {
          setTeams(data);
          setTeamsLoaded(true);
        })
        .catch((error) => {
          setTeamsLoaded(false);
          console.error('Erro ao carregar times do Supabase:', error);
        });
      return;
    }

    fetch('/api/teams')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTeams(data);
        }
        setTeamsLoaded(true);
      })
      .catch(() => setTeamsLoaded(true));
  }, [cloudSession]);

  /*
   ============================================================
   SOCKET → GSI UPDATE
   ============================================================
  */

  useEffect(() => {
    if (!socket || !connected) return;

    const handleGsiUpdate = (data: any) => {
      setGsiData(data);
    };

    socket.on('gsi:update', handleGsiUpdate);

    return () => {
      socket.off('gsi:update', handleGsiUpdate);
    };
  }, [socket, connected]);

  /*
   ============================================================
   AUTO SYNC VIA GSI
   ============================================================
  */

  useEffect(() => {
    if (!autoMode || !gsiData?.map) return;

    const map = gsiData.map;
    const round = gsiData.round;

    if (sideHome === 'CT') {
      setScoreHome(map.team_ct?.score || 0);
      setScoreAway(map.team_t?.score || 0);
    } else {
      setScoreHome(map.team_t?.score || 0);
      setScoreAway(map.team_ct?.score || 0);
    }

    if (!manualStatusOverride) {
      if (map.phase === 'warmup') {
        setMatchStatus('Warmup');
      }

      if (map.phase === 'live') {
        setMatchStatus('Live');
      }

      if (map.phase === 'intermission') {
        setMatchStatus('Pause');
      }

      if (map.phase === 'gameover') {
        setMatchStatus('Finished');
      }

      if (round?.bomb === 'planted') {
        setMatchStatus('Live');
      }
    }
  }, [gsiData, autoMode, sideHome, manualStatusOverride]);

  /*
   ============================================================
   SYNC OVERLAY
   ============================================================
  */

  const handleSyncOverlay = () => {
    if (!socket || !connected) return;
    if (!teamsLoaded || !hudHydrated) return;

    const teamLeft = teams.find(
      (t) => t.id === Number(teamHomeId)
    );

    const teamRight = teams.find(
      (t) => t.id === Number(teamAwayId)
    );

    socket.emit('hud:command', {
      type: 'SYNC',
      forceUpdate: true,
      autoMode,
      manualStatusOverride,

      match: {
        teamHome: teamLeft || null,
        teamAway: teamRight || null,

        scoreHome,
        scoreAway,
        
        scoreSeriesHome,
        scoreSeriesAway,

        format,
        stage,
        currentMap,

        sideHome,
        matchStatus,

        series: {
          format,
          scoreHome: scoreSeriesHome,
          scoreAway: scoreSeriesAway,
          maps: vetoSession?.selectedMaps ? vetoSession.selectedMaps.map((a: any) => ({
            id: a.mapNumber,
            name: a.mapName,
            type: a.pickedBy === 'decider' ? 'decider' : 'pick',
            pickedBy: a.pickedBy,
            status: a.mapName === currentMap ? 'live' : 'pending',
            scoreHome: 0,
            scoreAway: 0
          })) : []
        },

        veto: {
          isActive: !!vetoSession,
          format: vetoSession?.format || format,
          isFinished: vetoSession?.status === 'finished',
          revealedActions: vetoSession?.actions || [],
          selectedMaps: vetoSession?.selectedMaps || [],
          currentRevealId: vetoSession?.actions?.length > 0 ? vetoSession.actions[vetoSession.actions.length - 1].id : null
        }
      },
    });
  };

  const handleMatchStatusSelect = (status: string) => {
    setManualStatusOverride(true);
    setMatchStatus(status);
  };

  const handleMatchStatusAuto = () => {
    setManualStatusOverride(false);

    if (!gsiData?.map) return;

    if (gsiData.map.phase === 'warmup') setMatchStatus('Warmup');
    else if (gsiData.map.phase === 'intermission') setMatchStatus('Pause');
    else if (gsiData.map.phase === 'gameover') setMatchStatus('Finished');
    else setMatchStatus('Live');
  };

  /*
   ============================================================
   AUTO PUSH TO OVERLAY
   ============================================================
  */

  useEffect(() => {
    if (!teamsLoaded || !hudHydrated) {
      return;
    }

    handleSyncOverlay();
  }, [
    connected,
    transport,
    sessionId,
    teamsLoaded,
    hudHydrated,
    teams,
    scoreHome,
    scoreAway,
    scoreSeriesHome,
    scoreSeriesAway,
    sideHome,
    matchStatus,
    currentMap,
    format,
    stage,
    teamHomeId,
    teamAwayId,
    autoMode,
    manualStatusOverride,
    vetoSession,
  ]);

  /*
   ============================================================
   MANUAL CONTROLS
   ============================================================
  */

  const addScore = (
    team: 'home' | 'away',
    amount: number
  ) => {
    if (autoMode) return;

    if (team === 'home') {
      setScoreHome((prev) => Math.max(0, prev + amount));
    } else {
      setScoreAway((prev) => Math.max(0, prev + amount));
    }
  };

  const swapSides = () => {
    const tempScore = scoreHome;
    setScoreHome(scoreAway);
    setScoreAway(tempScore);

    const tempTeam = teamHomeId;
    setTeamHomeId(teamAwayId);
    setTeamAwayId(tempTeam);
  };

  const resetMatch = () => {
    if (!confirm('Zerar placar e resetar partida?')) {
      return;
    }

    setScoreHome(0);
    setScoreAway(0);
    setMatchStatus('Warmup');
    setSideHome('CT');
  };

  const getTeamName = (id: number | '') => {
    const found = teams.find(
      (team) => team.id === Number(id)
    );

    return found
      ? found.name
      : 'Selecione um Time';
  };

  /*
   ============================================================
   UI
   ============================================================
  */

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Controle de Partida (Ao Vivo)
          </h1>

          <p className="text-neutral-400 text-sm">
            GSI automático conectado ao CS2
          </p>
        </div>

        <div className="flex gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border",
            connected ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-500" : "bg-red-500/10 border-red-500/50 text-red-500"
          )}>
            <div className={cn("w-2 h-2 rounded-full", connected ? "bg-emerald-500 animate-pulse" : "bg-red-500")} />
            {connected
              ? transport === 'supabase' ? "Realtime Conectado" : "Server Conectado"
              : "Desconectado"}
          </div>

          <button
            onClick={() =>
              setAutoMode((prev) => !prev)
            }
            className={cn(
              'px-5 py-2 rounded-lg font-bold flex items-center gap-2 transition-all',
              autoMode
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
                : 'bg-neutral-800 text-neutral-400'
            )}
          >
            <MonitorPlay className="w-4 h-4" />

            {autoMode
              ? 'AUTO GSI: ON'
              : 'AUTO GSI: OFF'}
          </button>

          <button
            onClick={handleSyncOverlay}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-2 transition-all"
          >
            <RefreshCcw className="w-4 h-4" />
            Sincronizar Overlay
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Setup Column */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Swords className="w-5 h-5 text-emerald-500" />
              Configuração
            </h2>
            
            <div className="space-y-4">
               <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Time da Esquerda</label>
                <select 
                  value={teamHomeId} 
                  onChange={(e) => setTeamHomeId(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">Selecione um Time</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Time da Direita</label>
                <select 
                  value={teamAwayId} 
                  onChange={(e) => setTeamAwayId(Number(e.target.value))}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                >
                  <option value="">Selecione um Time</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

                <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Fase do Torneio</label>
                  <select 
                    value={stage} 
                    onChange={(e) => setStage(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                 <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Formato</label>
                  <select 
                    value={format} 
                    onChange={(e) => setFormat(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Mapa Atual</label>
                  <select 
                    value={currentMap} 
                    onChange={(e) => setCurrentMap(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-emerald-500 transition-all"
                  >
                    {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              
              <div className="pt-2">
                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block text-center">Placar da Série (Mapas)</label>
                <div className="flex items-center justify-center gap-4 bg-neutral-950 p-3 rounded-lg border border-neutral-800">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase">ESQUERDA</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setScoreSeriesHome(Math.max(0, scoreSeriesHome - 1))} className="w-6 h-6 bg-neutral-800 rounded flex items-center justify-center text-xs">-</button>
                      <span className="text-xl font-black text-white">{scoreSeriesHome}</span>
                      <button onClick={() => setScoreSeriesHome(scoreSeriesHome + 1)} className="w-6 h-6 bg-neutral-800 rounded flex items-center justify-center text-xs">+</button>
                    </div>
                  </div>
                  <div className="h-8 w-[1px] bg-neutral-800" />
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-neutral-500 uppercase">DIREITA</span>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setScoreSeriesAway(Math.max(0, scoreSeriesAway - 1))} className="w-6 h-6 bg-neutral-800 rounded flex items-center justify-center text-xs">-</button>
                      <span className="text-xl font-black text-white">{scoreSeriesAway}</span>
                      <button onClick={() => setScoreSeriesAway(scoreSeriesAway + 1)} className="w-6 h-6 bg-neutral-800 rounded flex items-center justify-center text-xs">+</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
             <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-emerald-500" />
              Estado da Partida
            </h2>
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-1.5 block">Status</label>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUSES.map(s => (
                      <button 
                        key={s}
                        onClick={() => handleMatchStatusSelect(s)}
                        className={cn(
                          "px-2 py-1.5 rounded text-[10px] font-bold border transition-all",
                          matchStatus === s 
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-500" 
                            : "bg-neutral-950 border-neutral-800 text-neutral-500 hover:border-neutral-700"
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleMatchStatusAuto}
                    className={cn(
                      "mt-2 w-full px-2 py-1.5 rounded text-[10px] font-bold border transition-all flex items-center justify-center gap-1.5",
                      manualStatusOverride
                        ? "bg-blue-500/10 border-blue-500/50 text-blue-400 hover:bg-blue-500/20"
                        : "bg-neutral-950 border-neutral-800 text-neutral-600"
                    )}
                  >
                    <RefreshCcw className="w-3 h-3" />
                    {manualStatusOverride ? 'Voltar para GSI' : 'Status seguindo GSI'}
                  </button>
               </div>
            </div>
          </div>
        </div>

        {/* Score Column */}
        <div className="xl:col-span-2 space-y-6">
           <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-orange-500 opacity-30" />
              
              <div className="flex items-center justify-between gap-10">
                {/* Team Home */}
                <div className="flex-1 flex flex-col items-center text-center space-y-4">
                  <div className={cn(
                    "w-24 h-24 rounded-2xl bg-neutral-950 border-2 flex items-center justify-center p-4 shadow-inner relative",
                    sideHome === 'CT' ? "border-blue-500/50" : "border-orange-500/50"
                  )}>
                    <span className="text-3xl font-black text-white/10 uppercase absolute inset-0 flex items-center justify-center pointer-events-none">
                      {sideHome}
                    </span>
                    {teams.find(t => t.id === Number(teamHomeId))?.logo ? (
                      <img 
                        src={teams.find(t => t.id === Number(teamHomeId))?.logo} 
                        className="w-full h-full object-contain relative z-10" 
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : <Swords className="w-10 h-10 text-neutral-700" />}
                  </div>
                  <h3 className="text-xl font-black text-white truncate max-w-full">
                    {getTeamName(teamHomeId)}
                  </h3>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => addScore('home', -1)}
                      className="w-10 h-10 rounded-lg bg-neutral-800 text-white flex items-center justify-center hover:bg-neutral-700 transition-colors"
                      disabled={autoMode}
                    >
                      -
                    </button>
                    <span className="text-6xl font-black text-white tabular-nums min-w-[80px]">
                      {scoreHome}
                    </span>
                    <button 
                      onClick={() => addScore('home', 1)}
                      className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"
                      disabled={autoMode}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Center Actions */}
                <div className="flex flex-col items-center gap-4">
                  <button 
                    onClick={swapSides}
                    className="p-4 rounded-full bg-neutral-800 text-white hover:bg-neutral-700 transition-all hover:rotate-180 duration-500 shadow-xl"
                  >
                    <ArrowLeftRight className="w-6 h-6" />
                  </button>
                  <div className="h-20 w-[1px] bg-neutral-800" />
                  <button 
                    onClick={resetMatch}
                    className="p-3 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
                  >
                    Reset
                  </button>
                </div>

                {/* Team Away */}
                <div className="flex-1 flex flex-col items-center text-center space-y-4">
                  <div className={cn(
                    "w-24 h-24 rounded-2xl bg-neutral-950 border-2 flex items-center justify-center p-4 shadow-inner relative",
                    sideHome === 'CT' ? "border-orange-500/50" : "border-blue-500/50"
                  )}>
                    <span className="text-3xl font-black text-white/10 uppercase absolute inset-0 flex items-center justify-center pointer-events-none">
                      {sideHome === 'CT' ? 'TR' : 'CT'}
                    </span>
                    {teams.find(t => t.id === Number(teamAwayId))?.logo ? (
                      <img 
                        src={teams.find(t => t.id === Number(teamAwayId))?.logo} 
                        className="w-full h-full object-contain relative z-10" 
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    ) : <Swords className="w-10 h-10 text-neutral-700" />}
                  </div>
                  <h3 className="text-xl font-black text-white truncate max-w-full">
                    {getTeamName(teamAwayId)}
                  </h3>
                  
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={() => addScore('away', -1)}
                      className="w-10 h-10 rounded-lg bg-neutral-800 text-white flex items-center justify-center hover:bg-neutral-700 transition-colors"
                      disabled={autoMode}
                    >
                      -
                    </button>
                    <span className="text-6xl font-black text-white tabular-nums min-w-[80px]">
                      {scoreAway}
                    </span>
                    <button 
                      onClick={() => addScore('away', 1)}
                      className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/20"
                      disabled={autoMode}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
           </div>

           {/* Manual Triggers */}
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="flex flex-col items-center justify-center p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-emerald-500 transition-all group">
                <Swords className="w-6 h-6 text-neutral-500 group-hover:text-emerald-500 mb-2" />
                <span className="text-[10px] font-black uppercase text-neutral-500 group-hover:text-white">Faca Round</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-blue-500 transition-all group">
                <Pause className="w-6 h-6 text-neutral-500 group-hover:text-blue-500 mb-2" />
                <span className="text-[10px] font-black uppercase text-neutral-500 group-hover:text-white">Pausa Técnica</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-yellow-500 transition-all group">
                <FastForward className="w-6 h-6 text-neutral-500 group-hover:text-yellow-500 mb-2" />
                <span className="text-[10px] font-black uppercase text-neutral-500 group-hover:text-white">Intervalo</span>
              </button>
              <button className="flex flex-col items-center justify-center p-4 bg-neutral-900 border border-neutral-800 rounded-xl hover:border-emerald-500 transition-all group">
                <Trophy className="w-6 h-6 text-neutral-500 group-hover:text-emerald-500 mb-2" />
                <span className="text-[10px] font-black uppercase text-neutral-500 group-hover:text-white">Fim de Jogo</span>
              </button>
           </div>
        </div>
      </div>

      {/* Series / Map Veto Section (Captain Controlled) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-8">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapIcon className="w-5 h-5 text-emerald-500" />
            Série / Veto de Mapas (Capitães)
          </h2>
          <div className="flex gap-2">
            {!vetoSession ? (
              <button 
                onClick={handleCreateVeto}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-lg transition-all shadow-lg shadow-blue-900/20"
              >
                Criar Sessão de Veto
              </button>
            ) : (
              <>
                <button 
                  onClick={handleResetVeto}
                  className="px-4 py-2 bg-amber-600/10 text-amber-500 hover:bg-amber-600 hover:text-white text-xs font-black uppercase rounded-lg transition-all border border-amber-500/20"
                >
                  Resetar Progresso
                </button>
                <button 
                  onClick={handleDeleteVeto}
                  className="px-4 py-2 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white text-xs font-black uppercase rounded-lg transition-all border border-red-500/20"
                >
                  Excluir Sessão
                </button>
              </>
            )}
          </div>
        </div>

        {vetoSession ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 1. SESSION INFO & STATUS */}
            <div className="space-y-6 bg-neutral-950 p-6 rounded-2xl border border-white/5">
               <div className="flex items-center gap-2 mb-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    vetoSession.status === 'live' ? "bg-blue-500 animate-pulse" : 
                    vetoSession.status === 'finished' ? "bg-emerald-500" : "bg-amber-500"
                  )} />
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Status da Sessão</h3>
               </div>

               <div className="space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-bold uppercase tracking-tighter">Estado:</span>
                    <span className={cn(
                      "font-black uppercase",
                      vetoSession.status === 'live' ? "text-blue-500" : 
                      vetoSession.status === 'finished' ? "text-emerald-500" : "text-amber-500"
                    )}>
                      {vetoSession.status === 'waiting' ? 'Aguardando Prontidão' :
                       vetoSession.status === 'setup' ? 'Pronto para Iniciar' :
                       vetoSession.status === 'live' ? 'Em Andamento' :
                       vetoSession.status === 'finished' ? 'Finalizado' : vetoSession.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-bold uppercase tracking-tighter">Formato:</span>
                    <span className="text-white font-bold">{vetoSession.format === 'BO1' ? 'Melhor de 1' : 'Melhor de 3'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-neutral-500 font-bold uppercase tracking-tighter">Vez de:</span>
                    <span className={cn(
                      "font-black uppercase",
                      vetoSession.currentTurn === 'left' ? "text-blue-500" : 
                      vetoSession.currentTurn === 'right' ? "text-orange-500" : "text-neutral-500"
                    )}>
                      {vetoSession.currentTurn === 'left' ? vetoSession.leftTeam?.name : 
                       vetoSession.currentTurn === 'right' ? vetoSession.rightTeam?.name : 'Aguardando'}
                    </span>
                  </div>

                  {/* Ready Quick Status */}
                  <div className="pt-2 flex items-center gap-3">
                     <div className={cn(
                       "flex-1 px-3 py-2 rounded-lg border flex items-center justify-between transition-all",
                       vetoSession.leftReady ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-neutral-900 border-white/5 text-neutral-600"
                     )}>
                        <span className="text-[8px] font-black uppercase">{vetoSession.leftTeam?.tag}</span>
                        {vetoSession.leftReady ? <Check className="w-3 h-3" /> : <div className="w-1 h-1 rounded-full bg-neutral-700" />}
                     </div>
                     <div className={cn(
                       "flex-1 px-3 py-2 rounded-lg border flex items-center justify-between transition-all",
                       vetoSession.rightReady ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500" : "bg-neutral-900 border-white/5 text-neutral-600"
                     )}>
                        <span className="text-[8px] font-black uppercase">{vetoSession.rightTeam?.tag}</span>
                        {vetoSession.rightReady ? <Check className="w-3 h-3" /> : <div className="w-1 h-1 rounded-full bg-neutral-700" />}
                     </div>
                  </div>
               </div>

               <div className="pt-4 space-y-3">
                  {(vetoSession.status === 'setup' || (vetoSession.status === 'waiting' && vetoSession.leftReady && vetoSession.rightReady)) && (
                    <button 
                      onClick={handleStartVeto}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-xs rounded-xl transition-all shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 border-b-4 border-emerald-800"
                    >
                      <Play className="w-4 h-4 fill-current" />
                      Iniciar Veto Agora
                    </button>
                  )}
                  {vetoSession.status === 'waiting' && (!vetoSession.leftReady || !vetoSession.rightReady) && (
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl text-[10px] text-amber-500 font-bold text-center uppercase tracking-widest leading-relaxed">
                      Aguardando confirmação de prontidão dos capitães
                    </div>
                  )}
               </div>
            </div>

            {/* 2. CAPTAIN LINKS & READY STATUS */}
            <div className="space-y-6 bg-neutral-950 p-6 rounded-2xl border border-white/5">
               <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Controle de Capitães</h3>
               </div>

               <div className="space-y-6">
                  {/* Left Captain */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-blue-500 uppercase">Capitão {vetoSession.leftTeam?.tag} (Esquerda)</span>
                      <div className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                        vetoSession.leftReady ? "bg-emerald-500 text-white" : "bg-neutral-800 text-neutral-500"
                      )}>
                        {vetoSession.leftReady ? 'PRONTO' : 'AGUARDANDO'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={getCaptainLink(vetoSession.leftToken)}
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-[10px] text-neutral-400 focus:outline-none"
                      />
                      <button 
                        onClick={() => copyToClipboard(getCaptainLink(vetoSession.leftToken))}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>

                  {/* Right Captain */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-orange-500 uppercase">Capitão {vetoSession.rightTeam?.tag} (Direita)</span>
                      <div className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase",
                        vetoSession.rightReady ? "bg-emerald-500 text-white" : "bg-neutral-800 text-neutral-500"
                      )}>
                        {vetoSession.rightReady ? 'PRONTO' : 'AGUARDANDO'}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <input 
                        readOnly 
                        value={getCaptainLink(vetoSession.rightToken)}
                        className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-[10px] text-neutral-400 focus:outline-none"
                      />
                      <button 
                        onClick={() => copyToClipboard(getCaptainLink(vetoSession.rightToken))}
                        className="p-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors"
                      >
                        <Copy className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  </div>
               </div>
            </div>

            {/* 3. VETO HISTORY */}
            <div className="space-y-4">
               <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Histórico de Ações</h3>
               </div>

               {vetoSession.actions.length === 0 ? (
                 <div className="h-40 flex items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl">
                    <p className="text-neutral-600 text-[10px] italic uppercase tracking-widest">Nenhuma ação realizada</p>
                 </div>
               ) : (
                 <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                    {vetoSession.actions.slice().reverse().map((action: any, idx: number) => (
                      <div key={action.id || action.timestamp} className="flex items-center justify-between bg-neutral-950 p-3 rounded-lg border border-white/5">
                         <div className="flex items-center gap-4">
                            <span className="text-[10px] font-bold text-neutral-700">#{vetoSession.actions.length - idx}</span>
                            <span className="text-sm font-black text-white uppercase italic">{action.mapNames ? action.mapNames.join(' & ') : action.mapName || (action.action === 'side_choice' ? (action.startingSide === 'CT' ? 'ESCOLHA CT' : 'ESCOLHA TR') : '')}</span>
                            <div className={cn(
                               "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                               action.action === 'ban' ? "bg-red-500 text-white" : action.action === 'decider' ? "bg-amber-500 text-white" : action.action === 'side_choice' ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                            )}>
                               {action.action === 'side_choice' ? 'LADO' : action.action}
                            </div>
                         </div>
                         <span className={cn(
                           "text-[10px] font-black uppercase",
                           action.teamSide === 'left' ? "text-blue-500" : action.teamSide === 'right' ? "text-orange-500" : "text-neutral-500"
                         )}>
                           {action.teamSide === 'left' ? vetoSession.leftTeam?.tag : action.teamSide === 'right' ? vetoSession.rightTeam?.tag : 'DECISOR'}
                         </span>
                      </div>
                    ))}
                 </div>
               )}
            </div>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center border-2 border-dashed border-neutral-800 rounded-2xl space-y-4">
             <LinkIcon className="w-12 h-12 text-neutral-800" />
             <div className="text-center">
                <p className="text-neutral-500 text-sm font-medium">Nenhuma sessão de veto ativa.</p>
                <p className="text-neutral-700 text-xs uppercase tracking-widest mt-1">Configure os times acima e clique em "Criar Sessão de Veto"</p>
             </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-neutral-800 pt-4">
          <div className="text-[10px] font-bold text-neutral-500 flex items-center gap-2">
             <MonitorPlay className="w-3.5 h-3.5" />
             URL DA OVERLAY DE VETO: 
             <code className="bg-neutral-950 px-2 py-1 rounded text-emerald-500 border border-neutral-800 ml-1 select-all cursor-pointer">
               {vetoOverlayUrl}
             </code>
          </div>
          <div className="text-[9px] font-black text-neutral-700 uppercase tracking-widest">
             DoutrinaHUD Engine — Captain Veto System v2.1
          </div>
        </div>
      </div>
    </div>
  );
}
