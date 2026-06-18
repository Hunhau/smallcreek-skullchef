/* ============================================================================
 * Smallcreek Skullchef — Drop-in Global Leaderboard client module
 * ----------------------------------------------------------------------------
 * Self-contained `leaderboard` object. Works standalone with NO backend (mock
 * fallback) and upgrades to live Supabase the moment CONFIG is filled in.
 *
 * ============================== INTEGRATION NOTES ===========================
 * The parent will paste this whole file into a <script> in index.html (or load
 * it via <script src="leaderboard/leaderboard-client.js"></script> placed AFTER
 * the supabase-js CDN tag). index.html itself is NOT modified by this file.
 *
 * 1) (Optional but recommended) load supabase-js once in index.html <head>:
 *      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *    If you skip this, the module lazy-loads it automatically on first use.
 *
 * 2) Fill CONFIG below with your Project URL + anon public key (see PLAN.md §4).
 *    With placeholders left as-is, the module runs in MOCK mode: submit() is a
 *    safe no-op and top() returns seeded example data — so the in-game UI is
 *    fully testable BEFORE the backend exists.
 *
 * 3) WHERE TO CALL THINGS (3 hook points in index.html — do NOT add now; this is
 *    for the parent's later wiring):
 *
 *    a) INIT — once, right after `game.load()` runs (e.g. end of game.init()):
 *         leaderboard.identity();           // ensures UUID + display name exist
 *
 *    b) SUBMIT on meaningful change (internally debounced + monotonic):
 *       - inside game.save() (fires every 5s; cheap, only sends on change):
 *           leaderboard.submit({ score: game.e, prestige: game.s });
 *       - inside game.pres() right after `this.s++; this.as++;`:
 *           leaderboard.submit({ prestige: game.s, score: game.e });
 *       - inside prix.end(), in the WIN branch `if(this.w){ ... }`
 *         (next to `game.track('crowns', 1)`):
 *           leaderboard.bumpPrixWin();
 *           leaderboard.submit({ prix: leaderboard.getPrixWins() });
 *
 *      VALUE SOURCES (read from index.html — see PLAN.md §2):
 *        prestige  -> game.s          (Angel Awakening level; clean integer)
 *        score     -> game.e          (current Energy Balls; module keeps a
 *                                       high-water mark so it never drops)
 *        prix      -> leaderboard.getPrixWins()  (module-owned persistent counter,
 *                                       since the game has no lifetime crown total)
 *
 *    c) DISPLAY — add a side FAB consistent with existing ones:
 *         <div class="side-fab" id="lb-fab" onclick="leaderboard.openPanel()">🏆 Ranks</div>
 *       and build a glassmorphism panel (reuse --glass-strong / --go / rounded
 *       translucent cards) with 3 tabs. Get rows via:
 *         const rows = await leaderboard.top('score', 50);  // [{rank,name,value,platform,you}]
 *       Translate ALL labels with the game's existing t()/I18N (add lb_* keys).
 *       This module returns DATA ONLY — never single-language strings.
 *
 * 4) IDENTITY STORAGE: kept in its OWN localStorage key 'soup_lb_identity' so it
 *    never touches the integrity-wrapped game save 'soup_p_v17'. If you later
 *    want it inside the main save, change STORE.get/STORE.set below (one place).
 * ==========================================================================*/

