import express from 'express';
import http from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';
import { createServer as createViteServer } from 'vite';

import apiRoutes from './backend/routes/api.js';
import { gsiEmitter } from './backend/socket/gsiEmitter.js';
import { setupSocket } from './backend/socket/handlers.js';
import { normalizeGameState } from './backend/gsi/normalizeGameState.js';
import { sessionService } from './backend/online/sessionService.js';

async function startServer() {
  const app = express();
  const server = http.createServer(app);

  // Socket.io Setup
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*',
    },
  });

  const PORT = Number(process.env.PORT || 3000);
  const isProduction =
    process.env.NODE_ENV === 'production' || process.argv[1]?.endsWith('.cjs');

  app.set('etag', false);

  app.use((req, res, next) => {
    if (req.method === 'GET') {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Surrogate-Control', 'no-store');
    }

    next();
  });

  // Middleware para receber JSON
  app.use(express.json({ limit: '10mb' }));

  // Servir uploads de forma estática
  app.use(
    '/uploads',
    express.static(path.join(process.cwd(), 'public/uploads'))
  );

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

      const rawGrenades =
        gameState.grenades ||
        gameState.allgrenades ||
        gameState.allgrenades_map ||
        null;

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

        // Dados de granadas/utilitários para trajetória no radar
        grenades: rawGrenades,

        auth: gameState.auth || null,
      };

      /*
       ============================================================
       DEBUG OPCIONAL
       ============================================================
       Descomente esse bloco só para testar se o CS2 está enviando
       granadas para o servidor.

       if (rawGrenades) {
         console.log('GRENADES RECEBIDAS:', Object.keys(rawGrenades).length);
       }
       ============================================================
      */

      // Envia atualização para overlay e painel

      // Emissor adicional para integração interna
      sessionService.updateGsi(sessionService.localSessionId, payload);
      gsiEmitter.emit('gsi:update', {
        sessionId: sessionService.localSessionId,
        data: payload,
      });

      return res.sendStatus(200);
    } catch (error) {
      console.error('Erro ao processar GSI:', error);

      return res.status(500).json({
        error: 'Erro ao processar Game State Integration',
      });
    }
  });

  app.post('/gsi/:sessionId', (req, res) => {
    try {
      const { sessionId } = req.params;
      const token =
        req.header('x-doutrinahud-session-token') || req.body?.auth?.token || null;

      if (!sessionService.verifyToken(sessionId, token)) {
        return res.status(401).json({ error: 'Token de sessao invalido.' });
      }

      const payload = normalizeGameState(req.body);
      sessionService.updateGsi(sessionId, payload);
      gsiEmitter.emit('gsi:update', { sessionId, data: payload });

      return res.sendStatus(200);
    } catch (error) {
      console.error('Erro ao processar GSI remoto:', error);
      return res.status(500).json({ error: 'Erro ao processar Game State Integration' });
    }
  });

  // API Routes
  app.use('/api', apiRoutes);

  // Setup Socket.io Handlers
  setupSocket(io);

  // Vite Middleware
  if (!isProduction) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');

    app.use(
      express.static(distPath, {
        etag: false,
        lastModified: false,
        setHeaders: (res) => {
          res.setHeader(
            'Cache-Control',
            'no-store, no-cache, must-revalidate, proxy-revalidate'
          );
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
          res.setHeader('Surrogate-Control', 'no-store');
        },
      })
    );

    app.get('*', (req, res) => {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, proxy-revalidate'
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Inicializa servidor
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`DoutrinaHUD Server rodando na porta ${PORT}`);
    console.log(`GSI aguardando em: http://127.0.0.1:${PORT}/gsi`);
  });
}

startServer();
