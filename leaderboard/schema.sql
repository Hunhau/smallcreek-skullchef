-- ============================================================================
-- Smallcreek Skullchef — Global Leaderboard schema (Supabase / Postgres)
-- ----------------------------------------------------------------------------
-- Run this whole file once in: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- It is idempotent-ish (uses IF NOT EXISTS / CREATE OR REPLACE / drops policies first)
-- so you can re-run it safely while iterating.
--
-- DESIGN CHOICE: one row per player with THREE value columns
--   (score, prestige, prix_wins) — NOT a separate scores(board enum, value) table.
-- Why: there are exactly 3 fixed boards and each player has at most one value per
-- board. A single row makes upsert trivial, RLS simple ("you may only touch your own
-- row"), and top-N a plain indexed `ORDER BY <col> DESC LIMIT n`. An EAV scores table
-- would add joins + a composite unique constraint for zero benefit at this scale.
-- If boards ever become dynamic/user-generated, migrate to a scores table then.
--
-- SECURITY MODEL:
--   * Public can SELECT (read the boards).
--   * NO direct INSERT/UPDATE/DELETE from clients (RLS denies it).
--   * All writes go through submit_score(...) — a SECURITY DEFINER function that
--     validates + clamps + rate-limits + enforces monotonic (never-decreasing) values.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Extensions (gen_random_uuid lives in pgcrypto; present by default on Supabase)
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Table: players  (one row per anonymous player = one row per board-set)
-- ---------------------------------------------------------------------------
create table if not exists public.players (
    id           uuid        primary key default gen_random_uuid(),
    display_name text        not null default 'Chef',
    platform     text        not null default 'web',   -- web | youtube | steam | android | ios
    score        bigint      not null default 0,        -- Board 1: Total Score (coins / Energy Balls)
    prestige     integer     not null default 0,        -- Board 2: Prestige (Angel Awakening level)
    prix_wins    integer     not null default 0,        -- Board 3: Grand Prix wins
    created_at   timestamptz not null default now(),
    updated_at   timestamptz not null default now(),

    -- Defensive sanity bounds at the storage layer (the RPC enforces these too).
    constraint players_score_chk     check (score     >= 0 and score     <= 1000000000000000),  -- <= 1e15
    constraint players_prestige_chk  check (prestige  >= 0 and prestige  <= 10000),
    constraint players_prix_chk      check (prix_wins >= 0 and prix_wins <= 1000000),
    constraint players_name_len_chk  check (char_length(display_name) between 1 and 20)
);

-- ---------------------------------------------------------------------------
-- Indexes for fast top-N per board (descending; values are the sort key).
-- ---------------------------------------------------------------------------
create index if not exists players_score_idx     on public.players (score     desc);
create index if not exists players_prestige_idx  on public.players (prestige  desc);
create index if not exists players_prix_idx      on public.players (prix_wins desc);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.players enable row level security;

-- Public READ of the leaderboard (anyone, including the anon key, can select).
drop policy if exists "players_public_read" on public.players;
create policy "players_public_read"
    on public.players
    for select
    using (true);

-- NOTE: we intentionally create NO insert/update/delete policies for anon/authenticated.
-- With RLS enabled and no permissive write policy, all direct client writes are DENIED.
-- Writes happen ONLY through submit_score() below (SECURITY DEFINER bypasses RLS safely
-- while applying its own validation). This is the core anti-tamper boundary.

-- ===========================================================================
-- Helper: sanitize a display name server-side (mirror of client validation).
--   * trim, collapse whitespace, strip control chars
--   * allow letters (incl. accents), digits, space and  _ - . !
--   * enforce length 3..20, fallback to 'Chef'
--   * tiny casual-game blocklist (NOT a full profanity engine)
-- ===========================================================================
create or replace function public.lb_clean_name(raw text)
returns text
language plpgsql
immutable
as $$
declare
    n text;
begin
    if raw is null then
        return 'Chef';
    end if;
    -- strip control chars, normalize whitespace
    n := regexp_replace(raw, '[\x00-\x1F\x7F]', '', 'g');
    n := regexp_replace(n, '\s+', ' ', 'g');
    n := btrim(n);
    -- keep only an allow-list of characters
    n := regexp_replace(n, '[^[:alnum:] _.!\-\u00C0-\u017F]', '', 'g');
    n := btrim(n);
    -- length clamp
    if char_length(n) > 20 then
        n := left(n, 20);
    end if;
    if char_length(n) < 3 then
        return 'Chef';
    end if;
    -- minimal blocklist (case-insensitive, substring). Extend as needed.
    if lower(n) ~ '(nigger|faggot|kike|spic|chink|cunt|rape)' then
        return 'Chef';
    end if;
    return n;
end;
$$;

-- ===========================================================================
-- RPC: submit_score
--   The ONLY write path for clients. Validates, clamps, rate-limits, upserts,
--   and only ever RAISES a player's value (monotonic). Returns the stored row.
--
--   Params: p_id        uuid  (the client-generated player UUID)
--           p_name      text  (chosen display name; cleaned server-side)
--           p_platform  text  (web|youtube|steam|android|ios; defaulted/clamped)
--           p_score     bigint
--           p_prestige  integer
--           p_prix      integer
--
--   Pass NULL for any value you don't want to change on this call.
-- ===========================================================================
create or replace function public.submit_score(
    p_id       uuid,
    p_name     text,
    p_platform text    default 'web',
    p_score    bigint  default null,
    p_prestige integer default null,
    p_prix     integer default null
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
    existing public.players;
    clean_name text;
    clean_platform text;
    new_score    bigint;
    new_prestige integer;
    new_prix     integer;
    result public.players;
begin
    if p_id is null then
        raise exception 'player id required';
    end if;

    clean_name := public.lb_clean_name(p_name);

    clean_platform := lower(coalesce(p_platform, 'web'));
    if clean_platform not in ('web','youtube','steam','android','ios') then
        clean_platform := 'web';
    end if;

    -- ----- server-side sanity caps (reject absurd values outright) -----------
    if p_score is not null and (p_score < 0 or p_score > 1000000000000000) then
        raise exception 'score out of range';
    end if;
    if p_prestige is not null and (p_prestige < 0 or p_prestige > 10000) then
        raise exception 'prestige out of range';
    end if;
    if p_prix is not null and (p_prix < 0 or p_prix > 1000000) then
        raise exception 'prix out of range';
    end if;

    select * into existing from public.players where id = p_id;

    if not found then
        -- first submission for this player
        insert into public.players (id, display_name, platform, score, prestige, prix_wins, created_at, updated_at)
        values (
            p_id,
            clean_name,
            clean_platform,
            coalesce(p_score, 0),
            coalesce(p_prestige, 0),
            coalesce(p_prix, 0),
            now(),
            now()
        )
        returning * into result;
        return result;
    end if;

    -- ----- rate limit: at most one update per ~10s per player ----------------
    if now() - existing.updated_at < interval '10 seconds' then
        -- silently ignore the write but return the current row (no error spam)
        return existing;
    end if;

    -- ----- monotonic: only ever raise a value (never let it drop) ------------
    new_score    := greatest(existing.score,    coalesce(p_score,    existing.score));
    new_prestige := greatest(existing.prestige, coalesce(p_prestige, existing.prestige));
    new_prix     := greatest(existing.prix_wins,coalesce(p_prix,     existing.prix_wins));

    update public.players
       set display_name = clean_name,
           platform     = clean_platform,
           score        = new_score,
           prestige     = new_prestige,
           prix_wins    = new_prix,
           updated_at   = now()
     where id = p_id
    returning * into result;

    return result;
end;
$$;

-- Let the public (anon key) call the RPC.
grant execute on function public.submit_score(uuid, text, text, bigint, integer, integer) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- OPTIONAL FUTURE HARDENING (left as comments — see PLAN.md §3):
--   * Signed submissions: add p_sig text + verify hmac(p_id||p_score||...) here.
--     A client-only game can't truly hide the secret, so only add if cheating
--     becomes a real problem.
--   * Admin "hide" flag: add  hidden boolean default false  to players, exclude
--     hidden rows from the public read policy / top-N views.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- Seed data — a few EXAMPLE rows so the web page shows content immediately.
-- Fixed UUIDs so re-running this file updates (not duplicates) the seeds.
-- Inserted directly (bypasses the RPC rate-limit); on conflict, refresh values.
-- ===========================================================================
insert into public.players (id, display_name, platform, score, prestige, prix_wins) values
  ('00000000-0000-4000-8000-000000000001', 'ChefSkully',     'youtube', 982134500, 42, 318),
  ('00000000-0000-4000-8000-000000000002', 'SopaMaestra',    'android', 654200100, 37, 271),
  ('00000000-0000-4000-8000-000000000003', 'BoneBroth_Boss', 'steam',   500120000, 31, 244),
  ('00000000-0000-4000-8000-000000000004', 'CucharaDeOro',   'ios',     312050000, 28, 190),
  ('00000000-0000-4000-8000-000000000005', 'MidnightStew',   'web',     188900000, 24, 165),
  ('00000000-0000-4000-8000-000000000006', 'AngelitoChef',   'youtube', 120400000, 19, 132),
  ('00000000-0000-4000-8000-000000000007', 'SkullSimmer',    'android',  85200000, 15,  98),
  ('00000000-0000-4000-8000-000000000008', 'CalderoFeliz',   'steam',    44150000, 11,  61),
  ('00000000-0000-4000-8000-000000000009', 'TinyLadle',      'ios',      12030000,  7,  29),
  ('00000000-0000-4000-8000-00000000000a', 'NewChef_Pia',    'web',       2100000,  3,   8)
on conflict (id) do update
  set display_name = excluded.display_name,
      platform     = excluded.platform,
      score        = excluded.score,
      prestige     = excluded.prestige,
      prix_wins    = excluded.prix_wins,
      updated_at   = now();

-- ============================================================================
-- Quick verification queries (optional — run individually):
--   select id, display_name, score    from public.players order by score    desc limit 10;
--   select id, display_name, prestige from public.players order by prestige desc limit 10;
--   select id, display_name, prix_wins from public.players order by prix_wins desc limit 10;
--   select * from public.submit_score('11111111-1111-4111-8111-111111111111','TestChef','web',123456,5,2);
-- ============================================================================
