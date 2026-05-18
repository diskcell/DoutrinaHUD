import { Server, Socket } from 'socket.io';
import { gsiEmitter } from './gsiEmitter.js';

let latestHudState: any = null;
let latestGsiData: any = null;

export function setupSocket(io: Server) {
  
  // Listen for internal server events (GSI POSTs) and broadcast to all connected clients
  gsiEmitter.on('gsi:update', (data) => {
    latestGsiData = data;
    io.emit('gsi:update', data);
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
      // Fazer broadcast do comando para o overlay
      io.emit('hud:update', command);
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
}
