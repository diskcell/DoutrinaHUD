export function normalizeGameState(gameState: any) {
  const rawGrenades =
    gameState.grenades ||
    gameState.allgrenades ||
    gameState.allgrenades_map ||
    null;

  return {
    provider: gameState.provider || null,
    map: {
      name: gameState.map?.name || null,
      phase: gameState.map?.phase || null,
      round: gameState.map?.round || 0,
      team_ct: gameState.map?.team_ct || null,
      team_t: gameState.map?.team_t || null,
      num_matches_to_win_series: gameState.map?.num_matches_to_win_series || 0,
      current_spectator_count: gameState.map?.current_spectator_count || 0,
      souvenirs_total: gameState.map?.souvenirs_total || 0,
    },
    round: {
      phase: gameState.round?.phase || null,
      bomb: gameState.round?.bomb || null,
      win_team: gameState.round?.win_team || null,
    },
    player: {
      steamid: gameState.player?.steamid || null,
      name: gameState.player?.name || null,
      clan: gameState.player?.clan || null,
      observer_slot: gameState.player?.observer_slot || null,
      team: gameState.player?.team || null,
      activity: gameState.player?.activity || null,
      match_stats: gameState.player?.match_stats || null,
      state: gameState.player?.state || null,
      weapons: gameState.player?.weapons || null,
    },
    allplayers: gameState.allplayers || null,
    phase_countdowns: {
      phase: gameState.phase_countdowns?.phase || null,
      phase_ends_in: gameState.phase_countdowns?.phase_ends_in || null,
    },
    bomb: {
      state: gameState.bomb?.state || null,
      position: gameState.bomb?.position || null,
      countdown: gameState.bomb?.countdown || null,
    },
    grenades: rawGrenades,
    auth: gameState.auth || null,
  };
}
