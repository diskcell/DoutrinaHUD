import db from '../index.js';

export const liveStateRepository = {
  get: () => {
    const row: any = db.prepare('SELECT state_json FROM live_state WHERE id = 1').get();
    return row ? JSON.parse(row.state_json) : null;
  },

  save: (state: any) => {
    const stateJson = JSON.stringify(state);
    const stmt = db.prepare(`
      INSERT INTO live_state (id, state_json, updated_at)
      VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        state_json = excluded.state_json,
        updated_at = CURRENT_TIMESTAMP
    `);
    return stmt.run(stateJson);
  }
};
