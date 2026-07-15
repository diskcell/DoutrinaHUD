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
  getAll: () => {
    const rows = db
      .prepare('SELECT * FROM overlay_models ORDER BY is_active DESC, is_default DESC, created_at ASC')
      .all();

    return rows.map(parseModel);
  },

  getActive: () => {
    const row = db
      .prepare('SELECT * FROM overlay_models WHERE is_active = 1 LIMIT 1')
      .get();

    return row ? parseModel(row) : null;
  },

  setActive: (id: string) => {
    const model = db.prepare('SELECT id FROM overlay_models WHERE id = ?').get(id);

    if (!model) {
      return false;
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
