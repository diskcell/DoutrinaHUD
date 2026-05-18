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
    cors: {
      origin: '*',
    },
  });

  const PORT = 3000;

  // Inicializa banco SQLite
  initializeSchema();

  // Middleware para receber JSON
  app.use(express.json());

  /*
   ============================================================
   GSI ENDPOINT (CS2 Game State Integration)
   ============================================================
   O Counter-Strike 2 envia dados automaticamente para:
   http://127.0.0.1:3000/gsi

   através do arquivo:
   gamestate_integration_doutrinahud.cfg
   ============================================================
  */

  app.post('/gsi', async (req, res) => {
    try {
      const gameState = req.body;

      const payload = {
        provider: gameState.provider || null,

        map: {
          name: gameState.map?.name || null,
          phase: gameState.map?.phase || null,
          round: gameState.map?.round || 0,
          team_ct: gameState.map?.team_ct || null,
          team_t: gameState.map?.team_t || null,
          num_matches_to_win_series:
            gameState.map?.num_matches_to_win_series || 0,
          current_spectator_count:
            gameState.map?.current_spectator_count || 0,
          souvenirs_total: gameState.map?.souvenirs_total || 0,
        },

        round: {
          phase: gameState.round?.phase || null,
          bomb: gameState.round?.bomb || null,
          win_team: gameState.round?.win_team || null,
        },

        player: {
          steamid: gameState.player?.steamid || null,
          name: gameState.player?.name || null,
          clan: gameState.player?.clan || null,
          observer_slot: gameState.player?.observer_slot || null,
          team: gameState.player?.team || null,
          activity: gameState.player?.activity || null,
          match_stats: gameState.player?.match_stats || null,
          state: gameState.player?.state || null,
          weapons: gameState.player?.weapons || null,
        },

        allplayers: gameState.allplayers || null,

        phase_countdowns: {
          phase: gameState.phase_countdowns?.phase || null,
          phase_ends_in:
            gameState.phase_countdowns?.phase_ends_in || null,
        },

        bomb: {
          state: gameState.bomb?.state || null,
          position: gameState.bomb?.position || null,
          countdown: gameState.bomb?.countdown || null,
        },

        auth: gameState.auth || null,
      };

      // Envia atualização para overlay e painel
      io.emit('gsi:update', payload);

      // Emissor adicional para integração interna
      const { gsiEmitter } = await import(
        './backend/socket/gsiEmitter.js'
      );

      gsiEmitter.emit('gsi:update', payload);

      return res.sendStatus(200);
    } catch (error) {
      console.error('Erro ao processar GSI:', error);

      return res.status(500).json({
        error: 'Erro ao processar Game State Integration',
      });
    }
  });

  // API Routes
  app.use('/api', apiRoutes);

  // Setup Socket.io Handlers
  setupSocket(io);

  // Vite Middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
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

  // Inicializa servidor
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`DoutrinaHUD Server rodando na porta ${PORT}`);
  });
}

startServer();