(function (global) {
  'use strict';

  // ======================== CONFIG (FILL THESE IN) =========================
  // Leave as the __PLACEHOLDER__ strings to run in safe MOCK/offline mode.
  // Anon key is PUBLIC by design (safe in client code) — still a placeholder
  // so the user pastes their own. See PLAN.md §4.
  var CONFIG = {
    SUPABASE_URL: 'https://ffmcmaujryvyzbhnctzc.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_GOoZkZVue7yyxR_bTFroXQ_ZDlTIV_t',
    // Which platform this build runs on (for the leaderboard "platform" column).
    // youtube | steam | android | ios | web
    PLATFORM: 'web',
    // supabase-js UMD bundle (used only if not already present on the page).
    SUPABASE_CDN: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    DEBOUNCE_MS: 8000  // min gap between network submits (server also rate-limits ~10s)
  };

  var IDENTITY_KEY = 'soup_lb_identity';
  var SCHEMA = 1;

  function isConfigured() {
    return CONFIG.SUPABASE_URL.indexOf('http') === 0 &&
           CONFIG.SUPABASE_ANON_KEY.indexOf('__') !== 0 &&
           CONFIG.SUPABASE_ANON_KEY.length > 20;
  }

  // ----------------------------------------------------------------------
  // Storage abstraction (swap these two if you ever move identity into the
  // main game save — everything else stays the same).
  // ----------------------------------------------------------------------
  var STORE = {
    get: function () {
      try { return localStorage.getItem(IDENTITY_KEY); } catch (e) { return null; }
    },
    set: function (str) {
      try { localStorage.setItem(IDENTITY_KEY, str); } catch (e) {}
    }
  };

  // ----------------------------------------------------------------------
  // Seeded EXAMPLE data — must mirror schema.sql seeds so mock == live shape.
  // Used by top() when not configured (offline/before backend exists).
  // ----------------------------------------------------------------------
  var SEED = [
    { name: 'ChefSkully',     platform: 'youtube', score: 982134500, prestige: 42, prix_wins: 318 },
    { name: 'SopaMaestra',    platform: 'android', score: 654200100, prestige: 37, prix_wins: 271 },
    { name: 'BoneBroth_Boss', platform: 'steam',   score: 500120000, prestige: 31, prix_wins: 244 },
    { name: 'CucharaDeOro',   platform: 'ios',     score: 312050000, prestige: 28, prix_wins: 190 },
    { name: 'MidnightStew',   platform: 'web',     score: 188900000, prestige: 24, prix_wins: 165 },
    { name: 'AngelitoChef',   platform: 'youtube', score: 120400000, prestige: 19, prix_wins: 132 },
    { name: 'SkullSimmer',    platform: 'android', score: 85200000,  prestige: 15, prix_wins: 98 },
    { name: 'CalderoFeliz',   platform: 'steam',   score: 44150000,  prestige: 11, prix_wins: 61 },
    { name: 'TinyLadle',      platform: 'ios',     score: 12030000,  prestige: 7,  prix_wins: 29 },
    { name: 'NewChef_Pia',    platform: 'web',     score: 2100000,   prestige: 3,  prix_wins: 8 }
  ];

  var BOARD_COLUMN = { score: 'score', prestige: 'prestige', prix: 'prix_wins' };

  // ----------------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------------
  function uuidv4() {
    try {
      if (global.crypto && typeof global.crypto.randomUUID === 'function') {
        return global.crypto.randomUUID();
      }
      if (global.crypto && global.crypto.getRandomValues) {
        var b = new Uint8Array(16);
        global.crypto.getRandomValues(b);
        b[6] = (b[6] & 0x0f) | 0x40;
        b[8] = (b[8] & 0x3f) | 0x80;
        var h = [];
        for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
        return h[0]+h[1]+h[2]+h[3]+'-'+h[4]+h[5]+'-'+h[6]+h[7]+'-'+h[8]+h[9]+'-'+h[10]+h[11]+h[12]+h[13]+h[14]+h[15];
      }
    } catch (e) {}
    // last-resort (not cryptographically strong, fine for a casual id)
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  // Mirror of the server-side lb_clean_name (PLAN.md §2). Validation only;
  // the server re-validates regardless.
  var BLOCKLIST = /(nigger|faggot|kike|spic|chink|cunt|rape)/i;
  function cleanName(raw) {
    if (raw == null) return 'Chef';
    var n = String(raw)
      .replace(/[\u0000-\u001F\u007F]/g, '')   // control chars
      .replace(/\s+/g, ' ')                      // collapse whitespace
      .trim()
      .replace(/[^0-9A-Za-z _.!\-\u00C0-\u017F]/g, '') // allow-list (incl. accents)
      .trim();
    if (n.length > 20) n = n.slice(0, 20);
    if (n.length < 3) return '';
    if (BLOCKLIST.test(n)) return '';
    return n;
  }

  function randomChefName() {
    return 'Chef #' + (1000 + Math.floor(Math.random() * 9000));
  }

  // ----------------------------------------------------------------------
  // Internal state
  // ----------------------------------------------------------------------
  var _id = null;          // {uuid, name, prixWins, scoreHi, v}
  var _client = null;      // supabase client (lazy)
  var _clientPromise = null;
  var _lastSubmit = 0;
  var _pending = null;     // queued {score,prestige,prix} merged until debounce fires
  var _submitTimer = null;

  function loadIdentity() {
    var raw = STORE.get();
    if (raw) {
      try {
        var d = JSON.parse(raw);
        if (d && typeof d === 'object' && d.uuid) {
          _id = {
            uuid: String(d.uuid),
            name: typeof d.name === 'string' ? d.name : randomChefName(),
            prixWins: Number.isFinite(d.prixWins) ? d.prixWins : 0,
            scoreHi: Number.isFinite(d.scoreHi) ? d.scoreHi : 0,
            v: SCHEMA
          };
          return _id;
        }
      } catch (e) {}
    }
    _id = { uuid: uuidv4(), name: randomChefName(), prixWins: 0, scoreHi: 0, v: SCHEMA };
    saveIdentity();
    return _id;
  }

  function saveIdentity() {
    if (!_id) return;
    STORE.set(JSON.stringify(_id));
  }

  // ----------------------------------------------------------------------
  // supabase-js lazy loader (no-op in mock mode)
  // ----------------------------------------------------------------------
  function ensureClient() {
    if (!isConfigured()) return Promise.resolve(null);
    if (_client) return Promise.resolve(_client);
    if (_clientPromise) return _clientPromise;

    _clientPromise = new Promise(function (resolve) {
      function make() {
        try {
          var lib = global.supabase;
          if (lib && typeof lib.createClient === 'function') {
            _client = lib.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
              auth: { persistSession: false, autoRefreshToken: false }
            });
            resolve(_client);
            return true;
          }
        } catch (e) {}
        return false;
      }
      if (make()) return;
      // inject the CDN script once
      if (typeof document === 'undefined') { resolve(null); return; }
      var existing = document.getElementById('lb-supabase-cdn');
      if (existing) {
        existing.addEventListener('load', function () { if (!make()) resolve(null); });
        existing.addEventListener('error', function () { resolve(null); });
        return;
      }
      var s = document.createElement('script');
      s.id = 'lb-supabase-cdn';
      s.src = CONFIG.SUPABASE_CDN;
      s.async = true;
      s.onload = function () { if (!make()) resolve(null); };
      s.onerror = function () { resolve(null); };
      document.head.appendChild(s);
    });
    return _clientPromise;
  }

  // ----------------------------------------------------------------------
  // Public API
  // ----------------------------------------------------------------------
  var leaderboard = {

    /** Returns config/runtime state for diagnostics. */
    isLive: function () { return isConfigured(); },

    /**
     * Get/create the player identity (UUID + display name). Safe to call often.
     * @returns {{uuid:string, name:string}}
     */
    identity: function () {
      if (!_id) loadIdentity();
      return { uuid: _id.uuid, name: _id.name };
    },

    /**
     * Set/update the player's display name (validated). Persists locally and,
     * if live, pushes on the next submit. Returns the accepted name (may be a
     * fallback like "Chef #1234" if the input was invalid).
     */
    setName: function (raw) {
      if (!_id) loadIdentity();
      var clean = cleanName(raw);
      _id.name = clean || _id.name || randomChefName();
      saveIdentity();
      // light-touch push so the name shows up server-side
      this.submit({});
      return _id.name;
    },

    /** Module-owned persistent Grand Prix win counter (see INTEGRATION NOTES). */
    getPrixWins: function () { if (!_id) loadIdentity(); return _id.prixWins; },
    bumpPrixWin: function (n) {
      if (!_id) loadIdentity();
      _id.prixWins += (Number.isFinite(n) ? n : 1);
      saveIdentity();
      return _id.prixWins;
    },

    /**
     * Submit the player's values to the 3 boards. Debounced + monotonic.
     * Pass any subset: { score?, prestige?, prix? }. Safe no-op in mock mode
     * (still updates local high-water marks).
     */
    submit: function (vals) {
      if (!_id) loadIdentity();
      vals = vals || {};

      // local high-water mark for score so it never regresses when coins are spent
      if (Number.isFinite(vals.score)) {
        _id.scoreHi = Math.max(_id.scoreHi, Math.floor(vals.score));
      }
      if (Number.isFinite(vals.prix)) {
        _id.prixWins = Math.max(_id.prixWins, Math.floor(vals.prix));
      }
      saveIdentity();

      // merge into the pending payload
      _pending = _pending || {};
      if (Number.isFinite(vals.score))    _pending.score    = _id.scoreHi;
      if (Number.isFinite(vals.prestige)) _pending.prestige = Math.floor(vals.prestige);
      if (Number.isFinite(vals.prix))     _pending.prix     = _id.prixWins;

      if (!isConfigured()) { _pending = null; return; }  // mock mode: nothing to send

      var now = Date.now();
      var wait = Math.max(0, CONFIG.DEBOUNCE_MS - (now - _lastSubmit));
      if (_submitTimer) return;  // already scheduled
      var self = this;
      _submitTimer = setTimeout(function () {
        _submitTimer = null;
        self._flush();
      }, wait);
    },

    /** Force-send any pending submit immediately (e.g. on pagehide). */
    flush: function () {
      if (_submitTimer) { clearTimeout(_submitTimer); _submitTimer = null; }
      return this._flush();
    },

    _flush: function () {
      if (!isConfigured() || !_pending) { _pending = null; return Promise.resolve(null); }
      var payload = _pending; _pending = null;
      _lastSubmit = Date.now();
      return ensureClient().then(function (client) {
        if (!client) return null;
        return client.rpc('submit_score', {
          p_id: _id.uuid,
          p_name: _id.name,
          p_platform: CONFIG.PLATFORM,
          p_score: Number.isFinite(payload.score) ? payload.score : null,
          p_prestige: Number.isFinite(payload.prestige) ? payload.prestige : null,
          p_prix: Number.isFinite(payload.prix) ? payload.prix : null
        }).then(function (res) {
          // swallow errors quietly — leaderboard must never break gameplay
          if (res && res.error) { try { console.warn('[leaderboard] submit:', res.error.message); } catch (e) {} }
          return res ? res.data : null;
        });
      }).catch(function () { return null; });
    },

    /**
     * Fetch top N for a board. NEVER throws — returns seeded examples on any
     * failure or in mock mode, so UIs are always renderable.
     * @param {'score'|'prestige'|'prix'} board
     * @param {number} n
     * @returns {Promise<Array<{rank,name,value,platform,you}>>}
     */
    top: function (board, n) {
      var col = BOARD_COLUMN[board] || 'score';
      n = Math.max(1, Math.min(500, n || 50));
      if (!_id) loadIdentity();
      var myUuid = _id.uuid;

      if (!isConfigured()) {
        return Promise.resolve(this._mockTop(col, n));
      }
      var self = this;
      return ensureClient().then(function (client) {
        if (!client) return self._mockTop(col, n);
        return client
          .from('players')
          .select('id, display_name, platform, ' + col)
          .order(col, { ascending: false })
          .limit(n)
          .then(function (res) {
            if (!res || res.error || !Array.isArray(res.data)) {
              return self._mockTop(col, n);
            }
            return res.data.map(function (row, i) {
              return {
                rank: i + 1,
                name: row.display_name,
                value: row[col],
                platform: row.platform,
                you: row.id === myUuid
              };
            });
          });
      }).catch(function () { return self._mockTop(col, n); });
    },

    _mockTop: function (col, n) {
      var rows = SEED.slice().sort(function (a, b) { return b[col] - a[col]; }).slice(0, n);
      return rows.map(function (r, i) {
        return { rank: i + 1, name: r.name, value: r[col], platform: r.platform, you: false };
      });
    },

    /** Raw seed data (for a public page's offline fallback). */
    _seed: function () { return SEED.slice(); },

    /**
     * Stub the parent overrides when wiring the in-game UI. Kept here so a
     * `onclick="leaderboard.openPanel()"` FAB doesn't error before wiring.
     * The parent should replace this with the real glassmorphism panel render.
     */
    openPanel: function () {
      try { console.info('[leaderboard] openPanel() not wired yet — see INTEGRATION NOTES.'); } catch (e) {}
    }
  };

  // best-effort flush when the page is hidden/closed
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { try { leaderboard.flush(); } catch (e) {} }
    });
  }

  // expose
  global.leaderboard = leaderboard;
  if (typeof module !== 'undefined' && module.exports) module.exports = leaderboard;

})(typeof window !== 'undefined' ? window : this);
