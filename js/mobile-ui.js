/* Mobile landscape/portrait UI — sc-shell-v3 */
(function (global) {
    'use strict';

    global.mobileUI = {
        _isStandalone() {
            try { return typeof fullscreen !== 'undefined' && fullscreen.isStandalone && fullscreen.isStandalone(); } catch (e) { return false; }
        },
        isPhone() {
            try {
                const w = window.innerWidth;
                const h = window.innerHeight;
                if (w >= 1024 && h >= 640) return false;
                if (window.matchMedia('(pointer: fine) and (hover: hover)').matches && w >= 960) return false;
                if (window.matchMedia('(orientation: portrait) and (max-width: 768px)').matches) return true;
                if (this._isStandalone()) {
                    if (w <= 768) return true;
                    if (w <= 980 && h <= 680) return true;
                }
                if (!window.matchMedia('(pointer: coarse)').matches) return false;
                if (this._landscapePhone()) return true;
                return false;
            } catch (e) { return false; }
        },
        _toggle(id) {
            try {
                const el = document.getElementById(id);
                if (!el) return;
                const willOpen = !el.classList.contains('m-open');
                this.closeAll();
                if (willOpen) {
                    el.classList.add('m-open');
                    const s = document.getElementById('m-scrim'); if (s) s.classList.add('show');
                }
            } catch (e) {}
        },
        toggleMenu() { this._toggle('side-buttons'); },
        toggleShop() { this._toggle('side-shop'); },
        toggleMinigames() { this._toggle('m-minigame-sheet'); },
        _setBadge(id, on) {
            try { const b = document.getElementById(id); if (b && b.classList.contains('has-badge') !== !!on) b.classList.toggle('has-badge', !!on); } catch (e) {}
        },
        updateLauncherBadges() {
            try {
                let shopReady = false, menuReady = false;
                try {
                    if (typeof game !== 'undefined') {
                        shopReady = (game.cp || []).some(c => { try { return game.cardPriceDisplay(c).affordable; } catch (e) { return false; } });
                        if (!shopReady && game.spoons) shopReady = game.spoons.some(s => { try { return !s.owned && game.e >= game.effSpoonCost(s); } catch (e) { return false; } });
                        if (!shopReady && game.hats) shopReady = game.hats.some(h => { try { return !h.owned && game.e >= game.effHatCost(h); } catch (e) { return false; } });
                    }
                } catch (e) {}
                try {
                    if (typeof rewardSystem !== 'undefined' && typeof rewardsUI !== 'undefined' && typeof ads !== 'undefined' && ads.isAvailable && ads.isAvailable()) {
                        menuReady = (rewardsUI.LIST || []).some(id => { try { return rewardSystem.canClaim(id); } catch (e) { return false; } });
                    }
                } catch (e) {}
                try { if (!menuReady && typeof game !== 'undefined' && game.daily && game.daily.missions) menuReady = game.daily.missions.some(m => m.done && !m.claimed); } catch (e) {}
                try { if (!menuReady && typeof game !== 'undefined') menuReady = game.e >= balancePrestigeGoal(game.s); } catch (e) {}
                try { if (!menuReady && typeof game !== 'undefined' && game.treeDefs) menuReady = game.treeDefs.some(def => { const lv = game.tree[def.k]; const cost = (typeof atree !== 'undefined' && atree.cost) ? atree.cost(def) : (def.cb + lv); return (def.inf || lv < def.mx) && game.as >= cost; }); } catch (e) {}
                this._setBadge('m-shop-btn', shopReady);
                this._setBadge('m-menu-btn', menuReady);
            } catch (e) {}
        },
        _landscapePhone() {
            try {
                if (!window.matchMedia('(orientation: landscape)').matches) return false;
                const h = window.innerHeight;
                const w = window.innerWidth;
                if (w > 980) return false;
                const fsActive = typeof fullscreen !== 'undefined' && fullscreen.isActive && fullscreen.isActive();
                const maxH = fsActive ? 680 : 600;
                if (window.matchMedia('(pointer: coarse)').matches && h <= maxH) return true;
                if (this._isStandalone() && h <= 680) return true;
                return false;
            } catch (e) { return false; }
        },
        _portraitPhone() {
            try {
                const w = window.innerWidth;
                const h = window.innerHeight;
                if (w <= 768 && h > w) return true;
                return window.matchMedia('(orientation: portrait) and (max-width: 768px)').matches;
            } catch (e) { return false; }
        },
        syncMobileLaunchers() {
            try {
                const phone = this.isPhone();
                const launch = document.getElementById('m-launch');
                if (launch) launch.style.display = phone ? 'flex' : 'none';
                try { if (typeof __scPaintBuildTag === 'function') __scPaintBuildTag(); } catch (e) {}
                const toggle = document.getElementById('helpers-toggle');
                if (toggle) toggle.style.display = phone ? 'flex' : 'none';
                const scm = document.getElementById('shop-close-m');
                if (scm) scm.style.display = phone ? 'flex' : 'none';
            } catch (e) {}
        },
        syncVisualViewport() {
            try {
                const html = document.documentElement;
                const standalone = this._isStandalone();
                const vv = window.visualViewport;
                if (!this.isPhone() || standalone || !vv) {
                    html.classList.remove('vv-browser');
                    this._vvKey = '';
                    ['--vv-h', '--vv-w', '--vv-top', '--vv-left'].forEach(function (p) { html.style.removeProperty(p); });
                    return;
                }
                const key = Math.round(vv.height) + '|' + Math.round(vv.width) + '|' + Math.round(vv.offsetTop);
                if (this._vvKey === key) return;
                this._vvKey = key;
                html.classList.add('vv-browser');
                html.style.setProperty('--vv-h', vv.height + 'px');
                html.style.setProperty('--vv-w', vv.width + 'px');
                html.style.setProperty('--vv-top', vv.offsetTop + 'px');
                html.style.setProperty('--vv-left', vv.offsetLeft + 'px');
                if (vv.offsetTop > 1) { try { window.scrollTo(0, 0); } catch (e) {} }
            } catch (e) {}
        },
        reflow() {
            try {
                if (!this.isPhone()) {
                    const html = document.documentElement;
                    html.classList.remove('portrait-mode', 'vv-browser');
                    ['--vv-h', '--vv-w', '--vv-top', '--vv-left'].forEach(function (p) { html.style.removeProperty(p); });
                    const sc = document.getElementById('sticky-center');
                    if (sc) {
                        sc.style.left = sc.style.top = sc.style.bottom = '';
                        sc.style.transform = sc.style.transformOrigin = '';
                    }
                    try {
                        if (typeof game !== 'undefined') {
                            game.syncCompanionLayout();
                            game.ensureReservedHelperSlot();
                            game.syncMinigameButtons();
                        }
                    } catch (e) {}
                    this.syncMobileLaunchers();
                    return;
                }
                const html = document.documentElement;
                html.classList.toggle('portrait-mode', this._portraitPhone());
                this.syncMobileLaunchers();
                this.syncVisualViewport();
                this.fitScene();
                this.syncLandscapeLeftHud();
                this.syncPortraitHudAnchors();
                try {
                    if (typeof game !== 'undefined') {
                        game.syncCompanionLayout();
                        game.syncMinigameButtons();
                    }
                } catch (e) {}
            } catch (e) {}
        },
        maybeBrowserLandscapeHint() {
            try {
                if (!this._landscapePhone()) return;
                if (this._isStandalone()) return;
                if (sessionStorage.getItem('sc_vv_hint')) return;
                sessionStorage.setItem('sc_vv_hint', '1');
                if (typeof gx !== 'undefined') gx.toast(t('mobile_browser_landscape_hint'));
            } catch (e) {}
        },
        _portraitAnchorBelowChips() {
            try {
                const band = document.getElementById('hud-top-band');
                const stack = document.getElementById('hud-status-stack');
                if (!band) return null;
                let bottom = band.getBoundingClientRect().bottom;
                if (stack) {
                    const sr = stack.getBoundingClientRect();
                    if (sr.height > 2) bottom = Math.max(bottom, sr.bottom);
                    stack.querySelectorAll(':scope > *').forEach(function (chip) {
                        try {
                            if (chip.style.display === 'none') return;
                            const cr = chip.getBoundingClientRect();
                            if (cr.height > 1) bottom = Math.max(bottom, cr.bottom);
                        } catch (e) {}
                    });
                }
                return Math.round(bottom + 10);
            } catch (e) { return null; }
        },
        syncPortraitHudAnchors() {
            this.syncAltarBelowHud();
            this.syncPortraitHelperColumn();
        },
        syncPortraitHelperColumn() {
            try {
                const col = document.getElementById('companion-column');
                const toggle = document.getElementById('helpers-toggle');
                if (!this._portraitPhone()) {
                    if (col) { col.style.top = ''; delete col.__portraitTop; }
                    if (toggle) { toggle.style.top = ''; delete toggle.__portraitTop; }
                    return;
                }
                const anchorTop = this._portraitAnchorBelowChips();
                if (anchorTop == null) return;
                if (toggle) {
                    if (toggle.__portraitTop !== anchorTop) {
                        toggle.style.top = anchorTop + 'px';
                        toggle.__portraitTop = anchorTop;
                    }
                }
                if (col) {
                    const th = (toggle && toggle.offsetHeight) ? toggle.offsetHeight : 38;
                    const colTop = anchorTop + th + 6;
                    if (col.__portraitTop !== colTop) {
                        col.style.top = colTop + 'px';
                        col.__portraitTop = colTop;
                    }
                }
            } catch (e) {}
        },
        syncAltarBelowHud() {
            try {
                const altar = document.getElementById('altar-panel');
                const hud = document.getElementById('hud');
                if (!altar || !hud) return;
                if (this._landscapePhone()) {
                    if (altar.__hudBelowTop != null) {
                        altar.style.top = '';
                        delete altar.__hudBelowTop;
                    }
                    return;
                }
                if (this._portraitPhone()) {
                    const anchorTop = this._portraitAnchorBelowChips();
                    if (anchorTop == null) return;
                    if (altar.__hudBelowTop !== anchorTop) {
                        altar.style.top = anchorTop + 'px';
                        altar.__hudBelowTop = anchorTop;
                    }
                    return;
                }
                const hr = hud.getBoundingClientRect();
                if (hr.height < 4) return;
                const gw = document.getElementById('game-wrapper');
                const base = gw ? gw.getBoundingClientRect().top : 0;
                const top = Math.max(0, Math.round(hr.top - base));
                if (altar.__hudBelowTop !== top) {
                    altar.style.top = top + 'px';
                    altar.__hudBelowTop = top;
                }
            } catch (e) {}
        },
        syncLandscapeLeftHud() {
            try {
                const lore = document.getElementById('lore-scroll');
                const stack = document.getElementById('hud-status-stack');
                if (!this._landscapePhone()) {
                    if (lore) { lore.style.top = ''; lore.style.transform = ''; lore.style.maxHeight = ''; }
                    if (stack) { stack.style.top = ''; delete stack.__landscapeTop; }
                    return;
                }
                const hud = document.getElementById('hud');
                if (hud && lore) {
                    const hr = hud.getBoundingClientRect();
                    if (hr.height > 4) {
                        lore.style.top = (hr.top + hr.height * 0.5) + 'px';
                        lore.style.transform = 'translateY(-50%)';
                        lore.style.maxHeight = Math.max(24, Math.round(hr.height - 4)) + 'px';
                    }
                }
                if (stack) {
                    const toggle = document.getElementById('helpers-toggle');
                    if (!toggle) return;
                    const tr = toggle.getBoundingClientRect();
                    if (tr.height < 2) return;
                    const anchorTop = Math.round(tr.top);
                    if (stack.__landscapeTop !== anchorTop) {
                        stack.style.top = anchorTop + 'px';
                        stack.__landscapeTop = anchorTop;
                    }
                }
            } catch (e) {}
        },
        closeAll() {
            try {
                ['side-buttons', 'side-shop', 'm-minigame-sheet'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.remove('m-open'); });
                const s = document.getElementById('m-scrim'); if (s) s.classList.remove('show');
            } catch (e) {}
        },
        syncMinigameLauncher() {
            try {
                this.syncMobileLaunchers();
                const btn = document.getElementById('m-minigame-btn');
                if (!btn) return;
                const phone = this.isPhone();
                const unlocked = typeof game !== 'undefined' && game.minigameUnlocked && game.minigameUnlocked();
                btn.style.display = (phone && unlocked) ? 'flex' : 'none';
                if (!phone || !unlocked) {
                    const sheet = document.getElementById('m-minigame-sheet');
                    if (sheet) sheet.classList.remove('m-open');
                    return;
                }
                const prixBtn = document.getElementById('m-prix-btn');
                const skBtn = document.getElementById('m-skirmish-btn');
                const prixLab = prixBtn && prixBtn.querySelector('.m-minigame-label');
                const skLab = skBtn && skBtn.querySelector('.m-minigame-label');
                if (prixBtn && prixLab) {
                    if (game.cd > 0) {
                        const mm = String(Math.floor(game.cd / 60)).padStart(2, '0');
                        const ss = String(game.cd % 60).padStart(2, '0');
                        prixLab.textContent = t('prix_cd', { mm: mm, ss: ss });
                        prixBtn.disabled = true;
                        prixBtn.style.opacity = '0.55';
                    } else {
                        prixLab.textContent = t('enter_prix');
                        prixBtn.disabled = false;
                        prixBtn.style.opacity = '1';
                    }
                }
                if (skBtn && skLab) {
                    if (game.scd > 0) {
                        const mm = String(Math.floor(game.scd / 60)).padStart(2, '0');
                        const ss = String(game.scd % 60).padStart(2, '0');
                        skLab.textContent = t('skirmish_cd', { mm: mm, ss: ss });
                        skBtn.disabled = true;
                        skBtn.style.opacity = '0.55';
                    } else {
                        skLab.textContent = t('skirmish_btn');
                        skBtn.disabled = false;
                        skBtn.style.opacity = '1';
                    }
                }
                this._setBadge('m-minigame-btn', game.cd <= 0 || game.scd <= 0);
            } catch (e) {}
        },
        fitScene() {
            try {
                const sc = document.getElementById('sticky-center');
                if (!sc) return;
                const resetScenePos = () => { sc.style.left = ''; sc.style.top = ''; sc.style.bottom = ''; sc.style.transformOrigin = ''; sc.style.transform = ''; };
                if (!this.isPhone()) { resetScenePos(); return; }
                const stage = document.getElementById('main-stage');
                if (!stage) return;
                const r = stage.getBoundingClientRect();
                if (!r.width || !r.height) {
                    setTimeout(() => this.fitScene(), 120);
                    return;
                }
                const DW = 1350, DH = 1240, FIT_W = 0.90, FIT_H = 0.90, DROP_Y = 0.05;
                let s = Math.min((r.width * FIT_W) / DW, (r.height * FIT_H) / DH);
                if (!isFinite(s) || s <= 0) return;
                s = Math.max(0.22, Math.min(s, 1));
                const portrait = this._portraitPhone();
                if (portrait) {
                    sc.style.left = '50%';
                    sc.style.top = '68%';
                    sc.style.bottom = 'auto';
                    sc.style.transformOrigin = 'center center';
                    const ps = Math.max(0.22, Math.min((r.width * 0.78) / DW, 0.38));
                    sc.style.transform = 'translate(-50%, -50%) scale(' + ps + ')';
                    this.syncPortraitHelperColumn();
                    return;
                }
                sc.style.left = '50%';
                sc.style.bottom = 'auto';
                sc.style.top = '';
                sc.style.transformOrigin = '';
                const dy = Math.round(r.height * DROP_Y);
                sc.style.transform = 'translate(-50%, calc(-50% + ' + dy + 'px)) scale(' + s + ')';
                this.syncLandscapeLeftHud();
            } catch (e) {}
        },
        init() {
            try {
                let reflowPending = null;
                const scheduleReflow = () => {
                    if (reflowPending != null) return;
                    reflowPending = requestAnimationFrame(() => {
                        reflowPending = null;
                        try { mobileUI.reflow(); } catch (e) {}
                    });
                };
                window.addEventListener('pageshow', scheduleReflow);
                document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleReflow(); });
                window.addEventListener('resize', scheduleReflow);
                window.addEventListener('load', scheduleReflow);
                window.addEventListener('orientationchange', () => {
                    setTimeout(scheduleReflow, 60);
                    setTimeout(scheduleReflow, 280);
                    setTimeout(() => this.maybeBrowserLandscapeHint(), 400);
                });
                try {
                    const vv = window.visualViewport;
                    if (vv) {
                        vv.addEventListener('resize', scheduleReflow);
                        vv.addEventListener('scroll', scheduleReflow);
                    }
                } catch (e) {}
                try {
                    const syncHelpers = () => {
                        try { game.syncCompanionLayout(); game.ensureReservedHelperSlot(); } catch (e) {}
                        try { mobileUI.syncLandscapeLeftHud(); mobileUI.syncPortraitHelperColumn(); mobileUI.syncAltarBelowHud(); } catch (e) {}
                    };
                    window.addEventListener('resize', syncHelpers);
                    window.addEventListener('orientationchange', () => { setTimeout(syncHelpers, 60); setTimeout(syncHelpers, 280); });
                } catch (e) {}
                const tray = document.getElementById('side-buttons');
                if (tray) tray.addEventListener('click', (e) => {
                    try {
                        const fab = e.target && e.target.closest && e.target.closest('.side-fab');
                        if (!fab) return;
                        if (fab.id === 'prix-fab' || fab.id === 'skirmish-fab') {
                            setTimeout(() => this.closeAll(), 0);
                            return;
                        }
                        this.closeAll();
                    } catch (er) {}
                });
                const skSheet = document.getElementById('m-minigame-sheet');
                if (skSheet) skSheet.addEventListener('click', (e) => {
                    try {
                        const row = e.target && e.target.closest && e.target.closest('.m-minigame-row');
                        if (!row || row.disabled) return;
                        setTimeout(() => this.closeAll(), 0);
                    } catch (er) {}
                });
                const skBtn = document.getElementById('m-skirmish-btn');
                if (skBtn && !skBtn._skBound) {
                    skBtn._skBound = true;
                    skBtn.addEventListener('pointerup', (e) => {
                        if (skBtn.disabled) return;
                        e.preventDefault();
                        e.stopPropagation();
                        try { skirmish.open(); } catch (err) {}
                    }, { passive: false });
                }
                scheduleReflow();
                setTimeout(scheduleReflow, 300);
                setTimeout(() => this.maybeBrowserLandscapeHint(), 800);
            } catch (e) {}
        }
    };
})(typeof window !== 'undefined' ? window : this);
