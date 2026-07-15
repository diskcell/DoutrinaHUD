import { Router } from 'express';
import { steamProfileService } from '../services/steamProfileService.js';

const router = Router();

router.post('/players', async (req, res) => {
  try {
    const { steamids } = req.body;

    if (!Array.isArray(steamids)) {
      return res.status(400).json({ error: 'steamids must be an array of strings' });
    }

    const profiles = await steamProfileService.getProfiles(steamids);
    res.json({ profiles });
  } catch (error) {
    console.error('Error in /api/steam/players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
