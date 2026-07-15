import { Router } from 'express';
import { playerRepository } from '../database/repositories/playerRepository.js';
import { saveImage } from '../dataService.js';
import { requireAuth } from '../auth/requireAuth.js';

const router = Router();

// Get all players
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json(playerRepository.getAll(req.authUser!.workspace_id));
});

// Create player
router.post('/', (req, res) => {
  const newPlayer = {
    ...req.body, workspace_id: req.authUser!.workspace_id,
    id: Date.now(),
    avatar: saveImage(req.body.avatar, 'player')
  };
  playerRepository.create(newPlayer);
  res.json({ id: newPlayer.id, success: true });
});

// Update player
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const avatar = req.body.avatar && req.body.avatar.startsWith('data:image') 
    ? saveImage(req.body.avatar, 'player') 
    : req.body.avatar;
    
  playerRepository.update(Number(id), { ...req.body, avatar }, req.authUser!.workspace_id);
  res.json({ success: true });
});

// Delete player
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  playerRepository.delete(Number(id), req.authUser!.workspace_id);
  res.json({ success: true });
});

export default router;
