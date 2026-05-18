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
} from 'lucide-react';

import { cn } from '../components/AdminLayout';
import { useSocket } from '../../context/SocketContext';

const MOCK_TEAMS = [
  { id: 1, name: 'FURIA Esports', tag: 'FUR', logo: '' },
  { id: 2, name: 'Natus Vincere', tag: 'NAVI', logo: '' },
  { id: 3, name: 'MIBR', tag: 'MIBR', logo: '' },
  { id: 4, name: 'FaZe Clan', tag: 'FAZE', logo: '' },
];

const MAPS = [
  'Dust 2',
  'Mirage',
  'Inferno',
  'Nuke',
  'Overpass',
  'Vertigo',
  'Ancient',
  'Anubis',
];

const FORMATS = ['BO1', 'BO3', 'BO5'];

const STAGES = [
  'Grupos',
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

export function LiveControl() {
  const { socket, connected } = useSocket();

  const [teams, setTeams] = useState<any[]>(MOCK_TEAMS);

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

  const [sideHome, setSideHome] = useState<'CT' | 'TR'>('CT');
  const [matchStatus, setMatchStatus] = useState('Warmup');

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
    fetch('/api/teams')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setTeams(data);
        }
      })
      .catch(() => {});
  }, []);

  /*
   ============================================================
   SOCKET → GSI UPDATE
   ============================================================
  */

  useEffect(() => {
    if (!socket || !connected) return;

    const handleGsiUpdate = (data: any) => {
      console.log('Painel recebeu GSI:', data);
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

    /*
     SCORE AUTOMÁTICO
    */

    if (sideHome === 'CT') {
      setScoreHome(map.team_ct?.score || 0);
      setScoreAway(map.team_t?.score || 0);
    } else {
      setScoreHome(map.team_t?.score || 0);
      setScoreAway(map.team_ct?.score || 0);
    }

    /*
     STATUS AUTOMÁTICO
    */

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

    /*
     BOMB / ROUND STATES
    */

    if (round?.bomb === 'planted') {
      setMatchStatus('Live');
    }
  }, [gsiData, autoMode, sideHome]);

  /*
   ============================================================
   SYNC OVERLAY
   ============================================================
  */

  const handleSyncOverlay = () => {
    if (!socket || !connected) return;

    const teamHome = teams.find(
      (t) => t.id === Number(teamHomeId)
    );

    const teamAway = teams.find(
      (t) => t.id === Number(teamAwayId)
    );

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
        matchStatus,
      },
    });
  };

  /*
   ============================================================
   AUTO PUSH TO OVERLAY
   ============================================================
  */

  useEffect(() => {
    handleSyncOverlay();
  }, [
    scoreHome,
    scoreAway,
    sideHome,
    matchStatus,
    currentMap,
    format,
    stage,
    teamHomeId,
    teamAwayId,
    autoMode,
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
    setSideHome((prev) =>
      prev === 'CT' ? 'TR' : 'CT'
    );

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
          <button
            onClick={() =>
              setAutoMode((prev) => !prev)
            }
            className={cn(
              'px-5 py-2 rounded-lg font-bold flex items-center gap-2',
              autoMode
                ? 'bg-emerald-600 text-white'
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
            className="px-5 py-2 rounded-lg bg-blue-600 text-white font-bold"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}