import db from '../index.js';

function parseModel(row: any) {
  return {
    ...row,
    config: JSON.parse(row.config_json || '{}'),
    is_active: Boolean(row.is_active),
    is_default: Boolean(row.is_default),
  };
}

export const overlayModelRepository = {
  getAll: (workspaceId?: string) => {
    const rows = db
      .prepare('SELECT * FROM overlay_models ORDER BY is_active DESC, is_default DESC, created_at ASC')
      .all();

    const activeId: any = workspaceId ? db.prepare('SELECT active_model_id FROM workspace_overlay_settings WHERE workspace_id = ?').get(workspaceId) : null;
    return rows.map((row: any) => parseModel({ ...row, is_active: workspaceId ? Number(row.id === activeId?.active_model_id) : row.is_active }));
  },

  getActive: (workspaceId?: string) => {
    if (workspaceId) {
      const setting: any = db.prepare('SELECT active_model_id FROM workspace_overlay_settings WHERE workspace_id = ?').get(workspaceId);
      if (setting) { const model = db.prepare('SELECT * FROM overlay_models WHERE id = ?').get(setting.active_model_id); return model ? parseModel(model) : null; }
    }
    const row = db
      .prepare('SELECT * FROM overlay_models WHERE is_active = 1 LIMIT 1')
      .get();

    return row ? parseModel(row) : null;
  },

  setActive: (id: string, workspaceId?: string) => {
    const model = db.prepare('SELECT id FROM overlay_models WHERE id = ?').get(id);

    if (!model) {
      return false;
    }

    if (workspaceId) {
      db.prepare(`INSERT INTO workspace_overlay_settings (workspace_id, active_model_id, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(workspace_id) DO UPDATE SET active_model_id = excluded.active_model_id, updated_at = CURRENT_TIMESTAMP`).run(workspaceId, id);
      return true;
    }
    const transaction = db.transaction(() => {
      db.prepare('UPDATE overlay_models SET is_active = 0').run();
      db.prepare(`
        UPDATE overlay_models
        SET is_active = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(id);
    });

    transaction();
    return true;
  },
};
