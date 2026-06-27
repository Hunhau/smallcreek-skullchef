/* App script loader — sc-shell-v3. Desktop browser tabs: purge SW/caches BEFORE game JS. */
(function (global) {
    'use strict';

    var BUILD = 'build-359';

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

    function isFastBoot() {
        return isMobileBrowser() || isStandalone() || isLocal();
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

    function reportProgress(i, total) {
        try {
            var msg = document.getElementById('boot-splash-msg');
            if (!msg) return;
            var pct = Math.min(99, Math.round((100 * i) / Math.max(1, total)));
            msg.textContent = 'Loading… ' + pct + '%';
        } catch (e) {}
    }

    function loadScript(src) {
        return new Promise(function (resolve) {
            var s = document.createElement('script');
            s.src = src + '?v=' + encodeURIComponent(BUILD);
            s.onload = function () { resolve(true); };
            s.onerror = function () { resolve(false); };
            document.body.appendChild(s);
        });
    }

    function loadSequential() {
        var i = 0;
        var total = SCRIPTS.length;
        reportProgress(0, total);
        function next() {
            if (i >= total) {
                reportProgress(total, total);
                return;
            }
            var idx = i++;
            loadScript(SCRIPTS[idx]).then(function () {
                reportProgress(idx + 1, total);
                next();
            });
        }
        next();
    }

    function run() {
        if (isLocal()) {
            loadSequential();
            return;
        }
        fetch('version.json?t=' + Date.now(), { cache: 'no-store' })
            .then(function (r) { return r.json(); })
            .catch(function () { return null; })
            .then(function (vd) {
                if (vd && vd.v && vd.v !== BUILD) {
                    location.replace((location.pathname || '/') + '?_sv=' + encodeURIComponent(vd.v) + '&_t=' + Date.now());
                    return;
                }
                var chain = Promise.resolve();
                if (!isFastBoot()) {
                    chain = purgeAll().then(function () { return purgeAll(); });
                }
                chain.then(loadSequential).catch(loadSequential);
            });
    }

    global.__SC_APP_BUILD = BUILD;
    run();
})(typeof window !== 'undefined' ? window : this);
