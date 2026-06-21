-- ============================================================================
-- Smallcreek Skullchef — CLOUD SAVE (cross-platform progress transfer)
-- ----------------------------------------------------------------------------
-- Paste this whole file into: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run (idempotent): CREATE ... IF NOT EXISTS / CREATE OR REPLACE.
--
-- WHAT THIS ADDS
--   A single table `saves` that stores ONE backup blob per player, keyed by the
--   same client-generated UUID used by the leaderboard (`players.id`). The blob
--   is the game's portable backup bundle (game save + leaderboard identity),
--   exactly what the in-game "Export/Copy" already produces — we just park it in
--   the cloud so the player can pull it onto another device (Android / iOS / web).
--
-- HOW THE GAME USES IT
--   * push_save(uuid, blob, platform)  -> upload / overwrite my cloud save.
--   * pull_save(uuid)                  -> download a save by its "account code"
--                                          (the UUID). This is the restore path.
--
-- SECURITY MODEL (pragmatic, casual-game level — be honest):
--   The "account code" IS the UUID. Anyone who knows a code can pull (restore)
--   or push (overwrite) THAT save. This is the classic "save code" trade-off and
--   is acceptable for a cozy single-player idle game. The UUID is a random v4
--   (122 bits) so it is not guessable. If you ever want stronger protection, add
--   a separate secret token column and require it on push (left as a comment at
--   the bottom). Direct table access is blocked by RLS; everything goes through
--   the two SECURITY DEFINER RPCs below.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Table: saves  (one backup blob per player)
-- ---------------------------------------------------------------------------
create table if not exists public.saves (
    id          uuid        primary key,                 -- player UUID (== players.id)
    blob        text        not null,                    -- portable backup bundle JSON
    platform    text        not null default 'web',      -- web | youtube | steam | android | ios
    updated_at  timestamptz not null default now(),
    -- Generous cap: a full save bundle is a few KB; 300 KB is plenty and stops abuse.
    constraint saves_blob_len_chk check (char_length(blob) between 1 and 300000)
);

-- ---------------------------------------------------------------------------
-- Row Level Security: deny ALL direct client access. Only the RPCs (security
-- definer) below may read/write, mirroring the players-table design.
-- ---------------------------------------------------------------------------
alter table public.saves enable row level security;
-- (intentionally NO policies => anon/authenticated cannot select/insert/update/delete directly)

-- ===========================================================================
-- RPC: push_save  — upload or overwrite my cloud save (last-write-wins).
--   Returns the stored updated_at timestamp.
-- ===========================================================================
create or replace function public.push_save(
    p_id       uuid,
    p_blob     text,
    p_platform text default 'web'
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
    clean_platform text;
    ts timestamptz;
begin
    if p_id is null then
        raise exception 'player id required';
    end if;
    if p_blob is null or char_length(p_blob) < 1 or char_length(p_blob) > 300000 then
        raise exception 'invalid save blob';
    end if;

    clean_platform := lower(coalesce(p_platform, 'web'));
    if clean_platform not in ('web','youtube','steam','android','ios') then
        clean_platform := 'web';
    end if;

    insert into public.saves (id, blob, platform, updated_at)
    values (p_id, p_blob, clean_platform, now())
    on conflict (id) do update
        set blob       = excluded.blob,
            platform   = excluded.platform,
            updated_at = now()
    returning updated_at into ts;

    return ts;
end;
$$;

grant execute on function public.push_save(uuid, text, text) to anon, authenticated;

-- ===========================================================================
-- RPC: pull_save  — download a save by its account code (UUID). The restore path.
--   Returns 0 rows if no save exists for that code.
-- ===========================================================================
create or replace function public.pull_save(
    p_id uuid
)
returns table(blob text, updated_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
    if p_id is null then
        raise exception 'player id required';
    end if;
    return query
        select s.blob, s.updated_at
          from public.saves s
         where s.id = p_id;
end;
$$;

grant execute on function public.pull_save(uuid) to anon, authenticated;

-- ===========================================================================
-- VERIFY (optional — run individually):
--   select count(*) from public.saves;
--   select id, platform, updated_at, char_length(blob) as bytes from public.saves order by updated_at desc limit 10;
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- OPTIONAL FUTURE HARDENING (left as comments):
--   * Per-save secret token: add  secret text  to `saves`, set it on first
--     push, and require a matching p_secret on push_save to prevent a code-only
--     overwrite. Keep pull_save open (restore-by-code) or also gate it. For a
--     casual game this is usually unnecessary.
--   * Rate limit: refuse push more often than once per ~5s per id (compare now()
--     - updated_at), like submit_score does, if abuse appears.
-- ---------------------------------------------------------------------------
