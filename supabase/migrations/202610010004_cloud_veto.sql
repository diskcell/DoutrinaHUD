-- Persistent captain veto sessions tied to an online DoutrinaHUD live session.
-- Raw captain tokens never reach Postgres; only SHA-256 hashes are stored.

create table if not exists public.live_veto_sessions (
  id uuid primary key default gen_random_uuid(),
  live_session_id uuid not null unique references public.live_sessions(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  left_token_hash text not null,
  right_token_hash text not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (left_token_hash ~ '^[0-9a-f]{64}$'),
  check (right_token_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists live_veto_sessions_workspace_idx
  on public.live_veto_sessions (workspace_id, updated_at desc);

drop trigger if exists live_veto_sessions_set_updated_at on public.live_veto_sessions;
create trigger live_veto_sessions_set_updated_at
before update on public.live_veto_sessions
for each row execute function public.set_updated_at();

alter table public.live_veto_sessions enable row level security;

drop policy if exists "live_veto_sessions_select_member" on public.live_veto_sessions;
create policy "live_veto_sessions_select_member"
on public.live_veto_sessions for select to authenticated
using (public.is_workspace_member(workspace_id));

drop policy if exists "live_veto_sessions_manage_editor" on public.live_veto_sessions;
create policy "live_veto_sessions_manage_editor"
on public.live_veto_sessions for all to authenticated
using (public.can_edit_workspace(workspace_id))
with check (public.can_edit_workspace(workspace_id));

grant select, insert, update, delete on public.live_veto_sessions to authenticated;
