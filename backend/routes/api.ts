import { Router } from 'express';
import teamsRoutes from './teams.js';
import playersRoutes from './players.js';
import gsiRoutes from './gsi.js';
import steamRoutes from './steam.js';
import overlaysRoutes from './overlays.js';
import hltvRoutes from './hltv.js';
import { getTeams, getPlayers } from '../dataService.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DoutrinaHUD API rodando' });
});

// Resumo / Dashboard Stats
router.get('/stats', (req, res) => {
  try {
    const teams = getTeams();
    const players = getPlayers();
    
    res.json({
      teams: teams.length,
      players: players.length,
      activeMatches: 0 // Placeholder or implement match logic
    });
  } catch (error) {
    res.json({ teams: 0, players: 0, activeMatches: 0 });
  }
});

router.use('/teams', teamsRoutes);
router.use('/players', playersRoutes);
router.use('/gsi', gsiRoutes);
router.use('/steam', steamRoutes);
router.use('/overlays', overlaysRoutes);
router.use('/hltv', hltvRoutes);

export default router;
