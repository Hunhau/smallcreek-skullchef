-- ============================================================================
-- Smallcreek Skullchef — Remove FAKE seed players from the live leaderboard
-- ----------------------------------------------------------------------------
-- Run once in: Supabase Dashboard -> SQL Editor -> New query -> Run
--
-- Deletes the 10 example rows inserted by schema.sql (fixed UUID prefix
-- 00000000-0000-4000-8000-...). Does NOT touch real players or the creator row.
-- ============================================================================

delete from public.players
where id in (
  '00000000-0000-4000-8000-000000000001',  -- ChefSkully
  '00000000-0000-4000-8000-000000000002',  -- SopaMaestra
  '00000000-0000-4000-8000-000000000003',  -- BoneBroth_Boss
  '00000000-0000-4000-8000-000000000004',  -- CucharaDeOro
  '00000000-0000-4000-8000-000000000005',  -- MidnightStew
  '00000000-0000-4000-8000-000000000006',  -- AngelitoChef
  '00000000-0000-4000-8000-000000000007',  -- SkullSimmer
  '00000000-0000-4000-8000-000000000008',  -- CalderoFeliz
  '00000000-0000-4000-8000-000000000009',  -- TinyLadle
  '00000000-0000-4000-8000-00000000000a'   -- NewChef_Pia
);

-- Verify: should return 0 rows
select id, display_name from public.players
where id::text like '00000000-0000-4000-8000-%'
order by id;

-- Optional: total count (expect real players + creator only, e.g. 73)
select count(*) as total_players from public.players;
