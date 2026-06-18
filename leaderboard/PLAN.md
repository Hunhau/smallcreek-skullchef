# Smallcreek Skullchef — Global Cross-Platform Leaderboard

**Status:** design + ready-to-deploy assets. `index.html` (the game) was **NOT** modified.
**Scope:** ONE custom global leaderboard with **3 boards**:

1. **Total Score** — coins/Energy Balls accumulated
2. **Prestige** — Angel Awakening level (`game.s`)
3. **Grand Prix Wins** — number of champions crowned

This document explains the backend choice, player identity, anti-cheat stance, exactly
what the user must do to go live, and how the in-game integration will work later.

---

## 1. Backend choice: **Supabase** (recommended)

### Why Supabase over Firebase

| Concern | Supabase | Firebase |
|---|---|---|
| Data model | Postgres (real SQL, `ORDER BY ... LIMIT N` for top-N is trivial + indexable) | NoSQL (Firestore); top-N is awkward, needs composite indexes and careful query design |
| Server-side validation | Postgres functions (RPC) + Row Level Security — anti-cheat caps live *in the DB* | Cloud Functions (separate deploy, cold starts, billing card often required) |
| Client | `@supabase/supabase-js` from a CDN — one `<script>`, no build step | Modular SDK, heavier, more setup for a single static page |
| "Public read, write-only-your-row" | Native RLS policies, declarative | Security Rules language, workable but less ergonomic for SQL-style boards |
| Cost transparency | Free tier is generous and **does not require a credit card** | Spark plan free, but several features push you toward Blaze (card required) |
| Fits a single static HTML game | Excellent (REST/Realtime over HTTPS, anon key in client) | Good, but more moving parts |

For a leaderboard the data is inherently relational and rank-oriented, so Postgres is the
natural fit. Supabase also lets us put the **anti-cheat sanity caps directly in a SQL
function**, which keeps the whole thing in one place and free.

### Cost notes (the important part — user is cost-sensitive)

Supabase **Free tier** (as of 2026, always verify current limits at supabase.com/pricing):

- **$0/month, no credit card required.**
- ~500 MB database, ~5 GB egress/month, 50,000 monthly active users on auth (we barely use auth).
- Unlimited API requests (subject to fair use / egress).
- **Catch:** free projects **pause after ~1 week of zero activity**. They resume on the
  next request (a few seconds of cold start) or you can click "restore" in the dashboard.
  For a live game with daily players this is a non-issue; for a dormant project it just
  means the first hit of the week is slow.

**When would it start costing money?**

- You only pay (Pro = **$25/month**) if you exceed free limits: >500 MB DB, heavy egress,
  or you want the project to never pause / daily backups / more compute.
- A leaderboard row is tiny (~100 bytes). **500 MB ≈ millions of players.** Realistically
  you will never hit the DB size cap from leaderboard data alone.
- Egress is the thing to watch: each public-page load reads top-N rows (tiny). Even
  100k page views/month of a ~10 KB JSON payload is ~1 GB — well inside 5 GB free.

**Bottom line:** this design stays **$0/month** for a long time. The realistic first
reason to upgrade is "I don't want the project to auto-pause" or a viral spike in egress.

> Alternative if you ever want truly zero-maintenance and even cheaper: a Cloudflare
> Worker + D1 (SQLite) also has a free tier. Supabase is recommended here because the SQL
> + RLS + RPC story is the cleanest for this exact use case and requires no build tooling.

---

## 2. Player identity

The game already persists everything in `localStorage` under the key **`soup_p_v17`**,
and that blob is wrapped by an integrity check (`secure.wrap`/`secure.unwrap` in
`index.html`). **We must not write leaderboard data into that blob** — doing so would
either trip the tamper check or require editing the game's save code.

### Strategy: a separate, dedicated identity key

The leaderboard module stores its identity in its **own** localStorage key, completely
independent of the game save:

```
Key:   soup_lb_identity
Value: {"uuid":"<v4 uuid>","name":"<display name>","v":1}
```

- **`uuid`** — a stable anonymous player id generated **client-side** on first run
  (`crypto.randomUUID()`, with a fallback generator). This is the player's primary key in
  the `players` table. It never changes, so a returning player keeps their rank.
- **`name`** — a player-chosen **display name**. Validation (enforced both client-side and
  again in the DB function):
  - length **3–20** characters after trimming,
  - allowed chars: letters (incl. accents for ES), digits, space, `_ - . !`,
  - collapse repeated whitespace, strip control chars,
  - a tiny built-in blocklist for the most obvious slurs/spam (length-limited, casual-game
    level — not a full profanity engine).
  - If empty/invalid, we fall back to `Chef #1234` (random 4-digit suffix).

### Why a separate key is the right call

- **Non-invasive:** zero changes to the game's save/load/tamper logic.
- **Survives game saves:** the game rewrites `soup_p_v17` every 5 s; our key is untouched.
- **Portable:** the same UUID works across YouTube Playables, Steam, Android, iOS because
  it's just localStorage in the embedded webview. (If a platform wipes localStorage between
  installs, the player simply gets a new identity — acceptable for a casual game.)

