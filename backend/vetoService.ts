import crypto from 'crypto';
import { vetoRepository } from './database/repositories/vetoRepository.js';
import { teamRepository } from './database/repositories/teamRepository.js';

export interface VetoStep {
  step: number;
  teamSide: 'left' | 'right' | 'random' | null;
  action: 'ban' | 'pick' | 'decider' | 'side_choice';
  amount?: number; // For BO1 multi-bans
  mapNumber?: number;
  sideChoiceBy?: 'left' | 'right' | 'knife' | 'random' | null;
  label: string;
}

export interface VetoAction {
  id: string;
  stepIndex: number;
  action: 'ban' | 'pick' | 'decider' | 'side_choice';
  teamSide: 'left' | 'right' | 'random' | null;
  mapNames?: string[];
  mapName?: string;
  mapNumber?: number;
  startingSide?: 'CT' | 'TR' | null;
  sideChoiceBy?: 'left' | 'right' | 'knife' | 'random' | null;
  timestamp: number;
}

export interface SelectedMap {
  mapName: string;
  mapNumber: number;
  pickedBy: 'left' | 'right' | 'decider';
  sideChoiceBy: 'left' | 'right' | 'knife' | 'random' | null;
  startingSide: 'CT' | 'TR' | null;
}

export interface VetoSession {
  matchId: string;
  status: 'setup' | 'waiting' | 'live' | 'finished' | 'paused';
  format: 'BO1' | 'BO3';
  leftTeam: any;
  rightTeam: any;
  leftToken: string;
  rightToken: string;
  leftReady: boolean;
  rightReady: boolean;
  leftConnected: boolean;
  rightConnected: boolean;
  activeMapPool: string[];
  flow: VetoStep[];
  currentStepIndex: number;
  availableMaps: string[];
  actions: VetoAction[];
  selectedMaps: SelectedMap[];
  currentTurn: 'left' | 'right' | null;
  isFinished: boolean;
}

const ACTIVE_MAP_POOL = [
  'Ancient',
  'Anubis',
  'Dust2',
  'Inferno',
  'Mirage',
  'Nuke',
  'Overpass',
];

class VetoService {
  private sessions: Map<string, VetoSession> = new Map();

  constructor() {
    // Carregar sessões existentes do banco de dados na inicialização
    setTimeout(() => {
      try {
        const dbSessions = vetoRepository.getAllSessions();
        dbSessions.forEach(session => {
          if (session) {
            // Re-vincular objetos de times se necessário
            if (session.left_team_id) session.leftTeam = teamRepository.getById(session.left_team_id);
            if (session.right_team_id) session.rightTeam = teamRepository.getById(session.right_team_id);
            this.sessions.set(session.id, session);
            console.log(`[VetoService] Sessão recuperada do SQLite: ${session.id}`);
          }
        });
      } catch (e) {
        console.error('[VetoService] Erro ao carregar sessões do banco:', e);
      }
    }, 1000);
  }

  createSession(matchId: string, format: 'BO1' | 'BO3', leftTeam: any, rightTeam: any): VetoSession {
    console.log(`[VetoService] Criando sessão: ${matchId}, formato: ${format}`);
    
    const flow = this.generateFlow(format);
    
    const generateToken = () => {
      try {
        return crypto.randomUUID().substring(0, 8);
      } catch (e) {
        return Math.random().toString(36).substring(2, 10);
      }
    };

    const session: VetoSession = {
      matchId,
      status: 'waiting',
      format,
      leftTeam,
      rightTeam,
      leftToken: generateToken(),
      rightToken: generateToken(),
      leftReady: false,
      rightReady: false,
      leftConnected: false,
      rightConnected: false,
      activeMapPool: [...ACTIVE_MAP_POOL],
      flow,
      currentStepIndex: 0,
      availableMaps: [...ACTIVE_MAP_POOL],
      actions: [],
      selectedMaps: [],
      currentTurn: null,
      isFinished: false,
    };

    this.sessions.set(matchId, session);
    vetoRepository.saveSession(session);
    return session;
  }

