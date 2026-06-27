/* Global leaderboard client (build-313). Lazy Supabase; offline-safe. */
    (function (global) {
      'use strict';

      var CONFIG = {
        SUPABASE_URL: 'https://ffmcmaujryvyzbhnctzc.supabase.co',
        SUPABASE_ANON_KEY: 'sb_publishable_GOoZkZVue7yyxR_bTFroXQ_ZDlTIV_t',
        // Derived from the single BUILD_TARGET switch (see top of <body>). Falls
        // back to 'web' if that block didn't run, so behaviour is unchanged.
        PLATFORM: (typeof window !== 'undefined' && window.BUILD_TARGET) || 'web',
        SUPABASE_CDN: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
        DEBOUNCE_MS: 8000
      };

      var IDENTITY_KEY = 'soup_lb_identity';
      var SCHEMA = 1;

      function isConfigured() {
        return CONFIG.SUPABASE_URL.indexOf('http') === 0 &&
               CONFIG.SUPABASE_ANON_KEY.indexOf('__') !== 0 &&
               CONFIG.SUPABASE_ANON_KEY.length > 20;
      }

      // === PRIVACY CONSENT GUARD ===========================================
      // No name or score is EVER written to Supabase without the player's
      // consent. We consider consent given when the explicit consent flag is
      // stored OR when the player already confirmed a public display name under
      // a prior version (grandfathered, so existing saves keep uploading and we
      // never re-nag them). Without consent the game stays fully playable; only
      // the network write is skipped (local high-score tracking is unaffected).
      var PRIVACY_CONSENT_KEY = 'soup_privacy_consent_v1';
      function privacyConsentOK() {
        try { if (localStorage.getItem(PRIVACY_CONSENT_KEY) === '1') return true; } catch (e) {}
        try { if (_id && _id.named) return true; } catch (e) {}
        return false;
      }

      var STORE = {
        get: function () {
          try { return localStorage.getItem(IDENTITY_KEY); } catch (e) { return null; }
        },
        set: function (str) {
          try { localStorage.setItem(IDENTITY_KEY, str); } catch (e) {}
        }
      };

      // Offline fallback only — creator row; no fake seed players.
      var SEED = [
        { id: '1832ff16-5fec-4afd-b570-f950e19eb434', name: 'SmallcreekSkullchef', platform: 'web', score: 12000000000, prestige: 6, prix_wins: 120 }
      ];

      var BOARD_COLUMN = { score: 'score', prestige: 'prestige', prix: 'prix_wins' };

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
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          var r = (Math.random() * 16) | 0, v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }

      var BLOCKLIST = /(nigger|faggot|kike|spic|chink|cunt|rape)/i;
      var RESERVED_NAMES = /^(chef|smallcreekskullchef)$/i;
      function cleanName(raw) {
        if (raw == null) return 'Chef';
        var n = String(raw)
          .replace(/[\u0000-\u001F\u007F]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/[^0-9A-Za-z _.!\-\u00C0-\u017F]/g, '')
          .trim();
        if (n.length > 20) n = n.slice(0, 20);
        if (n.length < 3) return '';
        if (RESERVED_NAMES.test(n)) return '';
        if (BLOCKLIST.test(n)) return '';
        return n;
      }

      function randomChefName() {
        return 'Chef #' + (1000 + Math.floor(Math.random() * 9000));
      }

      var _id = null;
      var _client = null;
      var _clientPromise = null;
      var _lastSubmit = 0;
      var _pending = null;
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
                named: d.named === true,           // name confirmed server-side (unique)
                provisional: d.provisional === true, // chosen offline, awaiting confirm
                v: SCHEMA
              };
              return _id;
            }
          } catch (e) {}
        }
        _id = { uuid: uuidv4(), name: randomChefName(), prixWins: 0, scoreHi: 0, named: false, provisional: false, v: SCHEMA };
        saveIdentity();
        return _id;
      }

      function saveIdentity() {
        if (!_id) return;
        STORE.set(JSON.stringify(_id));
      }

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

      var leaderboard = {

        isLive: function () { return isConfigured(); },

        identity: function () {
          if (!_id) loadIdentity();
          return { uuid: _id.uuid, name: _id.name };
        },
        reloadIdentity: function () {
          _id = null;
          return loadIdentity();
        },

        setName: function (raw) {
          if (!_id) loadIdentity();
          var clean = cleanName(raw);
          _id.name = clean || _id.name || randomChefName();
          saveIdentity();
          this.submit({});
          return _id.name;
        },

        /** Has the player confirmed a real, unique name yet (not the default)? */
        hasName: function () { if (!_id) loadIdentity(); return !!_id.named; },
        /** A name was chosen offline but not yet confirmed against the server. */
        isProvisional: function () { if (!_id) loadIdentity(); return !!_id.provisional && !_id.named; },

        /**
         * Live availability check for a candidate name. Resolves boolean.
         * Locally-invalid names resolve false; when offline/unconfigured we can't
         * verify uniqueness so we optimistically resolve true (claimName is the
         * authority). Never throws.
         */
        checkName: function (raw) {
          if (!_id) loadIdentity();
          var clean = cleanName(raw);
          if (!clean || /^chef$/i.test(clean)) return Promise.resolve(false);
          if (!isConfigured()) return Promise.resolve(true);
          var uuid = _id.uuid;
          return ensureClient().then(function (client) {
            if (!client) return true;
            return client.rpc('is_name_available', { p_name: clean, p_id: uuid }).then(function (res) {
              if (!res || res.error) return true; // unknown -> don't block typing
              return res.data === true;
            });
          }).catch(function () { return true; });
        },

        /**
         * Claim/confirm a unique display name. Resolves with the accepted name on
         * success; rejects with 'INVALID' | 'NAME_TAKEN' | 'OFFLINE'. On OFFLINE
         * the name is stored locally as PROVISIONAL so the player can keep playing
         * and we re-claim later via reclaim().
         */
        claimName: function (raw) {
          if (!_id) loadIdentity();
          var clean = cleanName(raw);
          if (!clean || /^chef$/i.test(clean)) return Promise.reject('INVALID');
          if (!isConfigured()) {
            _id.name = clean; _id.named = false; _id.provisional = true; saveIdentity();
            return Promise.reject('OFFLINE');
          }
          return this._claimRemote(clean).catch(function (reason) {
            if (reason === 'OFFLINE') {
              _id.name = clean; _id.named = false; _id.provisional = true; saveIdentity();
            }
            throw reason;
          });
        },

        /** Try to confirm a pending provisional name. Resolves 'ok'|'taken'|'invalid'|'offline'. */
        reclaim: function () {
          if (!_id) loadIdentity();
          if (_id.named || !_id.provisional || !_id.name) return Promise.resolve('ok');
          if (!isConfigured()) return Promise.resolve('offline');
          return this._claimRemote(_id.name).then(function () { return 'ok'; }, function (reason) {
            if (reason === 'NAME_TAKEN') return 'taken';
            if (reason === 'INVALID') return 'invalid';
            return 'offline';
          });
        },

        _claimRemote: function (clean) {
          var uuid = _id.uuid;
          return ensureClient().then(function (client) {
            if (!client) throw 'OFFLINE';
            return client.rpc('claim_name', { p_id: uuid, p_name: clean }).then(function (res) {
              if (res && res.error) {
                var msg = (res.error.message || '') + '';
                if (/NAME_TAKEN/i.test(msg)) throw 'NAME_TAKEN';
                if (/INVALID/i.test(msg)) throw 'INVALID';
                throw 'OFFLINE';
              }
              var row = res && res.data;
              var nm = (row && row.display_name) ? row.display_name : clean;
              _id.name = nm; _id.named = true; _id.provisional = false; saveIdentity();
              return nm;
            });
          }).catch(function (reason) {
            if (reason === 'NAME_TAKEN' || reason === 'INVALID' || reason === 'OFFLINE') throw reason;
            throw 'OFFLINE';
          });
        },

        getPrixWins: function () { if (!_id) loadIdentity(); return _id.prixWins; },
        bumpPrixWin: function (n) {
          if (!_id) loadIdentity();
          _id.prixWins += (Number.isFinite(n) ? n : 1);
          saveIdentity();
          return _id.prixWins;
        },

        submit: function (vals) {
          if (!_id) loadIdentity();
          vals = vals || {};

          if (Number.isFinite(vals.score)) {
            _id.scoreHi = Math.max(_id.scoreHi, Math.floor(vals.score));
          }
          if (Number.isFinite(vals.prix)) {
            _id.prixWins = Math.max(_id.prixWins, Math.floor(vals.prix));
          }
          saveIdentity();

          _pending = _pending || {};
          if (Number.isFinite(vals.score))    _pending.score    = _id.scoreHi;
          if (Number.isFinite(vals.prestige)) _pending.prestige = Math.floor(vals.prestige);
          if (Number.isFinite(vals.prix))     _pending.prix     = _id.prixWins;

          // Skip the network write entirely until the player has consented to the
          // public leaderboard. Local high-score tracking above still happens.
          if (!isConfigured() || !privacyConsentOK()) { _pending = null; return; }

          var now = Date.now();
          var wait = Math.max(0, CONFIG.DEBOUNCE_MS - (now - _lastSubmit));
          if (_submitTimer) return;
          var self = this;
          _submitTimer = setTimeout(function () {
            _submitTimer = null;
            self._flush();
          }, wait);
        },

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
              if (res && res.error) { try { console.warn('[leaderboard] submit:', res.error.message); } catch (e) {} }
              return res ? res.data : null;
            });
          }).catch(function () { return null; });
        },

        CREATOR_UUID: '1832ff16-5fec-4afd-b570-f950e19eb434',

        // Creator is pinned with 👑 and does not consume one of the N numbered slots.
        _normalizeTopRows: function (data, col, myUuid, want) {
          if (!data || !data.length) return [];
          var cid = this.CREATOR_UUID;
          var creator = null;
          var others = [];
          for (var i = 0; i < data.length; i++) {
            var row = data[i];
            if (String(row.id).toLowerCase() === cid) creator = row;
            else others.push(row);
          }
          others = others.slice(0, want);
          var out = [];
          if (creator) {
            out.push({
              rank: 0,
              id: creator.id,
              name: creator.display_name,
              value: creator[col],
              platform: creator.platform,
              you: creator.id === myUuid
            });
          }
          for (var j = 0; j < others.length; j++) {
            out.push({
              rank: j + 1,
              id: others[j].id,
              name: others[j].display_name,
              value: others[j][col],
              platform: others[j].platform,
              you: others[j].id === myUuid
            });
          }
          return out;
        },

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
              .limit(n + 1)
              .then(function (res) {
                if (!res || res.error || !Array.isArray(res.data)) {
                  return self._mockTop(col, n);
                }
                return self._normalizeTopRows(res.data, col, myUuid, n);
              });
          }).catch(function () { return self._mockTop(col, n); });
        },

        _mockTop: function (col, n) {
          var rows = SEED.slice().sort(function (a, b) { return b[col] - a[col]; }).slice(0, n + 1);
          var data = rows.map(function (r) {
            var o = { id: r.id || null, display_name: r.name, platform: r.platform };
            o[col] = r[col];
            return o;
          });
          if (!_id) loadIdentity();
          return this._normalizeTopRows(data, col, _id.uuid, n);
        },

        _seed: function () { return SEED.slice(); },

        // ---- CLOUD SAVE (cross-platform progress) -------------------------
        // Uploads/downloads a portable backup blob keyed by the player UUID, via
        // the push_save / pull_save RPCs (see leaderboard/cloud_save.sql). The
        // UUID doubles as the player's "account code". Reject reasons:
        // 'OFFLINE' | 'INVALID' | 'NOT_FOUND' | 'ERROR'. Never throws sync.
        _validUuid: function (s) {
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(String(s || '').toLowerCase());
        },
        myCode: function () { if (!_id) loadIdentity(); return _id.uuid; },
        cloudPush: function (blob) {
          if (!_id) loadIdentity();
          if (typeof blob !== 'string' || !blob) return Promise.reject('INVALID');
          if (!isConfigured()) return Promise.reject('OFFLINE');
          var uuid = _id.uuid;
          return ensureClient().then(function (client) {
            if (!client) throw 'OFFLINE';
            return client.rpc('push_save', { p_id: uuid, p_blob: blob, p_platform: CONFIG.PLATFORM }).then(function (res) {
              if (res && res.error) { throw 'ERROR'; }
              return { code: uuid, updatedAt: res ? res.data : null };
            });
          }).catch(function (e) { throw (e === 'OFFLINE' || e === 'INVALID') ? e : 'ERROR'; });
        },
        cloudPull: function (code) {
          if (!_id) loadIdentity();
          var uuid = (typeof code === 'string' && code.trim()) ? code.trim().toLowerCase() : _id.uuid;
          if (!this._validUuid(uuid)) return Promise.reject('INVALID');
          if (!isConfigured()) return Promise.reject('OFFLINE');
          return ensureClient().then(function (client) {
            if (!client) throw 'OFFLINE';
            return client.rpc('pull_save', { p_id: uuid }).then(function (res) {
              if (res && res.error) { throw 'ERROR'; }
              var data = res && res.data;
              var row = Array.isArray(data) ? (data[0] || null) : (data || null);
              if (!row || !row.blob) throw 'NOT_FOUND';
              return row.blob;
            });
          }).catch(function (e) { throw (e === 'OFFLINE' || e === 'INVALID' || e === 'NOT_FOUND') ? e : 'ERROR'; });
        },

        openPanel: function () {
          /* not wired yet — see INTEGRATION NOTES */
        }
      };

      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) { try { leaderboard.flush(); } catch (e) {} }
        });
      }

      global.leaderboard = leaderboard;

    })(typeof window !== 'undefined' ? window : this);