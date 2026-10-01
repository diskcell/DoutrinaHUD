-- DoutrinaHUD online live sessions. Tokens are generated in the browser and
-- only their SHA-256 hashes are stored in Postgres.

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  gsi_token_hash text not null,
  control_token_hash text not null,
  overlay_model_id text not null default 'professional_v1',
  latest_hud_state jsonb,
  status text not null default 'active' check (status in ('active', 'revoked')),
  last_seen_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(public_id) between 16 and 64),
  check (gsi_token_hash ~ '^[0-9a-f]{64}$'),
  check (control_token_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists live_sessions_workspace_idx
  on public.live_sessions (workspace_id, created_at desc);

create index if not exists live_sessions_active_idx
  on public.live_sessions (public_id, expires_at)
  where status = 'active';

drop trigger if exists live_sessions_set_updated_at on public.live_sessions;
create trigger live_sessions_set_updated_at
before update on public.live_sessions
for each row execute function public.set_updated_at();

alter table public.live_sessions enable row level security;

drop policy if exists "live_sessions_select_member" on public.live_sessions;
create policy "live_sessions_select_member"
on public.live_sessions for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "live_sessions_insert_editor" on public.live_sessions;
create policy "live_sessions_insert_editor"
on public.live_sessions for insert to authenticated
with check (
  created_by = auth.uid()
  and public.can_edit_workspace(workspace_id)
);

drop policy if exists "live_sessions_update_editor" on public.live_sessions;
create policy "live_sessions_update_editor"
on public.live_sessions for update to authenticated
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

drop policy if exists "live_sessions_delete_owner" on public.live_sessions;
create policy "live_sessions_delete_owner"
on public.live_sessions for delete to authenticated
using (
  exists (
    select 1
    from public.workspaces
    where id = workspace_id
      and owner_id = auth.uid()
  )
);

grant select, insert, update, delete on public.live_sessions to authenticated;

-- Public overlays need the latest HUD configuration and registered player
-- identities, but never receive workspace IDs or token hashes.
create or replace function public.get_live_session_bootstrap(target_public_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'active', (session.status = 'active' and session.expires_at > now()),
    'overlayModelId', session.overlay_model_id,
    'latestHudState', session.latest_hud_state,
    'lastSeenAt', session.last_seen_at,
    'expiresAt', session.expires_at,
    'players', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', player.id,
            'team_id', player.team_id,
            'nickname', player.nickname,
            'real_name', player.real_name,
            'steam_id', player.steam_id,
            'steam_link', player.steam_link,
            'faceit_link', player.faceit_link,
            'avatar_path', player.avatar_path,
            'role', player.role,
            'country', player.country,
            'status', player.status
          )
          order by player.nickname
        )
        from public.players as player
        where player.workspace_id = session.workspace_id
          and player.status = 'active'
      ),
      '[]'::jsonb
    )
  )
  from public.live_sessions as session
  where session.public_id = target_public_id
    and session.status = 'active'
    and session.expires_at > now()
  limit 1;
$$;

revoke all on function public.get_live_session_bootstrap(text) from public;
grant execute on function public.get_live_session_bootstrap(text) to anon, authenticated;

