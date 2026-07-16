import { Router } from 'express';
import { overlayModelRepository } from '../database/repositories/overlayModelRepository.js';
import { requireAuth } from '../auth/requireAuth.js';
import { sessionService } from '../online/sessionService.js';

const router = Router();

router.get('/', requireAuth, (req, res) => {
  res.json(overlayModelRepository.getAll(req.authUser!.workspace_id));
});

router.get('/active', (req, res) => {
  const session = sessionService.get(String(req.query.session || ''));
  const activeModel = overlayModelRepository.getActive(session?.workspaceId || undefined);
  res.json(activeModel);
});

router.put('/:id/active', requireAuth, (req, res) => {
  const success = overlayModelRepository.setActive(String(req.params.id), req.authUser!.workspace_id);

  if (!success) {
    return res.status(404).json({ success: false, error: 'Overlay model not found' });
  }

  return res.json({ success: true });
});

export default router;
