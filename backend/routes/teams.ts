import { Router } from 'express';
import { teamRepository } from '../database/repositories/teamRepository.js';
import { saveImage } from '../dataService.js';
import { requireAuth } from '../auth/requireAuth.js';

const router = Router();

// Get all teams
router.use(requireAuth);

router.get('/', (req, res) => {
  res.json(teamRepository.getAll(req.authUser!.workspace_id));
});

// Create team
router.post('/', (req, res) => {
  const newTeam = {
    ...req.body, workspace_id: req.authUser!.workspace_id,
    id: Date.now(),
    logo: saveImage(req.body.logo, 'team')
  };
  teamRepository.create(newTeam);
  res.json({ id: newTeam.id, success: true });
});

// Update team
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const logo = req.body.logo.startsWith('data:image') 
    ? saveImage(req.body.logo, 'team') 
    : req.body.logo;
    
  teamRepository.update(Number(id), { ...req.body, logo }, req.authUser!.workspace_id);
  res.json({ success: true });
});

// Delete team
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  teamRepository.delete(Number(id), req.authUser!.workspace_id);
  res.json({ success: true });
});

export default router;
