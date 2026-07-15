import db from '../index.js';

export const teamRepository = {
  getAll: () => {
    const teams = db.prepare('SELECT * FROM teams ORDER BY name ASC').all();
    return teams.map((t: any) => ({
      ...t,
      logo: t.logo_url
    }));
  },

  getById: (id: number) => {
    const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    if (!team) return null;
    return {
      ...team,
      logo: team.logo_url
    };
  },

  create: (team: any) => {
    const { id, name, tag, logo, country, color, hltv_url, hltv_team_id } = team;
    const stmt = db.prepare(`
      INSERT INTO teams (id, name, tag, logo_url, country, color, hltv_url, hltv_team_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(id, name, tag, logo, country, color, hltv_url || null, hltv_team_id || null);
  },

  update: (id: number, team: any) => {
    const { name, tag, logo, country, color, hltv_url, hltv_team_id } = team;
    const stmt = db.prepare(`
      UPDATE teams 
      SET name = ?, tag = ?, logo_url = ?, country = ?, color = ?, hltv_url = ?, hltv_team_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(name, tag, logo, country, color, hltv_url || null, hltv_team_id || null, id);
  },

  markHltvSynced: (id: number, hltvUrl: string, hltvTeamId?: string | null) => {
    return db.prepare(`
      UPDATE teams
      SET hltv_url = ?, hltv_team_id = ?, hltv_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(hltvUrl, hltvTeamId || null, id);
  },

  delete: (id: number) => {
    return db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  }
};
