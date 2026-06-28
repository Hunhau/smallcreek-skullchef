/* BUILD_V tag + PWA auto-update (build-319). Bump with version.json + sw.js. */
(function (global) {
    'use strict';

    // MUST equal version.json "v" in this commit (so no reload happens now).
    var BUILD_V = 'build-374';
    global.BUILD_V = BUILD_V;

    function paintBuildTag() {
        try {
            var prod = (typeof PRODUCTION_BUILD !== 'undefined' && PRODUCTION_BUILD)
                || (typeof SC_LOCAL_DEV !== 'undefined' && !SC_LOCAL_DEV);
            var b = document.getElementById('build-tag');
            if (b) {
                if (prod) { b.style.display = 'none'; b.textContent = ''; }
                else { b.style.display = ''; b.textContent = BUILD_V; }
            }
            var hv = document.getElementById('home-version');
            if (hv && typeof VERSION !== 'undefined') {
                hv.textContent = (typeof home !== 'undefined' && home.versionLabel)
                    ? home.versionLabel()
                    : (prod ? VERSION : (VERSION + ' · ' + BUILD_V));
            }
        } catch (e) {}
    }

    function hardReloadTo(v) {
        try {
            var key = 'sc_upd_' + v;
            var n = parseInt(sessionStorage.getItem(key) || '0', 10) || 0;
            if (n >= 2) return;
            sessionStorage.setItem(key, String(n + 1));
            location.replace(location.pathname + '?v=' + encodeURIComponent(v) + '_' + Date.now());
        } catch (e) {}
    }

    function checkForUpdate() {
        try {
            if (location.protocol === 'file:') return;
            if (typeof SC_LOCAL_DEV !== 'undefined' && SC_LOCAL_DEV) return;
            fetch('version.json?ts=' + Date.now(), { cache: 'no-store' })
                .then(function (r) { return r.json(); })
                .then(function (data) {
                    if (data && data.v && data.v !== BUILD_V) {
                        try {
                            if (navigator.serviceWorker) {
                                navigator.serviceWorker.getRegistration().then(function (reg) {
                                    if (reg) reg.update();
                                }).catch(function () {});
                            }
                        } catch (e) {}
                        hardReloadTo(data.v);
                    }
                })
                .catch(function () {});
        } catch (e) {}
    }

    checkForUpdate();
    paintBuildTag();
    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintBuildTag);
        else paintBuildTag();
    } catch (e) {}
    try {
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible') checkForUpdate();
        });
        global.addEventListener('focus', checkForUpdate);
        global.addEventListener('pageshow', function (e) { if (e && e.persisted) checkForUpdate(); });
    } catch (e) {}
})(typeof window !== 'undefined' ? window : this);
