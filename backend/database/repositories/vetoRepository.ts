import db from '../index.js';

export const vetoRepository = {
  getSession: (id: string) => {
    const session: any = db.prepare('SELECT * FROM veto_sessions WHERE id = ?').get(id);
    if (!session) return null;

    // Carregar ações e mapas selecionados
    const actions = db.prepare('SELECT * FROM veto_actions WHERE veto_session_id = ? ORDER BY timestamp ASC').all(id);
    const selectedMaps = db.prepare('SELECT * FROM selected_maps WHERE veto_session_id = ? ORDER BY map_number ASC').all(id);

    // Reconstruir o objeto da sessão
    return {
      ...session,
      leftReady: !!session.left_ready,
      rightReady: !!session.right_ready,
      leftConnected: !!session.left_connected,
      rightConnected: !!session.right_connected,
      isFinished: !!session.is_finished,
      currentStepIndex: session.current_step_index,
      currentTurn: session.current_turn,
      availableMaps: JSON.parse(session.available_maps_json),
      activeMapPool: JSON.parse(session.active_map_pool_json),
      flow: JSON.parse(session.flow_json),
      actions: actions.map((a: any) => ({
        ...a,
        mapNames: a.map_names_json ? JSON.parse(a.map_names_json) : undefined
      })),
      selectedMaps: selectedMaps
    };
  },

  getAllSessions: () => {
    return db.prepare('SELECT id FROM veto_sessions').all().map((s: any) => vetoRepository.getSession(s.id));
  },

  saveSession: (session: any) => {
    const ensureTeam = (team: any) => {
      if (!team?.id || !team?.name) return;

      db.prepare(`
        INSERT INTO teams (
          id,
          name,
          tag,
          logo_url
        ) VALUES (?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          tag = excluded.tag,
          logo_url = excluded.logo_url,
          updated_at = CURRENT_TIMESTAMP
      `).run(
        team.id,
        team.name,
        team.tag || null,
        team.logo || team.logo_url || null
      );
    };

    ensureTeam(session.leftTeam);
    ensureTeam(session.rightTeam);

    db.prepare(`
      INSERT INTO matches (
        id,
        left_team_id,
        right_team_id,
        format,
        status
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        left_team_id = excluded.left_team_id,
        right_team_id = excluded.right_team_id,
        format = excluded.format,
        updated_at = CURRENT_TIMESTAMP
    `).run(
      session.matchId,
      session.leftTeam?.id || null,
      session.rightTeam?.id || null,
      session.format || 'BO3',
      'setup'
    );

    const stmt = db.prepare(`
      INSERT INTO veto_sessions (
        id, match_id, format, status, left_team_id, right_team_id, 
        left_token, right_token, left_ready, right_ready, 
        left_connected, right_connected, current_step_index, current_turn, 
        is_finished, available_maps_json, active_map_pool_json, flow_json, 
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        left_ready = excluded.left_ready,
        right_ready = excluded.right_ready,
        left_connected = excluded.left_connected,
        right_connected = excluded.right_connected,
        current_step_index = excluded.current_step_index,
        current_turn = excluded.current_turn,
        is_finished = excluded.is_finished,
        available_maps_json = excluded.available_maps_json,
        updated_at = CURRENT_TIMESTAMP
    `);

    return stmt.run(
      session.matchId,
      session.matchId, // Usando matchId como ID da sessão também para simplificar
      session.format,
      session.status,
      session.leftTeam?.id,
      session.rightTeam?.id,
      session.leftToken,
      session.rightToken,
      session.leftReady ? 1 : 0,
      session.rightReady ? 1 : 0,
      session.leftConnected ? 1 : 0,
      session.rightConnected ? 1 : 0,
      session.currentStepIndex,
      session.currentTurn,
      session.isFinished ? 1 : 0,
      JSON.stringify(session.availableMaps),
      JSON.stringify(session.activeMapPool),
      JSON.stringify(session.flow)
    );
  },

  addAction: (sessionId: string, action: any) => {
    const stmt = db.prepare(`
      INSERT INTO veto_actions (
        id, veto_session_id, step_index, action, team_side, 
        map_name, map_names_json, map_number, starting_side, 
        side_choice_by, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      action.id,
      sessionId,
      action.stepIndex,
      action.action,
      action.teamSide,
      action.mapName,
      action.mapNames ? JSON.stringify(action.mapNames) : null,
      action.mapNumber,
      action.startingSide,
      action.sideChoiceBy,
      action.timestamp
    );
  },

  addSelectedMap: (sessionId: string, map: any) => {
    const stmt = db.prepare(`
      INSERT INTO selected_maps (
        veto_session_id, map_name, map_number, picked_by, 
        side_choice_by, starting_side
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(
      sessionId,
      map.mapName,
      map.mapNumber,
      map.pickedBy,
      map.sideChoiceBy,
      map.startingSide
    );
  },

  updateSelectedMapSide: (sessionId: string, mapNumber: number, side: string) => {
    const stmt = db.prepare(`
      UPDATE selected_maps 
      SET starting_side = ? 
      WHERE veto_session_id = ? AND map_number = ?
    `);
    return stmt.run(side, sessionId, mapNumber);
  },

  clearSessionData: (sessionId: string) => {
    db.prepare('DELETE FROM veto_actions WHERE veto_session_id = ?').run(sessionId);
    db.prepare('DELETE FROM selected_maps WHERE veto_session_id = ?').run(sessionId);
  },

  deleteSession: (id: string) => {
    return db.prepare('DELETE FROM veto_sessions WHERE id = ?').run(id);
  }
};
