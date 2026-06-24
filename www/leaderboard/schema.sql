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

-- ---------------------------------------------------------------------------
-- CASE-INSENSITIVE UNIQUE display names. Every player must own an exclusive
-- name across the whole table (compared lower-cased). This is the storage-layer
-- guarantee behind claim_name() below — even a race that slips past the SELECT
-- check is rejected here, and claim_name catches the unique_violation.
-- NOTE: if the table already contains case-insensitive duplicates this CREATE
-- will fail; the standalone migration ships a de-dupe step that runs first.
-- ---------------------------------------------------------------------------
create unique index if not exists players_name_unique_ci on public.players (lower(display_name));

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
-- Helper: normalize a name to catch brand-evasion (leet, separators, repeats).
--   lowercase -> map lookalikes (0->o,1->l,3->e,4->a,5->s,7->t,8->b,9->g,@->a,$->s,!->i,|->l)
--   -> strip non a-z -> collapse repeated letters. Brand tokens collapse to
--   'smalcrek' and 'skulchef'.
-- ===========================================================================
create or replace function public.lb_brand_norm(raw text)
returns text language plpgsql immutable as $$
declare n text;
begin
    if raw is null then return ''; end if;
    n := lower(raw);
    n := translate(n, '01345789@$!|', 'oleastbgasil');
    n := regexp_replace(n, '[^a-z]', '', 'g');
    n := regexp_replace(n, '(.)\1+', '\1', 'g');
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
    insert_name text;
    final_name  text;
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
        -- First submission for this player. Names are normally created via
        -- claim_name() BEFORE any score is sent, but submit_score must never
        -- raise on a unique-name collision (it must never break gameplay). So
        -- if the requested name is reserved/taken, fall back to a guaranteed-
        -- unique placeholder derived from the player id (re-claimable later).
        insert_name := clean_name;
        if insert_name is null
           or lower(insert_name) = 'chef'
           or exists (select 1 from public.players where lower(display_name) = lower(insert_name)) then
            insert_name := left('Chef ' || substr(replace(p_id::text, '-', ''), 1, 6), 20);
        end if;

        insert into public.players (id, display_name, platform, score, prestige, prix_wins, created_at, updated_at)
        values (
            p_id,
            insert_name,
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

    -- ----- name: NEVER overwrite in a way that breaks uniqueness -------------
    -- Renames must go through claim_name(). submit_score only adopts the passed
    -- name when it is a real, non-reserved name that is free (or already ours);
    -- otherwise it keeps the player's current display_name untouched.
    final_name := existing.display_name;
    if clean_name is not null
       and lower(clean_name) <> 'chef'
       and lower(clean_name) <> lower(existing.display_name)
       and not exists (
           select 1 from public.players
            where lower(display_name) = lower(clean_name) and id <> p_id
       ) then
        final_name := clean_name;
    end if;

    update public.players
       set display_name = final_name,
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

-- ===========================================================================
-- RPC: claim_name
--   The ONLY path to CREATE or CHANGE a player's display name. Enforces the
--   case-insensitive uniqueness rule and is the server side of the in-game
--   "choose your chef name" step.
--
--   * cleans the name via lb_clean_name
--   * rejects reserved/invalid names with  RAISE 'INVALID'
--   * if a DIFFERENT player already holds lower(name) -> RAISE 'NAME_TAKEN'
--   * otherwise upserts THIS player's row (creates it if new) with the name
--   * a concurrent claim that slips past the check hits the unique index and
--     is reported as NAME_TAKEN too.
--   Returns the stored row.
-- ===========================================================================
create or replace function public.claim_name(
    p_id   uuid,
    p_name text
)
returns public.players
language plpgsql
security definer
set search_path = public
as $$
declare
    clean_name text;
    result     public.players;
begin
    if p_id is null then
        raise exception 'player id required';
    end if;

    clean_name := public.lb_clean_name(p_name);

    -- lb_clean_name returns the reserved fallback 'Chef' for anything invalid;
    -- 'Chef' is the non-unique default and can never be claimed.
    if clean_name is null
       or char_length(btrim(clean_name)) < 3
       or lower(clean_name) = 'chef' then
        raise exception 'INVALID';
    end if;

    -- reserved brand names (evasion-hardened): blocked for everyone EXCEPT the creator account
    if p_id <> '1832ff16-5fec-4afd-b570-f950e19eb434'::uuid
       and (public.lb_brand_norm(clean_name) like '%smalcrek%'
            or public.lb_brand_norm(clean_name) like '%skulchef%') then
        raise exception 'NAME_TAKEN';
    end if;

    -- taken by someone else?
    if exists (
        select 1 from public.players
         where lower(display_name) = lower(clean_name) and id <> p_id
    ) then
        raise exception 'NAME_TAKEN';
    end if;

    insert into public.players (id, display_name, platform, created_at, updated_at)
    values (p_id, clean_name, 'web', now(), now())
    on conflict (id) do update
        set display_name = excluded.display_name,
            updated_at   = now()
    returning * into result;

    return result;
exception
    when unique_violation then
        -- lost a race for the same name
        raise exception 'NAME_TAKEN';
end;
$$;

grant execute on function public.claim_name(uuid, text) to anon, authenticated;

-- ===========================================================================
-- RPC: is_name_available
--   Lightweight boolean used for live "as you type" availability checks.
--   Returns false for reserved/invalid names and for names held by ANOTHER
--   player. Pass p_id so a player editing their own row sees their current
--   name as available.
-- ===========================================================================
create or replace function public.is_name_available(
    p_name text,
    p_id   uuid default null
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
    clean_name text;
begin
    clean_name := public.lb_clean_name(p_name);
    if clean_name is null
       or char_length(btrim(clean_name)) < 3
       or lower(clean_name) = 'chef' then
        return false;
    end if;
    -- reserved brand names (evasion-hardened): unavailable to everyone EXCEPT the creator account
    if (p_id is null or p_id <> '1832ff16-5fec-4afd-b570-f950e19eb434'::uuid)
       and (public.lb_brand_norm(clean_name) like '%smalcrek%'
            or public.lb_brand_norm(clean_name) like '%skulchef%') then
        return false;
    end if;
    return not exists (
        select 1 from public.players
         where lower(display_name) = lower(clean_name)
           and (p_id is null or id <> p_id)
    );
end;
$$;

grant execute on function public.is_name_available(text, uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- OPTIONAL FUTURE HARDENING (left as comments — see PLAN.md §3):
--   * Signed submissions: add p_sig text + verify hmac(p_id||p_score||...) here.
--     A client-only game can't truly hide the secret, so only add if cheating
--     becomes a real problem.
--   * Admin "hide" flag: add  hidden boolean default false  to players, exclude
--     hidden rows from the public read policy / top-N views.
-- ---------------------------------------------------------------------------

-- ===========================================================================
-- Creator row only — no fake seed players (removed 2026-06; see remove_seed_players.sql).
-- The CREATOR sits strictly at #1 on every board (prestige 6, believable lifetime
-- total). Targeted by the real creator UUID. Values use greatest() so re-running
-- only ever raises them, and display_name is preserved if the row already exists.
insert into public.players (id, display_name, platform, score, prestige, prix_wins) values
  ('1832ff16-5fec-4afd-b570-f950e19eb434', 'SmallcreekSkullchef', 'web', 12000000000, 6, 120)
on conflict (id) do update
  set score      = greatest(public.players.score,     excluded.score),
      prestige   = greatest(public.players.prestige,  excluded.prestige),
      prix_wins  = greatest(public.players.prix_wins, excluded.prix_wins),
      updated_at = now();

-- ============================================================================
-- Quick verification queries (optional — run individually):
--   select id, display_name, score    from public.players order by score    desc limit 10;
--   select id, display_name, prestige from public.players order by prestige desc limit 10;
--   select id, display_name, prix_wins from public.players order by prix_wins desc limit 10;
--   select * from public.submit_score('11111111-1111-4111-8111-111111111111','TestChef','web',123456,5,2);
-- ============================================================================
