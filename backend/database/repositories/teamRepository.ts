import db from '../index.js';

export const teamRepository = {
  getAll: (workspaceId?: string) => {
    const teams = workspaceId
      ? db.prepare('SELECT * FROM teams WHERE workspace_id = ? ORDER BY name ASC').all(workspaceId)
      : db.prepare('SELECT * FROM teams ORDER BY name ASC').all();
    return teams.map((t: any) => ({
      ...t,
      logo: t.logo_url
    }));
  },

  getById: (id: number, workspaceId?: string) => {
    const team = workspaceId
      ? db.prepare('SELECT * FROM teams WHERE id = ? AND workspace_id = ?').get(id, workspaceId)
      : db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as any;
    if (!team) return null;
    return {
      ...team,
      logo: team.logo_url
    };
  },

  create: (team: any) => {
    const { id, name, tag, logo, country, color, hltv_url, hltv_team_id, workspace_id } = team;
    const stmt = db.prepare(`
      INSERT INTO teams (id, name, tag, logo_url, country, color, hltv_url, hltv_team_id, workspace_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(id, name, tag, logo, country, color, hltv_url || null, hltv_team_id || null, workspace_id || null);
  },

  update: (id: number, team: any, workspaceId?: string) => {
    const { name, tag, logo, country, color, hltv_url, hltv_team_id } = team;
    const stmt = db.prepare(`
      UPDATE teams 
      SET name = ?, tag = ?, logo_url = ?, country = ?, color = ?, hltv_url = ?, hltv_team_id = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? ${workspaceId ? 'AND workspace_id = ?' : ''}
    `);
    return workspaceId
      ? stmt.run(name, tag, logo, country, color, hltv_url || null, hltv_team_id || null, id, workspaceId)
      : stmt.run(name, tag, logo, country, color, hltv_url || null, hltv_team_id || null, id);
  },

  markHltvSynced: (id: number, hltvUrl: string, hltvTeamId?: string | null) => {
    return db.prepare(`
      UPDATE teams
      SET hltv_url = ?, hltv_team_id = ?, hltv_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(hltvUrl, hltvTeamId || null, id);
  },

  delete: (id: number, workspaceId?: string) => {
    return workspaceId
      ? db.prepare('DELETE FROM teams WHERE id = ? AND workspace_id = ?').run(id, workspaceId)
      : db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  }
};
