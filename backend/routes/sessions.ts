import { Router } from 'express';
import { sessionService } from '../online/sessionService.js';
import { requireAuth } from '../auth/requireAuth.js';

const router = Router();

router.post('/', requireAuth, (req, res) => {
  const session = sessionService.create(req.authUser!.workspace_id);

  return res.status(201).json({
    id: session.id,
    token: session.token,
    controlToken: session.controlToken,
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
