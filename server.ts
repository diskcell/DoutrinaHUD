import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';

import { initializeSchema } from './database/index.js';
import apiRoutes from './backend/routes/api.js';
import { setupSocket } from './backend/socket/handlers.js';

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  
  // Socket.io Setup
  const io = new SocketIOServer(server, {
    cors: { origin: '*' }
  });
  
  const PORT = 3000;

  // Initialize SQLite schema
  initializeSchema();

  app.use(express.json());

  // API Routes
  app.use('/api', apiRoutes);

  // Setup Socket.io Handlers
  setupSocket(io);

  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`DoutrinaHUD Server rodando na porta ${PORT}`);
  });
}

startServer();
