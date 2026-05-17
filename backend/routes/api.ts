import { Router } from 'express';
import { db } from '../../database/index.js';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'DoutrinaHUD API rodando' });
});

// Resumo / Dashboard Stats (Placeholder)
router.get('/stats', (req, res) => {
  res.json({
    teams: 0,
    players: 0,
    activeMatches: 0
  });
});

export default router;
