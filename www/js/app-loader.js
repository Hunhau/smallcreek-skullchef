/* App script loader — sc-shell-v3. Browser tabs: purge SW/caches BEFORE any game JS. */
(function (global) {
    'use strict';

    var BUILD = 'build-349';

    var SCRIPTS = [
        'js/build-target.js',
        'js/balance-config.js',
        'js/visitors.js',
        'js/shop-pc.js',
        'js/events.js',
        'js/soft-events.js',
        'js/bubble.js',
        'js/cauldron-icon.js',
        'js/coll-origin.js',
        'js/yt-playables.js',
        'js/cloud-save.js',
        'js/ad-overlay.js',
        'js/rewards.js',
        'js/i18n.js',
        'js/save-migrate.js',
        'js/gx.js',
        'js/privacy-gate.js',
        'js/cloud-sync.js',
        'js/backup.js',
        'js/store-tier.js',
        'js/founder-beta.js',
        'js/visual-theme.js',
        'js/decor.js',
        'js/quests.js',
        'js/achievements.js',
        'js/achievements-providers.js',
        'js/soup-menu.js',
        'js/weekly-challenges.js',
        'js/helper-team.js',
        'js/chef-mood.js',
        'js/login-streak.js',
        'js/offline.js',
        'js/farm.js',
        'js/sound.js',
        'js/ambient.js',
        'js/music.js',
        'js/creator.js',
        'js/prix.js',
        'js/soup-skirmish.js',
        'js/objective.js',
        'js/angel-tree.js',
        'js/tutorial.js',
        'js/quality.js',
        'js/fullscreen.js',
        'js/landscape-gate.js',
        'js/mobile-ui.js',
        'js/helpers-box.js',
        'js/home.js',
        'js/pause-menu.js',
        'js/guide.js',
        'js/hud-chips.js',
        'js/item-bonus.js',
        'assets/skins/catalog.js',
        'assets/atlas_manifest.js',
        'js/atlas.js',
        'js/collection.js',
        'js/place-tool.js',
        'js/soup-evolution.js',
        'js/game.js',
        'js/leaderboard-client.js',
        'js/lb-ui.js',
        'js/rewards-ui.js',
        'js/build-tag.js',
        'js/boot.js'
    ];

    function isLocal() {
        try {
            var p = location.protocol, h = location.hostname || '';
            if (p === 'file:') return true;
            if (h === 'localhost' || h === '127.0.0.1') return true;
            return /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
        } catch (e) { return false; }
    }

    function isStandalone() {
        try {
            return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches)
                || global.navigator.standalone === true;
        } catch (e) { return false; }
    }

    function isMobileBrowser() {
        try {
            if (isStandalone() || isLocal()) return false;
            var w = global.innerWidth || 9999;
            if (global.matchMedia && global.matchMedia('(pointer: coarse)').matches && w <= 980) return true;
            if (global.matchMedia && global.matchMedia('(orientation: portrait) and (max-width: 768px)').matches) return true;
        } catch (e) {}
        return false;
    }

    function purgeSw() {
        if (!('serviceWorker' in navigator)) return Promise.resolve();
        return navigator.serviceWorker.getRegistrations().then(function (rs) {
            return Promise.all(rs.map(function (r) { return r.unregister(); }));
        }).catch(function () {});
    }

    function purgeCaches() {
        if (!global.caches) return Promise.resolve();
        return caches.keys().then(function (ks) {
            return Promise.all(ks.filter(function (k) {
                return k.indexOf('skullchef') === 0;
            }).map(function (k) { return caches.delete(k); }));
        }).catch(function () {});
    }

    function purgeAll() { return Promise.all([purgeSw(), purgeCaches()]); }

    function loadScript(src, cacheBust) {
        return new Promise(function (resolve) {
            var s = document.createElement('script');
            s.src = src + '?v=' + encodeURIComponent(BUILD) + (cacheBust ? '&_t=' + Date.now() : '');
            s.onload = function () { resolve(true); };
            s.onerror = function () { resolve(false); };
            document.body.appendChild(s);
        });
    }

    function loadSequential(cacheBust) {
        var i = 0;
        function next() {
            if (i >= SCRIPTS.length) return;
            loadScript(SCRIPTS[i++], cacheBust).then(next);
        }
        next();
    }

    function run() {
        var mob = isMobileBrowser();
        if (mob) {
            /* One-at-a-time: parallel inject broke script order on iOS Safari. */
            loadSequential(false);
            return;
        }
        var chain = Promise.resolve();
        if (!isLocal() && !isStandalone()) {
            chain = purgeAll().then(function () { return purgeAll(); });
        }
        chain.then(function () { loadSequential(true); }).catch(function () { loadSequential(true); });
    }

    global.__SC_APP_BUILD = BUILD;
    run();
})(typeof window !== 'undefined' ? window : this);
