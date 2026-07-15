import db from '../index.js';

export const playerRepository = {
  getAll: () => {
    const players = db.prepare('SELECT * FROM players ORDER BY nickname ASC').all();
    return players.map((p: any) => ({
      ...p,
      avatar: p.avatar_url
    }));
  },

  getById: (id: number) => {
    const player = db.prepare('SELECT * FROM players WHERE id = ?').get(id);
    if (!player) return null;
    return {
      ...player,
      avatar: player.avatar_url
    };
  },

  getByTeamId: (teamId: number) => {
    const players = db.prepare('SELECT * FROM players WHERE team_id = ?').all(teamId);
    return players.map((p: any) => ({
      ...p,
      avatar: p.avatar_url
    }));
  },

  create: (player: any) => {
    const {
      id,
      nickname,
      real_name,
      steam_id,
      avatar,
      team_id,
      role,
      country,
      hltv_player_id,
      hltv_profile_url,
      avatar_source,
    } = player;
    const stmt = db.prepare(`
      INSERT INTO players (
        id,
        nickname,
        real_name,
        steam_id,
        avatar_url,
        team_id,
        role,
        country,
        hltv_player_id,
        hltv_profile_url,
        avatar_source,
        hltv_synced_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    return stmt.run(
      id,
      nickname,
      real_name,
      steam_id,
      avatar,
      team_id,
      role,
      country,
      hltv_player_id || null,
      hltv_profile_url || null,
      avatar_source || null
    );
  },

  update: (id: number, player: any) => {
    const {
      nickname,
      real_name,
      steam_id,
      avatar,
      team_id,
      role,
      country,
      hltv_player_id,
      hltv_profile_url,
      avatar_source,
    } = player;
    const stmt = db.prepare(`
      UPDATE players 
      SET
        nickname = ?,
        real_name = ?,
        steam_id = ?,
        avatar_url = ?,
        team_id = ?,
        role = ?,
        country = ?,
        hltv_player_id = COALESCE(?, hltv_player_id),
        hltv_profile_url = COALESCE(?, hltv_profile_url),
        avatar_source = COALESCE(?, avatar_source),
        hltv_synced_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    return stmt.run(
      nickname,
      real_name,
      steam_id,
      avatar,
      team_id,
      role,
      country,
      hltv_player_id || null,
      hltv_profile_url || null,
      avatar_source || null,
      id
    );
  },

  findByHltvPlayerId: (hltvPlayerId: string) => {
    return db.prepare('SELECT * FROM players WHERE hltv_player_id = ?').get(hltvPlayerId);
  },

  findByNicknameAndTeam: (nickname: string, teamId: number) => {
    return db.prepare(`
      SELECT * FROM players
      WHERE lower(nickname) = lower(?) AND team_id = ?
      LIMIT 1
    `).get(nickname, teamId);
  },

  upsertFromHltv: (player: any) => {
    const existing =
      (player.hltv_player_id && playerRepository.findByHltvPlayerId(player.hltv_player_id)) ||
      playerRepository.findByNicknameAndTeam(player.nickname, player.team_id);

    if (existing) {
      playerRepository.update(existing.id, {
        ...existing,
        ...player,
        avatar: player.avatar || existing.avatar_url,
      });

      return { id: existing.id, action: 'updated' };
    }

    const id = Date.now() + Math.floor(Math.random() * 10000);

    playerRepository.create({
      ...player,
      id,
    });

    return { id, action: 'created' };
  },

  delete: (id: number) => {
    return db.prepare('DELETE FROM players WHERE id = ?').run(id);
  }
};
