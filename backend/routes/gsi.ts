import { Router } from 'express';
import { gsiEmitter } from '../socket/gsiEmitter.js';
import { normalizeGameState } from '../gsi/normalizeGameState.js';
import { sessionService } from '../online/sessionService.js';

const router = Router();

router.post('/', (req, res) => {
  try {
    const data = req.body;
    
    // Validate if it's a valid GSI payload
    if (data && data.provider && data.provider.appid === 730) {
      const payload = normalizeGameState(data);
      sessionService.updateGsi(sessionService.localSessionId, payload);
      gsiEmitter.emit('gsi:update', {
        sessionId: sessionService.localSessionId,
        data: payload,
      });
    }
    
    // CS2 GSI expects 200 OK
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro ao processar GSI:', error);
    res.status(500).send('Error');
  }
});

export default router;
