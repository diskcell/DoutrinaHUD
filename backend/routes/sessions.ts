import { Router } from 'express';
import { sessionService } from '../online/sessionService.js';

const router = Router();

router.post('/', (_req, res) => {
  const session = sessionService.create();

  return res.status(201).json({
    id: session.id,
    token: session.token,
    createdAt: session.createdAt,
  });
});

router.get('/:sessionId', (req, res) => {
  const session = sessionService.getPublic(req.params.sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Sessao nao encontrada.' });
  }

  return res.json(session);
});

export default router;
