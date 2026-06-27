/* Boot sequence + service worker registration (build-316). */
(function (global) {
    'use strict';

async function boot() {
    try {
    try {
        if (location.protocol !== 'file:' && (typeof SC_LOCAL_DEV === 'undefined' || !SC_LOCAL_DEV)) {
            const vr = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
            const vd = await vr.json();
            if (vd && vd.v && typeof BUILD_V !== 'undefined' && vd.v !== BUILD_V) {
                location.replace(location.pathname + '?_sv=' + encodeURIComponent(vd.v) + '&_t=' + Date.now());
                return;
            }
        }
    } catch (e) {}
    try { const sl = localStorage.getItem('soup_lang'); if (sl === 'es' || sl === 'en') setLang(sl); } catch (e) {}
    syncHtmlLang();
    applyRotateDismissOnBoot();
    // Señal "primer frame": la home ya está en el HTML inicial, así que la enviamos
    // en cuanto el navegador pinta (doble rAF). Fuera de Playables es no-op silencioso.
    try { requestAnimationFrame(() => requestAnimationFrame(() => ytPlayables.firstFrameReady())); } catch (e) { ytPlayables.firstFrameReady(); }
    try { quality.load(); } catch (e) {}
    try { if (typeof events !== 'undefined' && events.applyTheme) events.applyTheme(); } catch (e) {}
    // Restaura save de nube (Playables SDK o Steam Auto-Cloud file) antes de game.load().
    try { await cloudSync.restoreAll(); } catch (e) {}
    try {
        if (window.Capacitor && typeof window.Capacitor.getPlatform === 'function') {
            const p = window.Capacitor.getPlatform();
            if (p === 'ios' || p === 'android') {
                window.BUILD_TARGET = p;
                try { document.documentElement.dataset.build = p; } catch (e) {}
            }
        }
    } catch (e) {}
    try { sound.init(); } catch (e) {}
    try { ambient.init(); } catch (e) {}
    try { music.init(); } catch (e) {}
    try { game.init(); } catch (e) {
        try { if (typeof window.__scBootSplashFail === 'function') window.__scBootSplashFail('Game init failed.\nReload the page or try Wi‑Fi option 2.'); } catch (e2) {}
    }
    try { visitors.init(); } catch (e) {}
    try {
        if (BUILD === 'steam' && window.steamworks && window.steamworks.syncAfterLoad && game.ach) {
            window.steamworks.syncAfterLoad(game.ach);
        }
    } catch (e) {}
    try { hudChips.init(); } catch (e) {}
    // Leaderboard identity: ensures UUID + display name exist (own localStorage
    // key 'soup_lb_identity'; never touches the integrity-wrapped 'soup_p_v17').
    try { leaderboard.identity(); } catch (e) {}
    /* ===== CREATOR UNLOCK GESTURE — KEEP (creator-only, dormant for players) =====
       No-console toggle: 7 quick taps/clicks within ~3s on the home title
       flips the __sc_creator flag that creator.isDev() reads. Works with
       mouse + touch (uses 'click', which fires on tap). Does NOT touch the
       Play button or any other start-screen control. Intentional owner tool
       (paired with Ctrl+Shift+D); stays dormant/hidden in the launch build.
       Disabled entirely when PRODUCTION_BUILD is true (store uploads). */
    try {
        if (typeof PRODUCTION_BUILD !== 'undefined' && PRODUCTION_BUILD) throw new Error('prod');
        const __scTitle = document.getElementById('home-title');
        if (__scTitle && !__scTitle.dataset.scGesture) {
            __scTitle.dataset.scGesture = '1';
            __scTitle.style.cursor = 'default';
            const __scToggleCreator = function () {
                let on = false;
                try { on = localStorage.getItem('__sc_creator') === '1'; } catch (e) {}
                try {
                    if (on) localStorage.removeItem('__sc_creator');
                    else {
                        localStorage.setItem('__sc_creator', '1');
                        scGrantOwnerCatalog();
                    }
                } catch (e) {}
                try { gx.toast(t(on ? 'creator_mode_off' : 'creator_mode_on')); } catch (e) {}
                // Live-refresh the Creator panel if it's open so tools appear/vanish at once.
                try { const md = document.getElementById('creator-modal'); if (md && md.classList.contains('open')) creator.render(); } catch (e) {}
            };
            let __scTaps = [];
            __scTitle.addEventListener('click', function () {
                const now = Date.now();
                __scTaps.push(now);
                __scTaps = __scTaps.filter(ts => now - ts <= 3000);
                if (__scTaps.length >= 7) { __scTaps = []; __scToggleCreator(); }
            });
            // Easiest path (desktop): Ctrl+Shift+D toggles creator mode from anywhere.
            document.addEventListener('keydown', function (e) {
                if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
                    e.preventDefault();
                    __scToggleCreator();
                }
                if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j')) {
                    e.preventDefault();
                    try { scTogglePlayerPreview(); } catch (e2) {}
                }
            });
        }
    } catch (e) {}
    /* ===== END CREATOR UNLOCK GESTURE ===== */
    /* Owner-only recording shortcuts — local dev only (never on production server). */
    try {
        if (typeof scIsLocalDev === 'function' && scIsLocalDev()) {
            document.addEventListener('keydown', function (e) {
                if (!scIsOwnerDevice()) return;
                if (!e.ctrlKey || !e.shiftKey) return;
                if (e.key === 'P' || e.key === 'p') {
                    e.preventDefault();
                    try { creator.preparePrestigeDemo(); } catch (err) {}
                } else if (e.key === 'V' || e.key === 'v') {
                    e.preventDefault();
                    try { creator.previewPrestige(); } catch (err) {}
                }
            });
        }
    } catch (e) {}
    applyStaticI18n();
    const f = document.getElementById('lang-fab'); if (f) f.textContent = '🌐 ' + LANG.toUpperCase();
    home.init();
    try {
        if (typeof isPlayablesEnv === 'function' && isPlayablesEnv()) {
            ['home-backup', 'home-creator-sync'].forEach(function (id) {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }
    } catch (e) {}
    try { backup.initCreatorSyncUnlock(); backup.initDevSyncUi(); } catch (e) {}
    try { fullscreen.init(); } catch (e) {}
    try { collection.refreshFab(); } catch (e) {}
    try { collection.preload(); } catch (e) {}
    try { scMaybeAutoCreatorLocal(); } catch (e) {}
    try {
        if (collection.catalog().length) {
            scGrantOwnerCatalog();
            collection._reapplyEquipsAfterCatalog();
        } else {
            collection.ensureCatalog(function (ok) {
                if (ok) {
                    try { scGrantOwnerCatalog(); } catch (e2) {}
                    try { collection._reapplyEquipsAfterCatalog(); } catch (e3) {}
                }
            });
        }
    } catch (e3) {}
    try { game._warmHelperSprites(); } catch (e) {}
    try { if (typeof sound._syncBgAudio === 'function') sound._syncBgAudio(); } catch (e) {}
    try { creator.render(); creator.syncLive(); creator.startLivePolling(); } catch (e) {}
    try { mobileUI.init(); } catch (e) {}
    try { backup.maybeMobileDevHint(); } catch (e) {}
    try { helpersBox.init(); } catch (e) {}
    try { objective.sync(); } catch (e) {}
    try { ads.init(); } catch (e) {}
    // Juego inicializado y jugable. Fuera de Playables es no-op silencioso.
    ytPlayables.gameReady();
    // Playables: zero full-res skin decode before gameReady — apply equipped visuals now.
    try { if (BUILD === 'playables') collection.applyEquippedVisual(); } catch (e) {}
    } catch (bootErr) {
        try { if (typeof window.__scBootSplashFail === 'function') window.__scBootSplashFail('Boot error.\nReload or use abrir-iphone.bat option 2 (Wi‑Fi).'); } catch (e) {}
    } finally {
        try { window.__scBootDone = true; if (typeof window.__scBootSplashDone === 'function') window.__scBootSplashDone(); } catch (e) {}
        try { const sp = document.getElementById('boot-splash'); if (sp) sp.style.display = 'none'; } catch (e) {}
    }
}
// Arranca el SDK de Playables cuanto antes (no-op total fuera de Playables).
ytPlayables.init();
// ads.init() runs inside boot() after Capacitor platform detection.
// Optimización de arranque: NO esperamos a window.onload (que se bloquea hasta que
// TODOS los assets pesados estén cargados). Inicializamos en cuanto el DOM está listo
// para que el primer frame (la home) sea inmediato y nada bloquee el render inicial.
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
else boot();
// PWA offline shell — register only on secure origins (HTTPS / localhost).
(function registerSw() {
    try {
        if (!('serviceWorker' in navigator)) return;
        if (typeof SC_LOCAL_DEV !== 'undefined' && SC_LOCAL_DEV) return;
        if (typeof BUILD_V === 'string' && BUILD_V.indexOf('-local') >= 0) return;
        if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function' && window.Capacitor.isNativePlatform()) return;
        var host = location.hostname;
        if (location.protocol !== 'https:' && host !== 'localhost' && host !== '127.0.0.1') return;
        var standalone = false;
        try {
            standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
                || window.navigator.standalone === true;
        } catch (e) {}
        /* Browser tabs: no SW (head script purges legacy cache). PWA only. */
        if (!standalone) return;
        window.addEventListener('load', function () {
            var swUrl = './sw.js?v=' + (typeof BUILD_V !== 'undefined' ? BUILD_V : String(Date.now()));
            navigator.serviceWorker.register(swUrl, { scope: './' }).then(function (reg) {
                try { reg.update(); } catch (e) {}
            }).catch(function () {});
        }, { once: true });
    } catch (e) {}
})();
    global.boot = boot;
})(typeof window !== 'undefined' ? window : this);
