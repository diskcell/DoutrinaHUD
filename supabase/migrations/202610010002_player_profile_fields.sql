alter table public.players
  add column if not exists steam_link text,
  add column if not exists faceit_link text,
  add column if not exists status text not null default 'active';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'players_status_check'
      and conrelid = 'public.players'::regclass
  ) then
    alter table public.players
      add constraint players_status_check
      check (status in ('active', 'inactive'));
  end if;
end;
$$;
