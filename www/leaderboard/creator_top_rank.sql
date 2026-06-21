-- ============================================================================
-- Smallcreek Skullchef — Put the CREATOR at #1 on all three boards
-- ----------------------------------------------------------------------------
-- Paste this whole file into: Supabase Dashboard -> SQL Editor -> New query -> Run.
-- Safe to re-run (idempotent): creator values use GREATEST() so they only go UP
-- (never fights the monotonic submit_score RPC), and the display_name is NEVER
-- changed if the creator row already exists.
--
-- ECONOMY REASONING (prestige-6 believable lifetime total):
--   In-game, prestige level s -> s+1 requires current EB >= 1e6 * 5^s, and on
--   prestige game.e resets to 0 while game.te (LIFETIME total, the score board)
--   never resets. Minimum lifetime to have crossed all six thresholds:
--     1e6 + 5e6 + 2.5e7 + 1.25e8 + 6.25e8 + 3.125e9  ~=  3.9e9.
--   An active prestige-6 player who keeps playing into run #7 realistically sits
--   around 8-15 billion lifetime EB, so we use a clean 12,000,000,000.
--
-- CREATOR TOP VALUES:
--   score (lifetime EB) = 12,000,000,000   prestige = 6   prix_wins = 120
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) CREATOR -> strict #1 on score, prestige and prix_wins.
--    By UUID so it is unambiguous. display_name is only set if the row must be
--    created; an existing creator row keeps whatever name was claimed in-game.
-- ---------------------------------------------------------------------------
insert into public.players (id, display_name, platform, score, prestige, prix_wins, created_at, updated_at)
values (
  '1832ff16-5fec-4afd-b570-f950e19eb434',
  'SmallcreekSkullchef',   -- used ONLY if the row does not exist yet
  'web',
  12000000000,
  6,
  120,
  now(),
  now()
)
on conflict (id) do update set
  -- monotonic: never lower an existing value (only raise to the target)
  score      = greatest(public.players.score,     excluded.score),
  prestige   = greatest(public.players.prestige,  excluded.prestige),
  prix_wins  = greatest(public.players.prix_wins, excluded.prix_wins),
  updated_at = now();
  -- NOTE: display_name intentionally NOT updated here.

-- ---------------------------------------------------------------------------
-- 2) SEED / FAKE players -> rescaled to sit BELOW the creator on every board.
--    Same roster names & platforms; prestige spread 5..1, scores & prix_wins
--    strictly descending and all under the creator's (6 / 12e9 / 120).
-- ---------------------------------------------------------------------------
update public.players set score = 4820000000, prestige = 5, prix_wins = 94, updated_at = now()
  where id = '00000000-0000-4000-8000-000000000001';  -- ChefSkully
update public.players set score = 4150000000, prestige = 5, prix_wins = 88, updated_at = now()
  where id = '00000000-0000-4000-8000-000000000002';  -- SopaMaestra
update public.players set score = 920000000,  prestige = 4, prix_wins = 73, updated_at = now()
  where id = '00000000-0000-4000-8000-000000000003';  -- BoneBroth_Boss
update public.players set score = 610000000,  prestige = 4, prix_wins = 65, updated_at = now()
  where id = '00000000-0000-4000-8000-000000000004';  -- CucharaDeOro
update public.players set score = 184000000,  prestige = 3, prix_wins = 52, updated_at = now()
  where id = '00000000-0000-4000-8000-000000000005';  -- MidnightStew
update public.players set score = 121000000,  prestige = 3, prix_wins = 44, updated_at = now()
  where id = '00000000-0000-4000-8000-000000000006';  -- AngelitoChef
update public.players set score = 38500000,   prestige = 2, prix_wins = 31, updated_at = now()
  where id = '00000000-0000-4000-8000-000000000007';  -- SkullSimmer
update public.players set score = 22000000,   prestige = 2, prix_wins = 24, updated_at = now()
  where id = '00000000-0000-4000-8000-000000000008';  -- CalderoFeliz
update public.players set score = 6400000,    prestige = 1, prix_wins = 12, updated_at = now()
  where id = '00000000-0000-4000-8000-000000000009';  -- TinyLadle
update public.players set score = 2100000,    prestige = 1, prix_wins = 5,  updated_at = now()
  where id = '00000000-0000-4000-8000-00000000000a';  -- NewChef_Pia

-- ---------------------------------------------------------------------------
-- 3) VERIFY (optional — run individually; creator should be row #1 on each):
--   select display_name, score     from public.players order by score     desc limit 12;
--   select display_name, prestige  from public.players order by prestige  desc limit 12;
--   select display_name, prix_wins from public.players order by prix_wins desc limit 12;
-- ---------------------------------------------------------------------------
