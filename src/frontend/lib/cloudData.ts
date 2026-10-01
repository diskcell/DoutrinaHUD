import { requireSupabase } from '../../lib/supabase';
import { getCloudAssetUrl } from './cloudAssets';

export async function listCloudTeams(workspaceId: string) {
  const { data, error } = await requireSupabase()
    .from('teams')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name');

  if (error) throw error;

  return (data || []).map((team) => ({
    ...team,
    logo: getCloudAssetUrl(team.logo_path),
  }));
}

export async function saveCloudTeam(
  workspaceId: string,
  team: Record<string, unknown>,
  id?: number
) {
  const client = requireSupabase();
  const query = id
    ? client.from('teams').update(team).eq('id', id).eq('workspace_id', workspaceId)
    : client.from('teams').insert({ ...team, workspace_id: workspaceId });
  const { error } = await query;

  if (error) throw error;
}

export async function deleteCloudTeam(workspaceId: string, id: number) {
  const { error } = await requireSupabase()
    .from('teams')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) throw error;
}

export async function listCloudPlayers(workspaceId: string) {
  const { data, error } = await requireSupabase()
    .from('players')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('nickname');

  if (error) throw error;

  return (data || []).map((player) => ({
    ...player,
    avatar: getCloudAssetUrl(player.avatar_path),
  }));
}

export async function saveCloudPlayer(
  workspaceId: string,
  player: Record<string, unknown>,
  id?: number
) {
  const client = requireSupabase();
  const query = id
    ? client.from('players').update(player).eq('id', id).eq('workspace_id', workspaceId)
    : client.from('players').insert({ ...player, workspace_id: workspaceId });
  const { error } = await query;

  if (error) throw error;
}

export async function deleteCloudPlayer(workspaceId: string, id: number) {
  const { error } = await requireSupabase()
    .from('players')
    .delete()
    .eq('id', id)
    .eq('workspace_id', workspaceId);

  if (error) throw error;
}
