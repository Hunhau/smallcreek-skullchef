/* Platform build target + PRODUCTION_BUILD (build-314). */
    (function (global) {
        'use strict';
        var VALID = ['web', 'playables', 'steam', 'android', 'ios'];

        // ↓↓↓ SET THIS PER PLATFORM BUILD. Default 'web' = unchanged web behaviour. ↓↓↓
        var BUILD_TARGET_OVERRIDE = 'auto'; // 'web' | 'playables' | 'steam' | 'android' | 'ios' | 'auto'
        // Store / production upload: set true to strip creator-only dev tools from players.
        var PRODUCTION_BUILD = true;
        // Local file:// or localhost = dev: creator tools + __sc_creator allowed.
        try {
            var _scHost = (typeof location !== 'undefined' && location.hostname) || '';
            var _scProto = (typeof location !== 'undefined' && location.protocol) || '';
            if (_scHost === 'localhost' || _scHost === '127.0.0.1' || _scProto === 'file:') PRODUCTION_BUILD = false;
            if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(_scHost)) PRODUCTION_BUILD = false;
            if (/\.trycloudflare\.com$/i.test(_scHost)) PRODUCTION_BUILD = false;
            if (BUILD_TARGET_OVERRIDE === 'steam') PRODUCTION_BUILD = true;
        } catch (e) {}
        // ↑↑↑ A packaging script may rewrite the lines above for each store build. ↑↑↑

        // Best-effort host detection. Only consulted when override === 'auto'.
        // Returns a valid platform string or null (null -> caller falls back to 'web').
        function autoDetect() {
            try {
                // ytgame exists on localhost too (script in <head>); only Playables when embedded.
                if (global.ytgame && global.ytgame.IN_PLAYABLES_ENV) return 'playables';
            } catch (e) {}
            try {
                if (global.Capacitor && typeof global.Capacitor.getPlatform === 'function') {
                    var p = global.Capacitor.getPlatform();
                    if (p === 'ios') return 'ios';
                    if (p === 'android') return 'android';
                }
            } catch (e) {}
            try { if (global.steamworks) return 'steam'; } catch (e) {}
            try { if (global.process && global.process.versions && global.process.versions.electron) return 'steam'; } catch (e) {}
            return null;
        }

        var resolved = 'web';
        try {
            if (BUILD_TARGET_OVERRIDE === 'auto') {
                var det = autoDetect();
                resolved = (det && VALID.indexOf(det) !== -1) ? det : 'web';
            } else if (VALID.indexOf(BUILD_TARGET_OVERRIDE) !== -1) {
                resolved = BUILD_TARGET_OVERRIDE; // explicit value always wins
            } else {
                resolved = 'web'; // unknown value -> safe default
            }
        } catch (e) { resolved = 'web'; }

        global.BUILD_TARGET = resolved;
        global.isPlayablesEnv = function () {
            try {
                if (global.BUILD_TARGET === 'playables') return true;
                return typeof global.ytgame !== 'undefined' && global.ytgame.IN_PLAYABLES_ENV;
            } catch (e) { return false; }
        };
        try { document.documentElement.dataset.build = resolved; } catch (e) {}
        global.PRODUCTION_BUILD = !!PRODUCTION_BUILD;
        global.SC_LOCAL_DEV = !PRODUCTION_BUILD;
        // Local dev: drop stale PWA shell (old SW served broken index without js/ modules).
        (function scClearLocalShell() {
            try {
                if (!global.SC_LOCAL_DEV) return;
                if ('serviceWorker' in navigator) {
                    navigator.serviceWorker.getRegistrations().then(function (regs) {
                        for (var i = 0; i < regs.length; i++) { try { regs[i].unregister(); } catch (e) {} }
                    }).catch(function () {});
                }
                if ('caches' in window) {
                    caches.keys().then(function (keys) {
                        for (var j = 0; j < keys.length; j++) {
                            if (keys[j].indexOf('skullchef') >= 0) { try { caches.delete(keys[j]); } catch (e) {} }
                        }
                    }).catch(function () {});
                }
            } catch (e) {}
        })();
    })(typeof window !== 'undefined' ? window : this);
