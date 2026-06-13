-- ════════════════════════════════════════════════════════════
--  Block Puzzle — leaderboard schema
--  Run this once in Supabase → SQL Editor → New query → Run.
-- ════════════════════════════════════════════════════════════

create table if not exists public.leaderboard (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  category    text not null,                                   -- 'animals' | 'food' | 'vehicles' | 'structures' | 'shapes'
  shape       text not null,                                   -- e.g. 'Cat'
  level       int,                                             -- 0-9 (category mode), or random index (quick play)
  difficulty  int,                                             -- 0 easy | 1 medium | 2 hard
  mode        text,                                            -- 'category' | 'quick'
  moves       int  not null check (moves > 0 and moves < 10000),
  name        text not null check (char_length(name) between 1 and 24),
  message     text check (char_length(message) <= 80)
);

-- Fast per-category top-10 (fewest moves first, earliest as tie-breaker)
create index if not exists leaderboard_cat_moves_idx
  on public.leaderboard (category, moves asc, created_at asc);

-- ── Row Level Security ──────────────────────────────────────
-- Public can READ all rows and INSERT new ones. No UPDATE / DELETE
-- (those have no policy, so RLS denies them for the anon key).
alter table public.leaderboard enable row level security;

drop policy if exists "public read" on public.leaderboard;
create policy "public read"
  on public.leaderboard for select
  to anon, authenticated
  using (true);

drop policy if exists "public insert" on public.leaderboard;
create policy "public insert"
  on public.leaderboard for insert
  to anon, authenticated
  with check (
    char_length(name) between 1 and 24
    and (message is null or char_length(message) <= 80)
    and moves > 0 and moves < 10000
  );
