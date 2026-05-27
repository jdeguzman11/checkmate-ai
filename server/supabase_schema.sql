create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  white_player text not null default 'Unknown',
  black_player text not null default 'Unknown',
  result text not null default '*',
  game_date date,
  pgn text not null,
  analysis_json jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.games
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.games enable row level security;

create index if not exists games_created_at_idx on public.games (created_at desc);
create index if not exists games_user_id_created_at_idx on public.games (user_id, created_at desc);

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'games'
      and policyname = 'Users can read their own games'
  ) then
    create policy "Users can read their own games"
      on public.games for select
      using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'games'
      and policyname = 'Users can insert their own games'
  ) then
    create policy "Users can insert their own games"
      on public.games for insert
      with check (auth.uid() = user_id);
  end if;
end
$$;
