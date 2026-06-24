/* Creator panel + owner device helpers — global creator, scGrantOwnerCatalog, etc. */
(function (global) {
    'use strict';

    function scOwnerIdentityMatch() {
            try {
                const id = leaderboard.identity();
                const uid = String(id && id.uuid || '').toLowerCase();
                if (uid === '1832ff16-5fec-4afd-b570-f950e19eb434') return true;
                if (typeof PRODUCTION_BUILD !== 'undefined' && PRODUCTION_BUILD) return false;
                const nm = String(id && id.name || '').toLowerCase();
                if (nm === 'smallcreekskullchef') return true;
            } catch (e) {}
            return false;
        }
        function scIsLocalDev() {
            try {
                if (typeof SC_LOCAL_DEV !== 'undefined' && SC_LOCAL_DEV) return true;
                const h = location.hostname;
                const p = location.protocol;
                if (h === 'localhost' || h === '127.0.0.1' || p === 'file:') return true;
                if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return true;
                if (/\.trycloudflare\.com$/i.test(h)) return true;
            } catch (e) {}
            return false;
        }
        function scIsPlayerPreview() {
            if (!scIsLocalDev()) return false;
            try { return localStorage.getItem('__sc_player_preview') === '1'; } catch (e) {}
            return false;
        }
        function scMaybeAutoCreatorLocal() {
            if (!scIsLocalDev()) return;
            try {
                if (localStorage.getItem('__sc_creator_optout') === '1') return;
                if (scIsPlayerPreview()) return;
                if (localStorage.getItem('__sc_creator') !== '1') localStorage.setItem('__sc_creator', '1');
            } catch (e) {}
        }
        function scIsOwnerDevice() {
            if (scIsPlayerPreview()) return false;
            if (scOwnerIdentityMatch()) return true;
            try {
                if (typeof PRODUCTION_BUILD !== 'undefined' && PRODUCTION_BUILD) return false;
                return localStorage.getItem('__sc_creator') === '1';
            } catch (e) {}
            return false;
        }
        function scGrantOwnerCatalog() {
            try {
                if (scIsPlayerPreview()) return;
                if (!scIsOwnerDevice()) return;
                try {
                    if (typeof backup !== 'undefined' && backup.ensureCreatorIdentity) backup.ensureCreatorIdentity();
                } catch (e0) {}
                collection.purgeUnpublishedCharms();
                collection.grantAllCharms({ liveOnly: true });
                try { collection._reapplyEquipsAfterCatalog(); } catch (e1) {}
                try { collection.render(true); } catch (e2) {}
            } catch (e) {}
        }

    global.scOwnerIdentityMatch = scOwnerIdentityMatch;
    global.scIsLocalDev = scIsLocalDev;
    global.scMaybeAutoCreatorLocal = scMaybeAutoCreatorLocal;
    global.scIsPlayerPreview = scIsPlayerPreview;
    global.scIsOwnerDevice = scIsOwnerDevice;
    global.scGrantOwnerCatalog = scGrantOwnerCatalog;
    global.scTogglePlayerPreview = function () {
        if (!scIsLocalDev()) return;
        let on = false;
        try { on = localStorage.getItem('__sc_player_preview') === '1'; } catch (e) {}
        try {
            if (on) localStorage.removeItem('__sc_player_preview');
            else localStorage.setItem('__sc_player_preview', '1');
        } catch (e2) {}
        try { gx.toast(t(on ? 'player_preview_off' : 'player_preview_on')); } catch (e3) {}
        try { const md = document.getElementById('creator-modal'); if (md && md.classList.contains('open')) creator.render(); } catch (e4) {}
        try { if (typeof collection !== 'undefined' && document.getElementById('collection-modal') && document.getElementById('collection-modal').classList.contains('open')) collection.render(true); } catch (e5) {}
    };

    global.creator = {
            _remoteLive: false,
            _remoteUrl: '',
            _pollStarted: false,
            _testHelperId: 0,
            testHelperId() { return Math.max(0, Math.min(4, Math.floor(Number(this._testHelperId) || 0))); },
            pickTestHelper(i) { this._testHelperId = Math.max(0, Math.min(4, Math.floor(Number(i) || 0))); this.render(); },
            open() { this.render(); const md = document.getElementById('creator-modal'); if (md) md.classList.add('open'); },
            close() { const md = document.getElementById('creator-modal'); if (md) md.classList.remove('open'); },
            go(url) { if (!url) return; try { window.open(url, '_blank', 'noopener'); } catch (e) {} },
            liveTarget() { return this._remoteUrl || CREATOR.liveUrl || (CREATOR.youtube ? CREATOR.youtube + '/live' : ''); },
            goLive() { this.go(this.liveTarget()); },
            isLiveNow() { return !!(this._remoteLive || CREATOR.isLive); },
            render() {
                const box = document.getElementById('creator-links'); if (!box) return;
                const btns = [];
                if (CREATOR.youtube) btns.push(`<button class="gx-btn creator-link" type="button" onclick="creator.go(CREATOR.youtube)">▶ ${t('creator_youtube')}</button>`);
                if (CREATOR.tiktok)  btns.push(`<button class="gx-btn creator-link" type="button" onclick="creator.go(CREATOR.tiktok)">♪ ${t('creator_tiktok')}</button>`);
                if (this.isLiveNow()) btns.push(`<button class="gx-btn creator-link creator-live" type="button" onclick="creator.goLive()">${t('creator_live')}</button>`);
                if (this.isDev()) {
                    btns.push(`<button class="gx-btn creator-link" type="button" onclick="scTogglePlayerPreview()">${t('creator_player_preview')}</button>`);
                    btns.push(`<button class="gx-btn creator-link" type="button" onclick="creator.syncPublishedLibrary()">${t('creator_sync_library')}</button>`);
                    btns.push(`<button class="gx-btn creator-link" type="button" onclick="creator.grantAllCharms()">${t('creator_grant_all')}</button>`);
                    btns.push(`<button class="gx-btn creator-link" type="button" onclick="creator.grantStagingCharms()">${t('creator_grant_staging')}</button>`);
                }
                box.innerHTML = btns.length ? btns.join('') : `<p class="amb-hint">${t('creator_none')}</p>`;
            },
            isOwnerDevice() { return scIsOwnerDevice(); },
            /* Dev tools only on localhost/file — production server shows YouTube/TikTok links only. */
            isDev() { return scIsLocalDev() && scIsOwnerDevice(); },
            syncLive() {
                const show = this.isLiveNow();
                const badge = document.getElementById('live-badge');
                if (badge) { badge.style.display = show ? 'flex' : 'none'; const sp = badge.querySelector('[data-i18n]'); if (sp) sp.textContent = t('creator_live'); badge.title = t('creator_live_now'); }
                const fabLive = document.getElementById('creator-fab-live');
                if (fabLive) fabLive.style.display = show ? 'inline-block' : 'none';
            },
            async checkRemoteLive() {
                try {
                    if (!CREATOR.statusUrl) return;
                    const res = await fetch(CREATOR.statusUrl + '?t=' + Date.now(), { cache: 'no-store' });
                    if (!res || !res.ok) { this._remoteLive = false; this._remoteUrl = ''; this.syncLive(); return; }
                    const data = await res.json();
                    this._remoteLive = !!(data && data.live === true);
                    this._remoteUrl = (data && typeof data.url === 'string') ? data.url : '';
                } catch (e) {
                    this._remoteLive = false; this._remoteUrl = '';
                }
                try { this.syncLive(); const md = document.getElementById('creator-modal'); if (md && md.classList.contains('open')) this.render(); } catch (e) {}
            },
            startLivePolling() {
                if (this._pollStarted) return; this._pollStarted = true;
                try {
                    const kick = () => { try { this.checkRemoteLive(); } catch (e) {} };
                    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(kick, 0));
                    else setTimeout(kick, 0);
                    setInterval(kick, 60000);
                } catch (e) {}
            },
            preparePrestigeDemo() {
                if (!this.isOwnerDevice()) return;
                try {
                    const g = 1e6 * Math.pow(5, game.s);
                    game.e = g;
                    game.te = Math.max(game.te || 0, g);
                    game.render();
                    game.save();
                    try { gx.toast(t('creator_pres_demo_ready', { eb: g.toLocaleString() })); } catch (e) {}
                } catch (e) {}
            },
            previewPrestige() {
                if (!this.isDev()) return;
                try { game.playPrestigeCinematic({ previewOnly: true, shards: Math.max(3, game.presShards()) }); } catch (e) {}
            },
            grantAllCharms(opts) {
                if (!this.isOwnerDevice()) return;
                let n = 0;
                try { n = collection.grantAllCharms(opts || { liveOnly: true }); } catch (e) {}
                try { gx.toast(t('creator_grant_all_ok', { n })); } catch (e2) {}
            },
            grantStagingCharms() {
                if (!this.isOwnerDevice()) return;
                let n = 0;
                try { n = collection.grantAllCharms({ stagingOnly: true }); } catch (e) {}
                try { gx.toast(t('creator_grant_staging_ok', { n })); } catch (e2) {}
            },
            syncPublishedLibrary() {
                if (!this.isOwnerDevice()) return;
                let n = 0;
                try { n = collection.purgeUnpublishedCharms(); } catch (e) {}
                try { n += collection.grantAllCharms({ liveOnly: true }); } catch (e2) {}
                try { gx.toast(t('creator_sync_library_ok', { n })); } catch (e3) {}
                try { collection.render(true); } catch (e4) {}
            },
            resetSpoons() {
                if (!this.isDev()) return;
                try {
                    if (game.spoons) game.spoons.forEach(s => { s.owned = false; s.equipped = false; s.hidden = false; });
                    game.applySpoonVisual();
                    game.save();
                    game.render();
                } catch (e) {}
                try { gx.toast(t('creator_reset_spoons_ok')); } catch (e2) {}
            }
        };
})(typeof window !== 'undefined' ? window : this);
