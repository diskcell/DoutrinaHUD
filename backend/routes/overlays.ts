import { Router } from 'express';
import { overlayModelRepository } from '../database/repositories/overlayModelRepository.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(overlayModelRepository.getAll());
});

router.get('/active', (_req, res) => {
  const activeModel = overlayModelRepository.getActive();
  res.json(activeModel);
});

router.put('/:id/active', (req, res) => {
  const success = overlayModelRepository.setActive(String(req.params.id));

  if (!success) {
    return res.status(404).json({ success: false, error: 'Overlay model not found' });
  }

  return res.json({ success: true });
});

export default router;
