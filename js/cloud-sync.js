/**
 * Skullchef — multi-platform cloud save orchestrator (prepared, not live until ENABLED).
 *
 * Platform cost to SmallCreek:
 *   steam   — Steam Cloud (free, player Steam account)
 *   icloud  — player iCloud quota (free for us; needs iOS entitlements + Filesystem)
 *   android — Play Games saved games (stub until Play Console wired)
 *   supabase — our DB (free tier; optional, debounced, privacy-gated)
 *
 * Set CLOUD_SYNC.ENABLED = true before store launch (see docs/CLOUD_SAVE_PLATFORMS.md).
 */
(function (global) {
    'use strict';

    var SAVE_KEY = 'soup_p_v17';
    var ICLOUD_PATH = 'skullchef/save.json';
    var ANDROID_KEY = 'skullchef_save_v1';
    var SUPABASE_MIN_MS = 90000;

    var CLOUD_SYNC = {
        /** Master switch — false = no new behaviour (Steam/Playables legacy only). */
        ENABLED: false,
        /** Flip each flag when that store is live; then set ENABLED = true (see activateAtLaunch). */
        storesLive: { steam: false, ios: false, android: false },
        /** Cross-platform Supabase backup (costs us on scale). Enable after launch if needed. */
        supabaseAuto: false,
        /** iOS iCloud Documents sync (player pays iCloud storage, not us). */
        icloud: true,
        /** Google Play Games cloud (Android). Stub until Play Games SDK wired. */
        androidPlay: true,
        _pushTimer: null,
        _lastSupabasePush: 0,

        platform() {
            try {
                if (typeof BUILD_TARGET !== 'undefined') return BUILD_TARGET;
                if (global.Capacitor && typeof global.Capacitor.getPlatform === 'function') {
                    return global.Capacitor.getPlatform();
                }
            } catch (e) {}
            return 'web';
        },

        isLive() { return !!this.ENABLED; },

        /** Call once at joint launch (or per store). Does nothing until you invoke it. */
        activateAtLaunch: function (opts) {
            opts = opts || {};
            if (opts.steam) this.storesLive.steam = true;
            if (opts.ios) this.storesLive.ios = true;
            if (opts.android) this.storesLive.android = true;
            if (opts.enabled === true) this.ENABLED = true;
            else if (this.storesLive.steam || this.storesLive.ios || this.storesLive.android) {
                this.ENABLED = true;
            }
        },

        _lastSeenOf(raw) {
            try {
                if (typeof secure === 'undefined' || !secure.unwrap) return 0;
                var u = secure.unwrap(raw);
                var d = u && u.data;
                return (d && Number.isFinite(d.lastSeen)) ? d.lastSeen : 0;
            } catch (e) { return 0; }
        },

        mergeBlob(raw) {
            if (typeof raw !== 'string' || !raw) return false;
            try {
                if (typeof cloudSave !== 'undefined' && cloudSave._mergeCloudIntoMain) {
                    return cloudSave._mergeCloudIntoMain(raw);
                }
                if (typeof secure === 'undefined' || !secure.unwrap) return false;
                var cu = secure.unwrap(raw);
                if (!cu || !cu.data || typeof cu.data !== 'object') return false;
                var localRaw = null;
                try { localRaw = localStorage.getItem(SAVE_KEY); } catch (e) {}
                if (!localRaw || this._lastSeenOf(raw) >= this._lastSeenOf(localRaw)) {
                    try { localStorage.setItem(SAVE_KEY, raw); return true; } catch (e2) {}
                }
            } catch (e) {}
            return false;
        },

        recoveryCode() {
            try {
                if (typeof leaderboard !== 'undefined' && leaderboard.myCode) return leaderboard.myCode() || '';
            } catch (e) {}
            return '';
        },

        async copyRecoveryCode() {
            var code = this.recoveryCode();
            if (!code) return false;
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    await navigator.clipboard.writeText(code);
                    return true;
                }
            } catch (e) {}
            return false;
        },

        /* ---- providers ---- */

        steam: {
            available() {
                try {
                    return typeof electronAPI !== 'undefined' && electronAPI.platform === 'steam';
                } catch (e) { return false; }
            },
            async load() {
                if (!this.available() || !electronAPI.readCloudSave) return null;
                try {
                    var s = await electronAPI.readCloudSave();
                    return (typeof s === 'string' && s) ? s : null;
                } catch (e) { return null; }
            },
            save(str) {
                if (!this.available()) return;
                try {
                    if (electronAPI.writeCloudSaveSync) electronAPI.writeCloudSaveSync(str);
                    else if (electronAPI.writeCloudSave) electronAPI.writeCloudSave(str);
                } catch (e) {}
            }
        },

        icloud: {
            available() {
                return CLOUD_SYNC.platform() === 'ios' && !!CLOUD_SYNC.icloud;
            },
            _fs() {
                try {
                    var p = global.Capacitor && global.Capacitor.Plugins;
                    return p && p.Filesystem ? p.Filesystem : null;
                } catch (e) { return null; }
            },
            async load() {
                if (!this.available()) return null;
                var FS = this._fs();
                if (!FS || !FS.readFile) return null;
                try {
                    var res = await FS.readFile({ path: ICLOUD_PATH, directory: 'DOCUMENTS' });
                    var data = res && (res.data != null ? res.data : res);
                    if (typeof data === 'string' && data) return data;
                } catch (e) {}
                return null;
            },
            async save(str) {
                if (!this.available() || typeof str !== 'string') return;
                var FS = this._fs();
                if (!FS || !FS.writeFile) return;
                try {
                    await FS.writeFile({
                        path: ICLOUD_PATH,
                        data: str,
                        directory: 'DOCUMENTS',
                        recursive: true
                    });
                } catch (e) {}
            }
        },

        android: {
            available() {
                return CLOUD_SYNC.platform() === 'android' && !!CLOUD_SYNC.androidPlay;
            },
            async load() {
                if (!this.available()) return null;
                /* Play Games Saved Games — wire in tools/setup-cloud-sync-android.md */
                try {
                    var PG = global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.PlayGames;
                    if (PG && PG.loadSnapshot) {
                        var r = await PG.loadSnapshot({ name: ANDROID_KEY });
                        if (r && typeof r.data === 'string' && r.data) return r.data;
                    }
                } catch (e) {}
                return null;
            },
            async save(str) {
                if (!this.available() || typeof str !== 'string') return;
                try {
                    var PG = global.Capacitor && global.Capacitor.Plugins && global.Capacitor.Plugins.PlayGames;
                    if (PG && PG.saveSnapshot) await PG.saveSnapshot({ name: ANDROID_KEY, data: str });
                } catch (e) {}
            }
        },

        supabase: {
            _privacyOk() {
                try {
                    if (typeof privacyConsentOK === 'function') return privacyConsentOK();
                } catch (e) {}
                return false;
            },
            _live() {
                try {
                    return typeof leaderboard !== 'undefined' && leaderboard.isLive && leaderboard.isLive();
                } catch (e) { return false; }
            },
            available() {
                return !!CLOUD_SYNC.supabaseAuto && this._live();
            },
            async load(code) {
                if (!this.available() || !leaderboard.cloudPull) return null;
                try {
                    var blob = await leaderboard.cloudPull(code || undefined);
                    return (typeof blob === 'string' && blob) ? blob : null;
                } catch (e) { return null; }
            },
            async pushNow() {
                if (!this.available() || !this._privacyOk()) return;
                if (typeof backup === 'undefined' || !backup.encode || !leaderboard.cloudPush) return;
                var now = Date.now();
                if (now - CLOUD_SYNC._lastSupabasePush < SUPABASE_MIN_MS) return;
                CLOUD_SYNC._lastSupabasePush = now;
                try {
                    var code = backup.encode();
                    await leaderboard.cloudPush(code);
                } catch (e) {}
            }
        },

        /* ---- public API ---- */

        onSave(saveString) {
            if (!this.isLive() || typeof saveString !== 'string') return;
            try { this.steam.save(saveString); } catch (e) {}
            try { this.icloud.save(saveString); } catch (e) {}
            try { this.android.save(saveString); } catch (e) {}
            if (this.supabaseAuto) {
                var self = this;
                if (this._pushTimer) clearTimeout(this._pushTimer);
                this._pushTimer = setTimeout(function () {
                    self._pushTimer = null;
                    self.supabase.pushNow();
                }, 15000);
            }
        },

        async restoreAll() {
            if (!this.isLive()) {
                try {
                    if (typeof cloudSave !== 'undefined' && cloudSave.restoreToLocal) {
                        return await cloudSave.restoreToLocal();
                    }
                } catch (e) {}
                return false;
            }

            var merged = false;
            var blobs = [];

            try {
                if (typeof cloudSave !== 'undefined' && cloudSave.restoreToLocal) {
                    await cloudSave.restoreToLocal();
                    merged = true;
                }
            } catch (e) {}

            try { var s = await this.steam.load(); if (s) blobs.push(s); } catch (e) {}
            try { var i = await this.icloud.load(); if (i) blobs.push(i); } catch (e) {}
            try { var a = await this.android.load(); if (a) blobs.push(a); } catch (e) {}
            if (this.supabaseAuto && this.supabase._privacyOk()) {
                try { var u = await this.supabase.load(); if (u) blobs.push(u); } catch (e) {}
            }

            blobs.sort(function (a, b) { return CLOUD_SYNC._lastSeenOf(b) - CLOUD_SYNC._lastSeenOf(a); });
            for (var j = 0; j < blobs.length; j++) {
                if (this.mergeBlob(blobs[j])) merged = true;
            }
            return merged;
        },

        status() {
            return {
                enabled: this.ENABLED,
                storesLive: this.storesLive,
                platform: this.platform(),
                steam: this.steam.available(),
                icloud: this.icloud.available(),
                android: this.android.available(),
                supabaseAuto: this.supabaseAuto && this.supabase.available(),
                recoveryCode: this.recoveryCode()
            };
        }
    };

    global.CLOUD_SYNC = CLOUD_SYNC;
    global.cloudSync = CLOUD_SYNC;
})(typeof window !== 'undefined' ? window : this);