> If the parent later *wants* identity inside the main save, the cleanest path is to add
> `lb:{uuid,name}` to `getSaveData()`/`load()` in `index.html` and have this module read it
> with the separate key as a fallback. The module is written so that swapping the storage
> getter is a one-function change (`STORE.get`/`STORE.set`). Documented in the client file.

### Where the 3 board values come from (read from the live `game` object)

From reading `index.html` (NOT modified):

| Board | Source in game | Notes |
|---|---|---|
| **Prestige** | `game.s` | Angel Awakening / Era level. Clean integer, persistent. **Direct.** |
| **Total Score** | `game.e` (current Energy Balls) | Recommended. `game.as` is "Angel Shards" but it increments ~1 per prestige, so it duplicates the prestige board — avoid it for "score". For a true all-time total, see note below. |
| **Grand Prix Wins** | *no persistent total exists today* | Wins are counted in `game.daily.counters.crowns` (resets daily) and the boolean achievement `game.ach.firstChamp`. See note below. |

**Total Score caveat:** the game has no "lifetime coins ever earned" counter (`game.l` is
per-run and resets on prestige). `game.e` (current coins) is the pragmatic choice and the
module also keeps a **high-water mark** so a player's submitted score never goes *down*
just because they spent coins. If you want a truer metric later, add a `totalEarned`
accumulator in `index.html` and pass it to `submit()`.

**Grand Prix Wins caveat:** because there's no persistent win total, the module keeps its
**own** persistent counter in the identity key (`prixWins`), incremented by the parent at
the exact line where the game already does `game.track('crowns', 1)` (the win branch in
`prix.end`). Until that one-line hook is added, the Grand Prix board will show each
player's last-submitted value (0 for new players) and the seeded examples.

---

## 3. Anti-cheat stance

**Be honest:** the game is a single client-side HTML file. Scores are computed in the
browser, the Supabase **anon key is public by design**, and a determined user can open
devtools and call the submit RPC with any number. **You cannot make a pure client-side
game's scores fully trustworthy.** What we *can* do is make casual cheating annoying and
keep the board sane. Recommended level for a **casual cozy clicker: "pragmatic", not
"fortress".**

Mitigations implemented here:

1. **Row Level Security (RLS):** public can `SELECT` (read the board). Direct table
   writes are blocked; all writes go through a `SECURITY DEFINER` RPC so clients can only
   submit, never arbitrarily edit other rows.
2. **Server-side sanity caps (RPC):** `submit_score(...)` rejects absurd values
   (e.g. prestige > 10,000, prix wins > 1,000,000, score > 1e15) and clamps/validates the
   display name server-side too. This stops the "I set my prestige to 9e18" class of
   garbage from ever landing in the board.
3. **Monotonic upsert:** the RPC only raises a player's value if the new value is `>=` the
   stored value (no flapping, no negative scores).
4. **Rate limiting:** the RPC refuses updates to the same player row more often than once
   per ~10 s (via `updated_at`), cutting spam.
5. **One row per player per board:** enforced by primary key on `players` + a single row
   per player; upsert semantics prevent duplicate-name leaderboard stuffing from one id.

**Explicitly NOT done now (documented as "later if needed"):**

- **Signed submissions / HMAC:** you could ship a secret and sign payloads, but in a
  client-only game the secret is extractable, so it only raises the bar slightly. Worth it
  only if cheating becomes a real problem. (Hook point noted in `schema.sql` comments.)
- **Server-authoritative simulation:** overkill for this game; would require a real backend
  replaying gameplay.
- **Auth (real accounts):** not needed; anonymous UUID is enough for a casual board.

**Recommendation:** ship the pragmatic mitigations above. If the top of the board fills
with obvious cheaters, add (a) a manual "hide row" admin flag, and only then (b) signed
submissions. Don't over-engineer a cozy soup game.

---

## 4. WHAT I NEED FROM THE USER (step-by-step to go live)

You need to do this once. It's free and takes ~10 minutes.

