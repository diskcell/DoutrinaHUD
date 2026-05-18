import { Router } from 'express';
import { db } from '../../database/index.js';
import teamsRoutes from './teams.js';
import gsiRoutes from './gsi.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DoutrinaHUD API rodando' });
});

// Resumo / Dashboard Stats (Placeholder)
router.get('/stats', (req, res) => {
// We can use the db to get accurate stats now
  try {
    const teamsCount = db.prepare('SELECT COUNT(*) as count FROM teams').get() as { count: number };
    const playersCount = db.prepare('SELECT COUNT(*) as count FROM players').get() as { count: number };
    const matchesCount = db.prepare('SELECT COUNT(*) as count FROM matches WHERE status = "active"').get() as { count: number };
    
    res.json({
      teams: teamsCount.count,
      players: playersCount.count,
      activeMatches: matchesCount.count
    });
  } catch (error) {
    res.json({ teams: 0, players: 0, activeMatches: 0 });
  }
});

router.use('/teams', teamsRoutes);
router.use('/gsi', gsiRoutes);

export default router;
