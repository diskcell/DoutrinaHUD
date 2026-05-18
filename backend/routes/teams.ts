import { Router } from 'express';
import { db } from '../../database/index.js';

const router = Router();

// Get all teams
router.get('/', (req, res) => {
  try {
    const teams = db.prepare('SELECT * FROM teams ORDER BY created_at DESC').all();
    res.json(teams);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar times' });
  }
});

// Create team
router.post('/', (req, res) => {
  try {
    const { name, tag, logo, country, organization, social_links, status } = req.body;
    const socialLinksStr = typeof social_links === 'object' ? JSON.stringify(social_links) : social_links;

    const stmt = db.prepare(`
      INSERT INTO teams (name, tag, logo, country, organization, social_links, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    // SQLite can't insert undefined into TEXT, need to supply null or string.
    const info = stmt.run(
      name || '',
      tag || '',
      logo || '',
      country || '',
      organization || '',
      socialLinksStr || '',
      status || 'active'
    );
    
    res.json({ id: info.lastInsertRowid, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar time' });
  }
});

// Update team
router.put('/:id', (req, res) => {
  try {
    const { name, tag, logo, country, organization, social_links, status } = req.body;
    const { id } = req.params;
    const socialLinksStr = typeof social_links === 'object' ? JSON.stringify(social_links) : social_links;

    const stmt = db.prepare(`
      UPDATE teams 
      SET name = ?, tag = ?, logo = ?, country = ?, organization = ?, social_links = ?, status = ?
      WHERE id = ?
    `);
    
    stmt.run(
      name || '',
      tag || '',
      logo || '',
      country || '',
      organization || '',
      socialLinksStr || '',
      status || 'active',
      id
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar time' });
  }
});

// Delete team
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM teams WHERE id = ?');
    stmt.run(id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao deletar time' });
  }
});

export default router;
