/* Web demo vs paid store builds — funnel without cannibalizing Steam / mobile.
 * LAUNCH_DEMO_MODE stays false until Steam + Apple + Android launch together.
 * See docs/WEB_VS_STORE_STRATEGY.md */
(function (global) {
    'use strict';

    /** Master switch — false = web prod keeps full parity (pre-launch). */
    var LAUNCH_DEMO_MODE = false;

    var STEAM_APP_ID = '4892720';
    var IOS_STORE_URL = '';
    var ANDROID_STORE_URL = '';

    var WEB_DEMO_CUTOFF_MS = Date.parse('2026-07-01T00:00:00.000Z');
    var DEMO_PRESTIGE_MAX = 2;
    var LEGACY_CHARMS_MIN = 80;
    var LEGACY_PRESTIGE_MIN = 3;
    var LEGACY_PLAY_SEC_MIN = 7200;

    function buildTarget() {
        try {
            if (typeof global.BUILD_TARGET === 'string') return global.BUILD_TARGET;
        } catch (e) {}
        return 'web';
    }

    function isLocalDev() {
        try { return !!(typeof global.SC_LOCAL_DEV !== 'undefined' && global.SC_LOCAL_DEV); } catch (e) {}
        return false;
    }

    function countCharms(coll) {
        try {
            var items = coll && coll.items;
            if (!items || typeof items !== 'object') return 0;
            var n = 0;
            for (var k in items) {
                if (Object.prototype.hasOwnProperty.call(items, k)) n++;
            }
            return n;
        } catch (e) { return 0; }
    }

    function snapFromGame(g) {
        if (!g) return null;
        return { s: g.s, ps: g.playSec, meta: g.meta, coll: g.coll };
    }

    var STORE_TIER = {
        LAUNCH_DEMO_MODE: LAUNCH_DEMO_MODE,
        DEMO_PRESTIGE_MAX: DEMO_PRESTIGE_MAX,
        STEAM_APP_ID: STEAM_APP_ID,
        IOS_STORE_URL: IOS_STORE_URL,
        ANDROID_STORE_URL: ANDROID_STORE_URL,

        isLocalDev: isLocalDev,

        /** Pre-launch web: full game + founder messaging (before LAUNCH_DEMO_MODE). */
        isWebFounderBeta: function () {
            if (buildTarget() !== 'web') return false;
            if (LAUNCH_DEMO_MODE) return false;
            return true;
        },

        /** GitHub Pages prod demo slice — only when LAUNCH_DEMO_MODE and not legacy. */
        isWebDemo: function () {
            if (isLocalDev()) return false;
            if (buildTarget() !== 'web') return false;
            if (!LAUNCH_DEMO_MODE) return false;
            return !this.isLegacyPlayer();
        },

        isFullGame: function () {
            var b = buildTarget();
            return b === 'steam' || b === 'ios' || b === 'android';
        },

        /** Grandfather: veteran web saves keep full web parity after launch cut. */
        isLegacyPlayer: function (snap) {
            if (!LAUNCH_DEMO_MODE) return true;
            if (!snap) {
                try {
                    if (typeof global.game !== 'undefined') snap = snapFromGame(global.game);
                } catch (e) { snap = null; }
            }
            if (!snap) return false;
            var meta = (snap.meta && typeof snap.meta === 'object') ? snap.meta : {};
            if (meta.webLegacyPlayer === true) return true;
            if ((Number(snap.s) || 0) >= LEGACY_PRESTIGE_MIN) return true;
            if (countCharms(snap.coll) >= LEGACY_CHARMS_MIN) return true;
            var created = meta.saveCreatedAt;
            if (Number.isFinite(created) && created < WEB_DEMO_CUTOFF_MS) return true;
            if ((Number(snap.ps) || 0) >= LEGACY_PLAY_SEC_MIN) return true;
            return false;
        },

        ensureMeta: function (g) {
            g = g || (typeof global.game !== 'undefined' ? global.game : null);
            if (!g) return { saveCreatedAt: Date.now(), webLegacyPlayer: false };
            if (!g.meta || typeof g.meta !== 'object') g.meta = {};
            if (!Number.isFinite(g.meta.saveCreatedAt)) g.meta.saveCreatedAt = Date.now();
            return {
                saveCreatedAt: g.meta.saveCreatedAt,
                webLegacyPlayer: !!g.meta.webLegacyPlayer
            };
        },

        /** After load: stamp legacy flag once (never removes grandfather). */
        applyAfterLoad: function (g) {
            if (!g) return;
            this.ensureMeta(g);
            if (!LAUNCH_DEMO_MODE) {
                this.syncUi();
                return;
            }
            if (this.isLegacyPlayer(g) && !g.meta.webLegacyPlayer) {
                g.meta.webLegacyPlayer = true;
                try { g.save(); } catch (e) {}
            }
            this.syncUi();
        },

        canPrestige: function (g) {
            g = g || (typeof global.game !== 'undefined' ? global.game : null);
            if (!g || !this.isWebDemo()) return true;
            return (Number(g.s) || 0) < DEMO_PRESTIGE_MAX;
        },

        prestigeBlockedToast: function () {
            try {
                if (typeof global.t === 'function' && typeof global.gx !== 'undefined') {
                    global.gx.toast(global.t('demo_prestige_cap', { max: DEMO_PRESTIGE_MAX }));
                    return;
                }
            } catch (e) {}
            try {
                if (typeof global.gx !== 'undefined') {
                    global.gx.toast('Demo: prestige cap reached — get the full game on Steam!');
                }
            } catch (e2) {}
        },

        /** Catalog gate: storeOnly skins stay off web demo drops/album. */
        skinAllowed: function (sk) {
            if (!sk || !sk.id) return false;
            if (!this.isWebDemo()) return true;
            if (sk.storeOnly === true) return false;
            return true;
        },

        steamStoreUrl: function () {
            return 'https://store.steampowered.com/app/' + STEAM_APP_ID + '/';
        },

        openSteam: function () {
            try { global.open(this.steamStoreUrl(), '_blank', 'noopener,noreferrer'); } catch (e) {}
        },

        openIos: function () {
            if (!IOS_STORE_URL) return;
            try { global.open(IOS_STORE_URL, '_blank', 'noopener,noreferrer'); } catch (e) {}
        },

        openAndroid: function () {
            if (!ANDROID_STORE_URL) return;
            try { global.open(ANDROID_STORE_URL, '_blank', 'noopener,noreferrer'); } catch (e) {}
        },

        syncUi: function () {
            var founder = this.isWebFounderBeta();
            var demo = this.isWebDemo();
            var founderEl = document.getElementById('home-founder-banner');
            if (founderEl) founderEl.style.display = founder ? '' : 'none';
            var ids = ['home-store-cta', 'pause-store-cta'];
            for (var i = 0; i < ids.length; i++) {
                var el = document.getElementById(ids[i]);
                if (el) el.style.display = demo ? '' : 'none';
            }
            var iosBtn = document.getElementById('store-cta-ios');
            if (iosBtn) iosBtn.style.display = (demo && IOS_STORE_URL) ? '' : 'none';
            var andBtn = document.getElementById('store-cta-android');
            if (andBtn) andBtn.style.display = (demo && ANDROID_STORE_URL) ? '' : 'none';
            var backupHint = document.getElementById('home-backup-demo-hint');
            if (backupHint) backupHint.style.display = demo ? '' : 'none';
        }
    };

    global.STORE_TIER = STORE_TIER;

    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { STORE_TIER.syncUi(); });
        } else {
            STORE_TIER.syncUi();
        }
    } catch (e) {}
})(typeof window !== 'undefined' ? window : this);