  private generateFlow(format: 'BO1' | 'BO3'): VetoStep[] {
    if (format === 'BO1') {
      // MD1: Time B escolhe o mapa (Etapa 4), Time A escolhe o Lado (Etapa 5)
      return [
        { step: 1, teamSide: "left", action: "ban", amount: 1, label: "{leftTeam} bane 1 mapa" },
        { step: 2, teamSide: "right", action: "ban", amount: 2, label: "{rightTeam} bane 2 mapas" },
        { step: 3, teamSide: "left", action: "ban", amount: 2, label: "{leftTeam} bane 2 mapas" },
        { step: 4, teamSide: "right", action: "pick", mapNumber: 1, sideChoiceBy: "left", label: "{rightTeam} escolhe o mapa da partida" },
        { step: 5, teamSide: "left", action: "side_choice", mapNumber: 1, label: "{leftTeam} escolhe o lado inicial" }
      ];
    } else {
      // MD3: QUEM ESCOLHE O MAPA TAMBÉM ESCOLHE O LADO (Picker = Side Chooser)
      return [
        { step: 1, teamSide: "left", action: "ban", label: "{leftTeam} bane 1 mapa" },
        { step: 2, teamSide: "right", action: "ban", label: "{rightTeam} bane 1 mapa" },
        { step: 3, teamSide: "left", action: "pick", mapNumber: 1, sideChoiceBy: "left", label: "{leftTeam} escolhe o Mapa 1" },
        { step: 4, teamSide: "left", action: "side_choice", mapNumber: 1, label: "{leftTeam} escolhe o lado do Mapa 1" },
        { step: 5, teamSide: "right", action: "pick", mapNumber: 2, sideChoiceBy: "right", label: "{rightTeam} escolhe o Mapa 2" },
        { step: 6, teamSide: "right", action: "side_choice", mapNumber: 2, label: "{rightTeam} escolhe o lado do Mapa 2" },
        { step: 7, teamSide: "left", action: "ban", label: "{leftTeam} bane 1 mapa" },
        { step: 8, teamSide: "right", action: "ban", label: "{rightTeam} bane 1 mapa" },
        { step: 9, teamSide: null, action: "decider", mapNumber: 3, sideChoiceBy: "knife", label: "Mapa restante é o Decisor" }
      ];
    }
  }

  getSession(matchId: string): VetoSession | undefined {
    return this.sessions.get(matchId);
  }

  setReady(matchId: string, token: string, ready: boolean): VetoSession | null {
    const session = this.sessions.get(matchId);
    if (!session) return null;

    if (token === session.leftToken) {
      session.leftReady = ready;
    } else if (token === session.rightToken) {
      session.rightReady = ready;
    } else {
      return null;
    }

    if (session.leftReady && session.rightReady) {
      session.status = 'setup';
    } else {
      session.status = 'waiting';
    }

    vetoRepository.saveSession(session);
    return session;
  }

  startVeto(matchId: string): VetoSession | null {
    const session = this.sessions.get(matchId);
    if (!session || (session.status !== 'setup' && session.status !== 'waiting')) return null;

    session.status = 'live';
    session.currentStepIndex = 0;
    this.updateCurrentTurn(session);
    this.checkAutomaticSteps(session);

    vetoRepository.saveSession(session);
    return session;
  }

  private updateCurrentTurn(session: VetoSession) {
    const currentStep = session.flow[session.currentStepIndex];
    if (!currentStep || session.status !== 'live') {
      session.currentTurn = null;
      return;
    }

    if (currentStep.teamSide === 'random') {
      const sides: ('left' | 'right')[] = ['left', 'right'];
      session.currentTurn = sides[Math.floor(Math.random() * sides.length)];
    } else {
      session.currentTurn = currentStep.teamSide as 'left' | 'right' | null;
    }
  }

  submitAction(matchId: string, token: string, mapNames: string[]): VetoSession | null {
    const session = this.sessions.get(matchId);
    if (!session || session.status !== 'live') return null;

    const currentStep = session.flow[session.currentStepIndex];
    if (!currentStep) return null;

    const isLeft = token === session.leftToken;
    const isRight = token === session.rightToken;
    const mySide = isLeft ? 'left' : 'right';

    if (session.currentTurn !== mySide) return null;

    for (const m of mapNames) {
      if (!session.availableMaps.includes(m)) return null;
    }

    if (currentStep.action === 'ban') {
      const required = currentStep.amount || 1;
      if (mapNames.length !== required) return null;

      const action: VetoAction = {
        id: crypto.randomUUID(),
        stepIndex: session.currentStepIndex,
        action: 'ban',
        teamSide: mySide,
        mapNames,
        timestamp: Date.now()
      };
      session.actions.push(action);
      vetoRepository.addAction(session.matchId, action);

      session.availableMaps = session.availableMaps.filter(m => !mapNames.includes(m));
    } else if (currentStep.action === 'pick') {
      if (mapNames.length !== 1) return null;
      const mapName = mapNames[0];

      const action: VetoAction = {
        id: crypto.randomUUID(),
        stepIndex: session.currentStepIndex,
        action: 'pick',
        teamSide: mySide,
        mapName,
        mapNumber: currentStep.mapNumber,
        sideChoiceBy: currentStep.sideChoiceBy,
        timestamp: Date.now()
      };
      session.actions.push(action);
      vetoRepository.addAction(session.matchId, action);

      const selMap: SelectedMap = {
        mapName,
        mapNumber: currentStep.mapNumber!,
        pickedBy: mySide,
        sideChoiceBy: currentStep.sideChoiceBy!,
        startingSide: null
      };
      session.selectedMaps.push(selMap);
      vetoRepository.addSelectedMap(session.matchId, selMap);

      session.availableMaps = session.availableMaps.filter(m => m !== mapName);
    } else {
      return null;
    }

    session.currentStepIndex++;
    this.updateCurrentTurn(session);
    this.checkAutomaticSteps(session);

    vetoRepository.saveSession(session);
    return session;
  }