### Step 1 — Create a Supabase project
1. Go to **https://supabase.com** → sign in (GitHub login works, **no credit card**).
2. **New project** → name it e.g. `smallcreek-leaderboard`, pick a region close to most
   players, set a database password (save it somewhere; you won't need it for the game).
3. Wait ~2 minutes for it to provision.

### Step 2 — Give me / fill in TWO values
From **Project Settings → API**, copy:
- **Project URL** → looks like `https://abcdefgh.supabase.co`  → this is `SUPABASE_URL`
- **anon public** key (the `anon` `public` one, *not* `service_role`) → this is `SUPABASE_ANON_KEY`

> The anon key is **safe to put in client code** (that's its purpose). Never paste the
> `service_role` key anywhere public.

Paste these two values into the CONFIG block at the top of:
- `leaderboard/index.html` (the public web page), and
- `leaderboard/leaderboard-client.js` (the in-game module).

Both files work with placeholders too — they fall back to seeded example data — so the
page is viewable *right now*, before you do any of this.

### Step 3 — Run the SQL
1. In Supabase, open **SQL Editor → New query**.
2. Paste the entire contents of **`leaderboard/schema.sql`**.
3. Click **Run**. This creates the tables, RLS policies, the `submit_score` RPC, indexes,
   and a handful of seed rows.

### Step 4 — Verify
- In **Table Editor** you should see the `players` table with the seed rows.
- Open `leaderboard/index.html` in a browser — it should now show **live** data from
  Supabase (and still falls back to examples if the keys are wrong).

That's it. Two values + one SQL paste = live.

---

## 5. HOW TO DEPLOY the public web page

`leaderboard/index.html` is a fully standalone static page (one file, loads supabase-js
from a CDN). Any free static host works. Pick one:

### Option A — GitHub Pages (free, you already use GitHub)
1. Put `leaderboard/index.html` in a repo (e.g. the existing `Hunhau/smallcreek-skullchef`).
2. Repo **Settings → Pages** → Source: deploy from branch `main`, folder `/` (or `/docs`).
3. Your page is at `https://<user>.github.io/<repo>/leaderboard/` (or rename the file to
   `index.html` at the chosen folder root).
4. (Optional) point a custom domain like `leaderboard.smallcreek.game` in Pages settings.

### Option B — Netlify (drag-and-drop, instant)
1. Go to **app.netlify.com → Add new site → Deploy manually**.
2. Drag the `leaderboard/` folder onto the page. Done — you get a `*.netlify.app` URL.
3. Optional: connect the GitHub repo for auto-deploy on push.

### Option C — Cloudflare Pages (free, fast CDN)
1. **dash.cloudflare.com → Workers & Pages → Create → Pages**.
2. Connect the repo (build command: none; output dir: `leaderboard`), or use
   `wrangler pages deploy leaderboard`.
3. You get a `*.pages.dev` URL; add a custom domain for free.

All three are $0. **Recommendation:** Cloudflare Pages or Netlify for the fastest CDN and
zero config; GitHub Pages if you want everything in the existing repo.

> Link the deployed page from the game later (a "🏆 Leaderboard" `.side-fab` can open it,
> or open the in-game panel — see §6).

---

## 6. How the in-game integration will work later (for the parent)

The drop-in module is `leaderboard/leaderboard-client.js`. The parent will paste its
contents into a `<script>` in `index.html` (or load it as a file) and wire **3 call sites**.
Full details live in the `INTEGRATION NOTES` comment block at the top of that file; summary:

1. **Init (once, after `game.load()`):**
   ```js
   leaderboard.identity();   // ensures UUID + display name exist
   ```

2. **Submit on meaningful change (debounced internally):**
   - In `game.save()` (every 5 s) — cheap, debounced, only sends on change:
     ```js
     leaderboard.submit({ score: game.e, prestige: game.s });
     ```
   - On **prestige** (`game.pres`, right after `this.s++`):
     ```js
     leaderboard.submit({ prestige: game.s, score: game.e });
     ```
   - On **Grand Prix win** (`prix.end`, the `if(this.w){...}` branch, next to
     `game.track('crowns', 1)`):
     ```js
     leaderboard.bumpPrixWin();           // increments persistent counter
     leaderboard.submit({ prix: leaderboard.getPrixWins() });
     ```

3. **Display:** add a `.side-fab` consistent with the existing ones, e.g.
   ```html
   <div class="side-fab" id="lb-fab" onclick="leaderboard.openPanel()">🏆 Ranks</div>
   ```
   The module exposes `top(board, n)` returning `[{rank, name, value}]`; the parent renders
   a glassmorphism panel (reuse `--glass-strong`, `--go`, rounded translucent cards) with 3
   tabs (Total Score / Prestige / Grand Prix). All strings come from the game's existing
   `t()`/`I18N` (EN+ES), so add `lb_*` keys when wiring — the module returns **data only**,
   never single-language text.

The module's **offline/mock fallback** means all of this is testable in-game *before*
Supabase is configured: `submit()` is a no-op-safe, `top()` returns seeded examples.

---

## 7. Files created (all NEW — `index.html` untouched)

| File | Purpose |
|---|---|
| `leaderboard/PLAN.md` | this document |
| `leaderboard/schema.sql` | Postgres schema, RLS, `submit_score` RPC, indexes, seed rows |
| `leaderboard/index.html` | standalone public leaderboard web page (EN/ES, glassmorphism) |
| `leaderboard/leaderboard-client.js` | drop-in `leaderboard` JS module for the game |

### Schema design choice (summary; rationale repeated in `schema.sql`)
**Chosen: 3 value columns on a single `players` row** (`score`, `prestige`, `prix_wins`),
**not** a separate `scores` table with a `board` enum. Why: each player has exactly one
value per board, the boards are a fixed known set (3), and "one row per player" makes the
upsert trivial, the RLS policy simple ("you may only touch your own row"), and top-N a
plain indexed `ORDER BY <column> DESC LIMIT N`. An EAV `scores(board, value)` table would
add joins and a composite uniqueness constraint for no benefit at this scale. If boards
later become dynamic/user-generated, migrate to the `scores` table then.
