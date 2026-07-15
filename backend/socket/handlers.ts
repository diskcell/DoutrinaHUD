import { Server, Socket } from 'socket.io';
import { gsiEmitter } from './gsiEmitter.js';
import { vetoService } from '../vetoService.js';
import { initDatabase } from '../database/index.js';
import { migrateJsonToSqlite } from '../database/migrate.js';
import { liveStateRepository } from '../database/repositories/liveStateRepository.js';

// Inicializar Banco de Dados
initDatabase();
migrateJsonToSqlite(); // Migrar dados dos JSONs antigos se o banco estiver vazio

let latestHudState: any = liveStateRepository.get(); // Carregar do SQLite na inicialização
let latestGsiData: any = null;

export function setupSocket(io: Server) {
  
  // Listen for internal server events (GSI POSTs) and broadcast to all connected clients
  gsiEmitter.on('gsi:update', (data) => {
    latestGsiData = data;
    io.volatile.emit('gsi:update', data);
  });

  io.on('connection', (socket: Socket) => {
    console.log('Novo cliente conectado:', socket.id);

    // Eventos do HUD (Overlay)
    socket.on('overlay:ready', () => {
      console.log('Overlay inicializado no cliente', socket.id);
      // Enviar estado atual do HUD e GSI para o cliente recém-conectado
      socket.emit('hud:update', latestHudState || { message: 'Bem-vindo ao DoutrinaHUD' });
      if (latestGsiData) {
        socket.emit('gsi:update', latestGsiData);
      }
    });

    // Eventos de Controle (Dashboard)
    socket.on('hud:command', (command: any) => {
      console.log('Comando recebido do painel');
      latestHudState = command;
      
      // Salvar estado no SQLite para persistência
      if (command.type === 'SYNC') {
        liveStateRepository.save(command);
      }

      // Fazer broadcast do comando para o overlay
      io.emit('hud:update', command);
    });

    // --- Veto Events ---
    socket.on('veto:create', (data: { matchId: string, format: 'BO1' | 'BO3' | 'BO5', leftTeam: any, rightTeam: any }) => {
      console.log('Recebido veto:create', data);
      try {
        const session = vetoService.createSession(data.matchId, data.format, data.leftTeam, data.rightTeam);
        console.log('Sessão criada com sucesso, emitindo veto:update');
        io.emit('veto:update', session);
      } catch (error: any) {
        console.error('ERRO CRÍTICO ao criar sessão de veto:', error);
        socket.emit('veto:error', { message: 'Erro ao criar sessão no servidor', error: error.message });
      }
    });

    socket.on('veto:join', (data: { matchId: string, token: string }) => {
      console.log('Recebido veto:join', data);
      const session = vetoService.updateConnectionStatus(data.matchId, data.token, true);
      if (session) {
        io.emit('veto:update', session);
      }
    });

    socket.on('veto:captain_ready', (data: { matchId: string, token: string, ready: boolean }) => {
      console.log('Recebido veto:captain_ready', data);
      const session = vetoService.setReady(data.matchId, data.token, data.ready);
      if (session) {
        io.emit('veto:update', session);
      }
    });

    socket.on('veto:start', (data: { matchId: string }) => {
      console.log('Recebido veto:start', data);
      const session = vetoService.startVeto(data.matchId);
      if (session) {
        io.emit('veto:update', session);
      }
    });

    socket.on('veto:submit_action', (data: { matchId: string, token: string, mapNames: string[] }) => {
      console.log('Recebido veto:submit_action', data);
      const session = vetoService.submitAction(data.matchId, data.token, data.mapNames);
      if (session) {
        io.emit('veto:update', session);
      }
    });

    socket.on('veto:submit_side_choice', (data: { matchId: string, token: string, startingSide: 'CT' | 'TR' }) => {
      console.log('Recebido veto:submit_side_choice', data);
      const session = vetoService.submitSideChoice(data.matchId, data.token, data.startingSide);
      if (session) {
        io.emit('veto:update', session);
      }
    });

    socket.on('veto:reset', (data: { matchId: string }) => {
      console.log('Recebido veto:reset', data);
      const session = vetoService.resetSession(data.matchId);
      if (session) {
        io.emit('veto:update', session);
      }
    });

    socket.on('veto:delete', (data: { matchId: string }) => {
      console.log('Recebido veto:delete', data);
      const deleted = vetoService.deleteSession(data.matchId);
      if (deleted) {
        io.emit('veto:update', null); // Broadcast null to clear clients
      }
    });

    socket.on('veto:get_status', (data: { matchId: string }) => {
      const session = vetoService.getSession(data.matchId);
      if (session) {
        socket.emit('veto:update', session);
      }
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
}
