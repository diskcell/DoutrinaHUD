import { useState, useEffect } from 'react';
import { Play, Square, RefreshCcw, ArrowLeftRight, MonitorPlay, ShieldAlert, AlertTriangle, Pause, Swords, Map as MapIcon, Trophy, FastForward } from 'lucide-react';
import { cn } from '../components/AdminLayout';
import { useSocket } from '../../context/SocketContext';

// Mock data while DB connection isn't implemented for this module
const MOCK_TEAMS = [
  { id: 1, name: 'FURIA Esports', tag: 'FUR', logo: '' },
  { id: 2, name: 'Natus Vincere', tag: 'NAVI', logo: '' },
  { id: 3, name: 'MIBR', tag: 'MIBR', logo: '' },
  { id: 4, name: 'FaZe Clan', tag: 'FAZE', logo: '' },
];

const MAPS = ['Dust 2', 'Mirage', 'Inferno', 'Nuke', 'Overpass', 'Vertigo', 'Ancient', 'Anubis'];
const FORMATS = ['BO1', 'BO3', 'BO5'];
const STAGES = ['Grupos', 'Quartas de Final', 'Semifinal', 'Grande Final'];
const STATUSES = ['Warmup', 'Live', 'Pause', 'Technical Pause', 'Knife Round', 'Overtime', 'Match Point', 'Finished'];

