import db from '../index.js';

export const matchRepository = {
  getById: (id: string) => {
    return db.prepare('SELECT * FROM matches WHERE id = ?').get(id);
  },

  save: (match: any) => {
    const { 
      id, left_team_id, right_team_id, format, stage, status, 
      current_map, auto_mode, score_home, score_away, 
      score_series_home, score_series_away, side_home 
    } = match;

    const stmt = db.prepare(`
      INSERT INTO matches (
        id, left_team_id, right_team_id, format, stage, status, 
        current_map, auto_mode, score_home, score_away, 
        score_series_home, score_series_away, side_home, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        left_team_id = excluded.left_team_id,
        right_team_id = excluded.right_team_id,
        format = excluded.format,
        stage = excluded.stage,
        status = excluded.status,
        current_map = excluded.current_map,
        auto_mode = excluded.auto_mode,
        score_home = excluded.score_home,
        score_away = excluded.score_away,
        score_series_home = excluded.score_series_home,
        score_series_away = excluded.score_series_away,
        side_home = excluded.side_home,
        updated_at = CURRENT_TIMESTAMP
    `);

    return stmt.run(
      id, left_team_id, right_team_id, format, stage, status, 
      current_map, auto_mode ? 1 : 0, score_home, score_away, 
      score_series_home, score_series_away, side_home
    );
  }
};