  submitSideChoice(matchId: string, token: string, startingSide: 'CT' | 'TR'): VetoSession | null {
    const session = this.sessions.get(matchId);
    if (!session || session.status !== 'live') return null;

    const currentStep = session.flow[session.currentStepIndex];
    if (!currentStep || currentStep.action !== 'side_choice') return null;

    const isLeft = token === session.leftToken;
    const isRight = token === session.rightToken;
    const mySide = isLeft ? 'left' : 'right';

    if (session.currentTurn !== mySide) return null;

    const action: VetoAction = {
      id: crypto.randomUUID(),
      stepIndex: session.currentStepIndex,
      action: 'side_choice',
      teamSide: mySide,
      startingSide,
      mapNumber: currentStep.mapNumber || (session.format === 'BO1' ? 1 : undefined),
      timestamp: Date.now()
    };
    session.actions.push(action);
    vetoRepository.addAction(session.matchId, action);

    if (session.format === 'BO1') {
      if (session.selectedMaps[0]) {
        session.selectedMaps[0].startingSide = startingSide;
        vetoRepository.updateSelectedMapSide(session.matchId, 1, startingSide);
      }
    } else {
      const targetMap = session.selectedMaps.find(m => m.mapNumber === currentStep.mapNumber);
      if (targetMap) {
        targetMap.startingSide = startingSide;
        vetoRepository.updateSelectedMapSide(session.matchId, currentStep.mapNumber!, startingSide);
      }
    }

    session.currentStepIndex++;
    this.updateCurrentTurn(session);
    this.checkAutomaticSteps(session);

    vetoRepository.saveSession(session);
    return session;
  }

  private checkAutomaticSteps(session: VetoSession) {
    if (session.currentStepIndex >= session.flow.length) {
      this.finishVeto(session);
      return;
    }

    const currentStep = session.flow[session.currentStepIndex];

    if (currentStep.action === 'decider') {
      const deciderMap = session.availableMaps[0];
      if (deciderMap) {
        const action: VetoAction = {
          id: crypto.randomUUID(),
          stepIndex: session.currentStepIndex,
          action: 'decider',
          teamSide: null,
          mapName: deciderMap,
          mapNumber: currentStep.mapNumber,
          sideChoiceBy: currentStep.sideChoiceBy,
          timestamp: Date.now()
        };
        session.actions.push(action);
        vetoRepository.addAction(session.matchId, action);

        const selMap: SelectedMap = {
          mapName: deciderMap,
          mapNumber: currentStep.mapNumber!,
          pickedBy: 'decider',
          sideChoiceBy: currentStep.sideChoiceBy || (session.format === 'BO1' ? null : 'knife'),
          startingSide: session.format === 'BO1' ? null : null
        };
        session.selectedMaps.push(selMap);
        vetoRepository.addSelectedMap(session.matchId, selMap);

        session.availableMaps = [];
        session.currentStepIndex++;
        this.updateCurrentTurn(session);
        this.checkAutomaticSteps(session);
      } else {
        this.finishVeto(session);
      }
    } else if (currentStep.teamSide === 'random' && currentStep.action === 'side_choice') {
      const sides: ('left' | 'right')[] = ['left', 'right'];
      session.currentTurn = sides[Math.floor(Math.random() * sides.length)];
    }
  }

  private finishVeto(session: VetoSession) {
    session.status = 'finished';
    session.isFinished = true;
    session.currentTurn = null;
  }

  resetSession(matchId: string): VetoSession | null {
    const session = this.sessions.get(matchId);
    if (!session) return null;

    session.status = 'waiting';
    session.leftReady = false;
    session.rightReady = false;
    session.currentStepIndex = 0;
    session.availableMaps = [...ACTIVE_MAP_POOL];
    session.actions = [];
    session.selectedMaps = [];
    session.currentTurn = null;
    session.isFinished = false;

    vetoRepository.clearSessionData(session.matchId);
    vetoRepository.saveSession(session);

    return session;
  }

  updateConnectionStatus(matchId: string, token: string, connected: boolean): VetoSession | null {
    const session = this.sessions.get(matchId);
    if (!session) return null;

    if (token === session.leftToken) {
      session.leftConnected = connected;
    } else if (token === session.rightToken) {
      session.rightConnected = connected;
    }

    vetoRepository.saveSession(session);
    return session;
  }

  deleteSession(matchId: string): boolean {
    vetoRepository.deleteSession(matchId);
    return this.sessions.delete(matchId);
  }
}

export const vetoService = new VetoService();