export function LiveControl() {
  const { socket, connected } = useSocket();
  const [teams, setTeams] = useState<any[]>(MOCK_TEAMS);
  
  // Setup State
  const [teamHomeId, setTeamHomeId] = useState<number | ''>('');
  const [teamAwayId, setTeamAwayId] = useState<number | ''>('');
  const [format, setFormat] = useState('BO3');
  const [stage, setStage] = useState('Semifinal');
  const [currentMap, setCurrentMap] = useState('Mirage');
  
  // Live Match State
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);
  const [sideHome, setSideHome] = useState<'CT' | 'TR'>('CT');
  const [matchStatus, setMatchStatus] = useState('Warmup');

  // GSI Auto Mode
  const [autoMode, setAutoMode] = useState(false);
  const [gsiData, setGsiData] = useState<any>(null);

  useEffect(() => {
    // Attempt to fetch real teams to blend with mock if available
    fetch('/api/teams')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTeams(data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!socket || !connected) return;

    const handleGsi = (data: any) => {
      setGsiData(data);
    };

    socket.on('gsi:update', handleGsi);

    return () => {
      socket.off('gsi:update', handleGsi);
    };
  }, [socket, connected]);

  useEffect(() => {
    if (!autoMode || !gsiData || !gsiData.map) return;

    const map = gsiData.map;
    
    // Sync Scores based on current side
    if (sideHome === 'CT') {
      setScoreHome(map.team_ct?.score || 0);
      setScoreAway(map.team_t?.score || 0);
    } else {
      setScoreHome(map.team_t?.score || 0);
      setScoreAway(map.team_ct?.score || 0);
    }

    // Sync Match Status
    if (map.phase === 'warmup') {
      setMatchStatus('Warmup');
    } else if (map.phase === 'intermission') {
      setMatchStatus('Pause'); // Halftime or Pause
    } else if (map.phase === 'gameover') {
      setMatchStatus('Finished');
    } else if (map.phase === 'live') {
      setMatchStatus('Live');
    }

  }, [gsiData, autoMode, sideHome]);

  const handleSyncOverlay = () => {
    if (!socket || !connected) return;
    
    const teamHome = teams.find(t => t.id === Number(teamHomeId));
    const teamAway = teams.find(t => t.id === Number(teamAwayId));

    socket.emit('hud:command', {
      type: 'SYNC',
      forceUpdate: true,
      autoMode,
      match: {
        teamHome: teamHome || null,
        teamAway: teamAway || null,
        scoreHome,
        scoreAway,
        format,
        stage,
        currentMap,
        sideHome,
        matchStatus
      }
    });
  };

  const syncState = () => {
    // In a real scenario, this automatically fires when state changes
    handleSyncOverlay();
  };

  useEffect(() => {
    syncState();
  }, [scoreHome, scoreAway, sideHome, matchStatus, currentMap, format, stage, teamHomeId, teamAwayId, autoMode]);

  const addScore = (team: 'home' | 'away', amount: number) => {
    if (team === 'home') setScoreHome(prev => Math.max(0, prev + amount));
    else setScoreAway(prev => Math.max(0, prev + amount));
  };

  const swapSides = () => {
    setSideHome(prev => prev === 'CT' ? 'TR' : 'CT');
    // Also swap scores
    const tempScore = scoreHome;
    setScoreHome(scoreAway);
    setScoreAway(tempScore);
    // Also swap teams visually
    const tempTeam = teamHomeId;
    setTeamHomeId(teamAwayId);
    setTeamAwayId(tempTeam);
  };

  const resetMatch = () => {
    if (!confirm('Zerar placar e resetar partida?')) return;
    setScoreHome(0);
    setScoreAway(0);
    setMatchStatus('Warmup');
    setSideHome('CT');
  };

  const getTeamName = (id: number | '') => {
    const t = teams.find(x => x.id === Number(id));
    return t ? t.name : 'Selecione um Time';
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white m-0">Controle de Partida (Ao Vivo)</h1>
          <p className="text-neutral-400 text-sm mt-1">Configure o overlay e atualize o placar em tempo real.</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={() => setAutoMode(prev => !prev)}
            className={cn(
              "px-5 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shrink-0",
              autoMode ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20" : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-white hover:bg-neutral-700"
            )}
          >
            <MonitorPlay className="w-4 h-4" />
            {autoMode ? "AUTO GSI: ON" : "AUTO GSI: OFF"}
          </button>

          <button 
            onClick={handleSyncOverlay}
            className={cn(
              "px-5 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shrink-0",
              connected ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20" : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
            )}
            title="Sincronizar manualmente"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 overflow-y-auto pb-6">
        
        {/* MATCH SETUP (Left Column) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              Setup Inicial
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase">Formato</label>
                <select 
                  value={format} 
                  onChange={e => setFormat(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer font-bold"
                >
                  {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase">Fase do Torneio</label>
                <select 
                  value={stage} 
                  onChange={e => setStage(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer font-bold"
                >
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-500 uppercase">Mapa Atual</label>
                <div className="relative">
                  <MapIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <select 
                    value={currentMap} 
                    onChange={e => setCurrentMap(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer font-bold"
                  >
                    {MAPS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Swords className="w-4 h-4" />
              Seleção de Times
            </h2>

            <div className="space-y-5">
              <div className="space-y-2 p-3 bg-neutral-950/50 rounded-lg border border-neutral-800/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Time A (Esquerda)</label>
                  <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded", sideHome === 'CT' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400')}>
                    {sideHome}
                  </span>
                </div>
                <select 
                  value={teamHomeId} 
                  onChange={e => setTeamHomeId(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 cursor-pointer font-bold"
                >
                  <option value="">-- Selecione o Time A --</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>)}
                </select>
              </div>

              <div className="flex justify-center -my-2 relative z-10">
                <button 
                  onClick={swapSides}
                  className="bg-neutral-800 hover:bg-neutral-700 text-white p-2 rounded-full border border-neutral-700 shadow-lg transition-transform hover:rotate-180"
                  title="Inverter Times e Lados"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 p-3 bg-neutral-950/50 rounded-lg border border-neutral-800/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-neutral-500 uppercase">Time B (Direita)</label>
                  <span className={cn("text-[10px] font-black px-1.5 py-0.5 rounded", sideHome === 'TR' ? 'bg-blue-500/20 text-blue-400' : 'bg-yellow-500/20 text-yellow-400')}>
                    {sideHome === 'CT' ? 'TR' : 'CT'}
                  </span>
                </div>
                <select 
                  value={teamAwayId} 
                  onChange={e => setTeamAwayId(Number(e.target.value))}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded px-3 py-2 text-white text-sm focus:border-emerald-500 cursor-pointer font-bold"
                >
                  <option value="">-- Selecione o Time B --</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} [{t.tag}]</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* LIVE CONTROL (Right Column) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Main Scoreboard Display */}
          <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-8 flex flex-col shadow-2xl relative overflow-hidden">
            {/* Status Badge Background Glow */}
            <div className={cn(
              "absolute top-0 left-0 w-full h-1 bg-gradient-to-r transition-all",
              matchStatus === 'Live' ? "from-red-600 via-red-500 to-red-600" :
              matchStatus === 'Warmup' ? "from-yellow-600 via-yellow-500 to-yellow-600" :
              matchStatus === 'Pause' || matchStatus === 'Technical Pause' ? "from-orange-600 via-orange-500 to-orange-600" :
              "from-neutral-600 via-neutral-500 to-neutral-600"
            )} />

            <div className="text-center mb-6">
              <span className={cn(
                "px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border",
                matchStatus === 'Live' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                matchStatus === 'Warmup' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                matchStatus === 'Pause' || matchStatus === 'Technical Pause' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                "bg-neutral-800 text-neutral-400 border-neutral-700"
              )}>
                {matchStatus === 'Live' ? '● AO VIVO' : matchStatus}
              </span>
            </div>

            <div className="flex items-center justify-between max-w-2xl mx-auto w-full">
              
              {/* Team Home */}
              <div className="flex flex-col items-center gap-4 flex-1">
                <h3 className="text-2xl font-black text-white truncate max-w-[200px]" title={getTeamName(teamHomeId)}>
                  {getTeamName(teamHomeId)}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => addScore('home', -1)} className="w-10 h-10 bg-neutral-800 rounded hover:bg-neutral-700 text-white font-bold text-xl">-</button>
                  <div className="w-24 h-24 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center shadow-inner">
                    <span className="text-6xl font-black text-white">{scoreHome}</span>
                  </div>
                  <button onClick={() => addScore('home', 1)} className="w-10 h-10 bg-emerald-600 rounded hover:bg-emerald-500 text-white font-bold text-xl shadow-lg shadow-emerald-900/20 ">+</button>
                </div>
              </div>

              {/* Center Match Info */}
              <div className="flex flex-col items-center justify-center px-8 shrink-0 space-y-2">
                <div className="bg-neutral-900 border border-neutral-800 px-4 py-2 rounded-lg flex flex-col items-center">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest leading-none">{stage}</span>
                  <span className="text-lg font-black text-white mt-1 leading-none">{format}</span>
                </div>
                <div className="flex items-center gap-1.5 text-neutral-400 bg-neutral-900/50 px-3 py-1 rounded-full border border-neutral-800">
                  <MapIcon className="w-3 h-3" />
                  <span className="text-xs font-bold">{currentMap}</span>
                </div>
              </div>

              {/* Team Away */}
              <div className="flex flex-col items-center gap-4 flex-1">
                <h3 className="text-2xl font-black text-white truncate max-w-[200px]" title={getTeamName(teamAwayId)}>
                  {getTeamName(teamAwayId)}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => addScore('away', -1)} className="w-10 h-10 bg-neutral-800 rounded hover:bg-neutral-700 text-white font-bold text-xl">-</button>
                  <div className="w-24 h-24 bg-neutral-900 border border-neutral-800 rounded-xl flex items-center justify-center shadow-inner">
                    <span className="text-6xl font-black text-white">{scoreAway}</span>
                  </div>
                  <button onClick={() => addScore('away', 1)} className="w-10 h-10 bg-emerald-600 rounded hover:bg-emerald-500 text-white font-bold text-xl shadow-lg shadow-emerald-900/20 ">+</button>
                </div>
              </div>

            </div>
          </div>

          {/* Quick Actions Grid */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Status da Partida</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {STATUSES.map(s => (
                <button
                  key={s}
                  onClick={() => setMatchStatus(s)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg text-xs font-bold transition-colors border",
                    matchStatus === s 
                      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                      : "bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-600 hover:text-white"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h2 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mb-4">Ações Rápidas</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
              <button onClick={() => setMatchStatus('Live')} className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-emerald-500/50 hover:bg-neutral-900 group transition-all text-neutral-400 hover:text-emerald-500">
                <Play className="w-6 h-6" />
                <span className="text-xs font-bold uppercase text-center leading-tight">Iniciar Partida</span>
              </button>
              
              <button onClick={() => setMatchStatus('Technical Pause')} className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-orange-500/50 hover:bg-neutral-900 group transition-all text-neutral-400 hover:text-orange-500">
                <Pause className="w-6 h-6" />
                <span className="text-xs font-bold uppercase text-center leading-tight">Tech Pause</span>
              </button>

              <button onClick={() => setMatchStatus('Overtime')} className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-yellow-500/50 hover:bg-neutral-900 group transition-all text-neutral-400 hover:text-yellow-500">
                <FastForward className="w-6 h-6" />
                <span className="text-xs font-bold uppercase text-center leading-tight">Prorrogação</span>
              </button>

              <button onClick={swapSides} className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-blue-500/50 hover:bg-neutral-900 group transition-all text-neutral-400 hover:text-blue-500">
                <RefreshCcw className="w-6 h-6" />
                <span className="text-xs font-bold uppercase text-center leading-tight">Inverter Lados</span>
              </button>

              <button onClick={resetMatch} className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-neutral-500/50 hover:bg-neutral-900 group transition-all text-neutral-400 hover:text-white">
                <RefreshCcw className="w-6 h-6" />
                <span className="text-xs font-bold uppercase text-center leading-tight">Zerar Placar</span>
              </button>

              <button onClick={() => setMatchStatus('Finished')} className="flex flex-col items-center justify-center gap-2 p-4 bg-neutral-950 border border-neutral-800 rounded-xl hover:border-red-500/50 hover:bg-neutral-900 group transition-all text-neutral-400 hover:text-red-500">
                <Square className="w-6 h-6" />
                <span className="text-xs font-bold uppercase text-center leading-tight">Encerrar Partida</span>
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
