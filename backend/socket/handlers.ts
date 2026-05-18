import { Server, Socket } from 'socket.io';

export function setupSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Novo cliente conectado:', socket.id);

    // Eventos do HUD (Overlay)
    socket.on('overlay:ready', () => {
      console.log('Overlay inicializado no cliente', socket.id);
      // Enviar estado atual do HUD para o cliente
      socket.emit('hud:update', { message: 'Bem-vindo ao DoutrinaHUD' });
    });

    // Eventos de Controle (Dashboard)
    socket.on('hud:command', (command: any) => {
      console.log('Comando recebido do painel:', command);
      // Fazer broadcast do comando para o overlay
      io.emit('hud:update', command);
    });

    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
}
