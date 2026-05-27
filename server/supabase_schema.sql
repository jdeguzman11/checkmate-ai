create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  white_player text not null default 'Unknown',
  black_player text not null default 'Unknown',
  result text not null default '*',
  game_date date,
  pgn text not null,
  analysis_json jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists games_created_at_idx on public.games (created_at desc);
