/* Core game state + loop (build-309). */
(function (global) {
    'use strict';

const game = {
    e:0, te:0, l:0, s:0, c:0, p:false, f:0, cl:false, m:1, cd:0, scd:0, buyMode:1, defaultSpoonImg:'assets/img/spoon.png', _inited:false, logicTick:null, uiTick:null, saveTick:null, _floatNodes:[], _spoonAnimating:false, _spoonUiKey:'', _hatAnimating:false, _hatUiKey:'', _steamIdleTick:0, _dispScore:0, _autoPartAcc:0, _wave:0, _ballWave:0, _ballSpeed:1, _lastClick:0, soupBalls:[], _rippleNodes:[], _ambientRippleTick:0, _soupRect:null, _surf:null, _stageRect:null, _spoonEl:null, _scoreBoxEl:null, _soupLiquidEl:null, _floatPool:[], _floatIdx:0, _ripplePool:[], _rippleIdx:0, _scorePulseQueued:false, _scorePulseArmed:false, _floatThrottle:0, _floatAcc:0, _clickRippleN:0, _clickGate:0, _canvasDirty:false,
    as:0, lastSeen:0, prevRun:null, bestRunEb:0, playSec:0, loginStreak:0, loginDay:'', vtTheme:'', chefMood:55, prixStreak:0, weekly:null, hb:null, comm:null, boss:null, meta:null, _buffs:[], tree:{caldo:0, manos:0, eco:0, cuchara:0, tiempo:0, aura:0, fortuna:0, eterno:0}, daily:null, ach:{}, rewards:{}, coll:null, farm:null, decor:null, _tampered:false,
    treeDefs: [
        {k:'caldo', mx:20, cb:1},
        {k:'manos', mx:20, cb:1},
        {k:'eco', mx:10, cb:2},
        {k:'cuchara', mx:8, cb:2},
        {k:'tiempo', mx:15, cb:1},
        {k:'aura', mx:20, cb:2},
        {k:'fortuna', mx:10, cb:3},
        // Nodo INFINITO: sumidero permanente de fragmentos (sin tope). El coste crece
        // exponencialmente (cb * cg^nivel) para que sea un objetivo a largo plazo y no
        // se compre en masa. Da un multiplicador global pequeño y permanente por nivel.
        {k:'eterno', mx:Infinity, cb:8, cg:1.5, inf:true}
    ],
    milestoneMsg: ['milestone_coco', 'milestone_bunny', 'milestone_pio', 'milestone_ivan', 'milestone_bongo'],
    cpBaseCost: [20, 125, 1500, 18000, 216000],
    CROWN_HEAD: {
        0: { x: 0.500, y: -0.030, w: 0.24 },
        1: { x: 0.504, y: 0.075, w: 0.20 },
        2: { x: 0.513, y: -0.095, w: 0.24 },
        3: { x: 0.499, y: -0.050, w: 0.18 },
        4: { x: 0.500, y: -0.055, w: 0.20 }
    },
    cp: [
        {id:0, nk:'comp_coco', cs:20, pw:0.02, lv:0, ch:0, im:'assets/img/coco.png'},
        {id:1, nk:'comp_bunny', cs:125, pw:0.1, lv:0, ch:0, im:'assets/img/bunny.png'},
        {id:2, nk:'comp_pio', cs:1500, pw:0.35, lv:0, ch:0, im:'assets/img/pio.png'},
        {id:3, nk:'comp_ivan', cs:18000, pw:3.5, lv:0, ch:0, im:'assets/img/ivan.png'},
        {id:4, nk:'comp_bongo', cs:216000, pw:10, lv:0, ch:0, im:'assets/img/bongo.png'}
    ],
    SOUP_ING_FX_MS: 2600,
    FEED_MILESTONE_EVERY: 4,
    FEED_INGREDIENT_EXTRA: 4,
    FARM_STARTER_STOCK: 30,
    EXTRA_INGREDIENT_RAIN_EVERY: 10,
    // TUNABLE — mouth target on #asset-chef sprite (0–1 fractions of getBoundingClientRect).
    CHEF_MOUTH_ANCHOR: { x: 0.505, y: 0.365, w: 0.12, h: 0.085 },
    CHEF_FEED_FACE_PALETTE: [
        { id: 'red', core: '#ff5050', mid: '#ff8888', filter: 'sepia(0.3) saturate(2.1) hue-rotate(-5deg) brightness(1.14)' },
        { id: 'coral', core: '#ff7f6e', mid: '#ffa898', filter: 'sepia(0.32) saturate(2) hue-rotate(12deg) brightness(1.15)' },
        { id: 'orange', core: '#ff9020', mid: '#ffb850', filter: 'sepia(0.35) saturate(2) hue-rotate(28deg) brightness(1.15)' },
        { id: 'gold', core: '#ffd020', mid: '#ffe060', filter: 'sepia(0.36) saturate(2) hue-rotate(48deg) brightness(1.17)' },
        { id: 'yellow', core: '#ffe838', mid: '#fff070', filter: 'sepia(0.34) saturate(2.05) hue-rotate(65deg) brightness(1.16)' },
        { id: 'lime', core: '#b8ff40', mid: '#d4ff80', filter: 'sepia(0.34) saturate(2.05) hue-rotate(85deg) brightness(1.15)' },
        { id: 'green', core: '#40e88c', mid: '#80f0b0', filter: 'sepia(0.32) saturate(2) hue-rotate(145deg) brightness(1.11)' },
        { id: 'cyan', core: '#50ffd8', mid: '#90ffe8', filter: 'sepia(0.22) saturate(1.9) hue-rotate(170deg) brightness(1.1)' },
        { id: 'azure', core: '#40c8ff', mid: '#80e0ff', filter: 'sepia(0.28) saturate(2.2) hue-rotate(195deg) brightness(1.13)' },
        { id: 'blue', core: '#4682ff', mid: '#80a8ff', filter: 'sepia(0.25) saturate(2.3) hue-rotate(225deg) brightness(1.11)' },
        { id: 'purple', core: '#a070ff', mid: '#c4a0ff', filter: 'sepia(0.24) saturate(2.1) hue-rotate(265deg) brightness(1.12)' },
        { id: 'magenta', core: '#ff40c0', mid: '#ff80d8', filter: 'sepia(0.28) saturate(2.25) hue-rotate(295deg) brightness(1.12)' },
        { id: 'pink', core: '#ff4db8', mid: '#ff80d4', filter: 'sepia(0.26) saturate(2.15) hue-rotate(310deg) brightness(1.14)' },
        { id: 'fuchsia', core: '#dc50ff', mid: '#e880ff', filter: 'sepia(0.28) saturate(2.25) hue-rotate(280deg) brightness(1.12)' }
    ],
    CHEF_FALLBACK_EAT_MS: 2000,
    CHEW_SLICE_MS: 500,
    CHEW_MAX_TOGGLES: 3,
    CHEW_LITE_MAX_TOGGLES: 4,
    CHEF_SRC_CLOSED: 'assets/img/chef.png',
    CHEF_SRC_OPEN: 'assets/img/chef-mouth-open.png',
    SOUP_FX_BUBBLE_MAX: 58,
    SOUP_FX_BUBBLES: {
        ink:     { colors: ['#6b21a8', '#7c3aed', '#a78bfa', '#581c87', '#c4b5fd', '#8b5cf6'], motion: 'swirl',   count: 44, size: [10, 42] },
        shrimp:  { colors: ['#fb7185', '#fda4af', '#f97316', '#fecdd3', '#ff8fab', '#e11d48'], motion: 'rise-pop', count: 48, size: [10, 42] },
        carrot:  { colors: ['#f97316', '#fb923c', '#fdba74', '#fde047', '#ea580c', '#fbbf24'], motion: 'bounce',  count: 42, size: [10, 42] },
        lettuce: { colors: ['#22c55e', '#4ade80', '#86efac', '#6ee7b7', '#bbf7d0', '#10b981'], motion: 'float',   count: 40, size: [10, 40] },
        corn:    { colors: ['#fbbf24', '#fde047', '#fef08a', '#f59e0b', '#fcd34d', '#eab308'], motion: 'bounce',  count: 44, size: [10, 40] },
        yolk:    { colors: ['#fde047', '#fef08a', '#fef9c3', '#fcd34d', '#fffbeb', '#eab308'], motion: 'rise',    count: 42, size: [10, 42] },
        honey:   { colors: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#b45309', '#fde68a'], motion: 'sticky',  count: 40, size: [10, 40] },
        berries: { colors: ['#a855f7', '#ec4899', '#f472b6', '#ef4444', '#7c3aed', '#db2777'], motion: 'rise-pop', count: 46, size: [10, 42] },
        banana:  { colors: ['#fde047', '#facc15', '#fef08a', '#fef3c7', '#eab308', '#fffbeb'], motion: 'wobble',  count: 42, size: [10, 42] },
        coconut: { colors: ['#ffffff', '#fef3c7', '#fde68a', '#d6d3d1', '#a8a29e', '#92400e'], motion: 'swirl',   count: 40, size: [10, 42] }
    },
    // Themed ingredient throws on helper purchase (summon flow). Two variants per cp id; odd level = A, even = B.
    SUMMON_INGREDIENTS: {
        0: { variants: [
            { fx: 'ink', glyphs: ['🦑', '💜'], burstEmojis: ['💜', '✨', '🦑'], count: 4, spread: 30, stagger: 105, startRot: -10, endRot: 110, endScale: 0.94,
                soupFilter: 'saturate(1.45) hue-rotate(248deg) brightness(0.78) contrast(1.12)',
                particleColors: ['#6b21a8', '#581c87', '#a78bfa', '#c4b5fd'],
                rippleTint: { border: 'rgba(167,139,250,0.82)', glow: 'rgba(124,58,237,0.5)' } },
            { fx: 'shrimp', glyphs: ['🦐'], burstEmojis: ['🦐', '💕', '✨'], count: 4, spread: 30, stagger: 105, startRot: -10, endRot: 110, endScale: 0.94,
                soupFilter: 'sepia(0.32) saturate(1.75) hue-rotate(338deg) brightness(1.08)',
                particleColors: ['#fb7185', '#fda4af', '#f97316', '#fecdd3'],
                rippleTint: { border: 'rgba(251,113,133,0.85)', glow: 'rgba(249,115,22,0.45)' } }
        ]},
        1: { variants: [
            { fx: 'carrot', glyphs: ['🥕'], burstEmojis: ['🥕', '🧡', '✨'], count: 5, spread: 32, stagger: 100, startRot: -25, endRot: 130, endScale: 1.0,
                soupFilter: 'sepia(0.38) saturate(1.85) hue-rotate(-6deg) brightness(1.12)',
                particleColors: ['#f97316', '#fb923c', '#fdba74', '#ea580c'],
                rippleTint: { border: 'rgba(251,146,60,0.88)', glow: 'rgba(234,88,12,0.48)' } },
            { fx: 'lettuce', glyphs: ['🥬'], burstEmojis: ['🥬', '💚', '🌿'], count: 5, spread: 32, stagger: 100, startRot: -22, endRot: 128, endScale: 0.98,
                soupFilter: 'sepia(0.2) saturate(1.9) hue-rotate(88deg) brightness(1.08)',
                particleColors: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0'],
                rippleTint: { border: 'rgba(74,222,128,0.85)', glow: 'rgba(34,197,94,0.42)' } }
        ]},
        2: { variants: [
            { fx: 'corn', glyphs: ['🌽'], burstEmojis: ['🌽', '💛', '✨'], count: 5, spread: 30, stagger: 95, startRot: -15, endRot: 125, endScale: 0.99,
                soupFilter: 'sepia(0.48) saturate(1.75) hue-rotate(8deg) brightness(1.16)',
                particleColors: ['#fbbf24', '#fde047', '#fef08a', '#f59e0b'],
                rippleTint: { border: 'rgba(253,224,71,0.88)', glow: 'rgba(251,191,36,0.5)' } },
            { fx: 'yolk', glyphs: ['💛', '✨'], burstEmojis: ['💛', '⭐', '✨'], count: 5, spread: 28, stagger: 90, startRot: -12, endRot: 120, endScale: 0.94,
                soupFilter: 'sepia(0.52) saturate(2.05) hue-rotate(16deg) brightness(1.26)',
                particleColors: ['#fde047', '#fef08a', '#fef9c3', '#eab308'],
                rippleTint: { border: 'rgba(254,240,138,0.9)', glow: 'rgba(234,179,8,0.55)' } }
        ]},
        3: { variants: [
            { fx: 'honey', glyphs: ['🍯'], burstEmojis: ['🍯', '🍯', '✨'], count: 5, spread: 32, stagger: 100, startRot: -18, endRot: 135, endScale: 0.99,
                soupFilter: 'sepia(0.58) saturate(1.85) hue-rotate(-2deg) brightness(1.14)',
                particleColors: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d'],
                rippleTint: { border: 'rgba(251,191,36,0.88)', glow: 'rgba(217,119,6,0.5)' } },
            { fx: 'berries', glyphs: ['🫐', '🍓'], burstEmojis: ['🫐', '🍓', '💜'], count: 5, spread: 32, stagger: 100, startRot: -18, endRot: 135, endScale: 0.99,
                soupFilter: 'sepia(0.3) saturate(1.65) hue-rotate(312deg) brightness(1.06)',
                particleColors: ['#a855f7', '#ec4899', '#f472b6', '#7c3aed'],
                rippleTint: { border: 'rgba(236,72,153,0.85)', glow: 'rgba(168,85,247,0.48)' } }
        ]},
        4: { variants: [
            { fx: 'banana', glyphs: ['🍌'], burstEmojis: ['🍌', '💛', '⭐'], count: 5, spread: 34, stagger: 110, startRot: -20, endRot: 140, endScale: 1.05,
                soupFilter: 'sepia(0.44) saturate(1.62) hue-rotate(-10deg) brightness(1.14)',
                particleColors: ['#fde047', '#facc15', '#fef08a', '#eab308'],
                rippleTint: { border: 'rgba(250,204,21,0.88)', glow: 'rgba(253,224,71,0.52)' } },
            { fx: 'coconut', glyphs: ['🥥'], burstEmojis: ['🥥', '🤍', '✨'], count: 5, spread: 34, stagger: 110, startRot: -18, endRot: 138, endScale: 1.0,
                soupFilter: 'sepia(0.28) saturate(1.15) hue-rotate(18deg) brightness(1.12)',
                particleColors: ['#fef3c7', '#fde68a', '#e7e5e4', '#fafaf9'],
                rippleTint: { border: 'rgba(254,243,199,0.88)', glow: 'rgba(231,229,228,0.45)' } }
        ]}
    },
    // Launch shop: 3 EB-purchasable catalog spoons only. All other spoon skins drop via collection.
    spoons: [
        { id: 0, skinId: 'spoon_epic_pizza', cardKey:'spoon0_card', nameKey:'spoon0_name', bonusKey:'spoon0_bonus', rarity: "epic", cost: 25000, owned: false, equipped: false, hidden: false },
        { id: 1, skinId: 'spoon_legendary_sushi', cardKey:'spoon1_card', nameKey:'spoon1_name', bonusKey:'spoon1_bonus', rarity: "legendary", cost: 225000, owned: false, equipped: false, hidden: false },
        { id: 2, skinId: 'spoon_superleg_milkshake', cardKey:'spoon2_card', nameKey:'spoon2_name', bonusKey:'spoon2_bonus', rarity: "superleg", cost: 850000, owned: false, equipped: false, hidden: false }
    ],
    hats: [
        { id: 0, skinId: 'chefhat_epic_pizza', cardKey:'hat0_card', nameKey:'hat0_name', bonusKey:'hat0_bonus', rarity: "epic", cost: 25000, owned: false, equipped: false, hidden: false },
        { id: 1, skinId: 'chefhat_legendary_sushi', cardKey:'hat1_card', nameKey:'hat1_name', bonusKey:'hat1_bonus', rarity: "legendary", cost: 225000, owned: false, equipped: false, hidden: false },
        { id: 2, skinId: 'chefhat_superleg_milkshake', cardKey:'hat2_card', nameKey:'hat2_name', bonusKey:'hat2_bonus', rarity: "superleg", cost: 850000, owned: false, equipped: false, hidden: false }
    ],
    shopSpoonSkinIds() { return this.spoons.map(s => s.skinId).filter(Boolean); },
    shopHatSkinIds() { return this.hats.map(h => h.skinId).filter(Boolean); },
    shopExclusiveSkinIds() { return this.shopSpoonSkinIds().concat(this.shopHatSkinIds()); },
    isShopOwned(skinId) {
        if (!skinId) return false;
        const sp = this.spoons.find(s => s && s.skinId === skinId);
        if (sp) return !!sp.owned;
        const ht = this.hats.find(h => h && h.skinId === skinId);
        if (ht) return !!ht.owned;
        return false;
    },
    spoonCatalog(s) { return (s && s.skinId) ? collection.skinById(s.skinId) : null; },
    hatCatalog(h) { return (h && h.skinId) ? collection.skinById(h.skinId) : null; },
    spoonCardImg(s) { const sk = this.spoonCatalog(s); return sk ? collection.srcThumb(sk) : (s.cardImg || ''); },
    hatCardImg(h) { const sk = this.hatCatalog(h); return sk ? collection.srcThumb(sk) : (h.cardImg || ''); },
    spoonSceneImg(s) { const sk = this.spoonCatalog(s); return sk ? (collection.srcFull(sk) || sk.img || this.defaultSpoonImg) : (s.spoonImg || this.defaultSpoonImg); },
    _applyShopSpoonVisual(el, rig, s) {
        const sk = this.spoonCatalog(s);
        if (!sk || !sk.img) return false;
        collection._setFullImg(el, sk);
        if (rig) rig.classList.add('charm-spoon');
        this._spoonPlace = collection.placementFor(s.skinId);
        this._applySpoonRig();
        return true;
    },

    init() {
        if (this._inited) return;
        this._inited = true;
        try { balanceApplyCompanionDefaults(this); } catch (e) {}
        this.ctx = document.getElementById('particle-canvas').getContext('2d'); this.resize(); window.onresize = () => this.resize();
        this.initSoupBalls();
        this._bindStirPointer();
        this._bindStirCursor();
        this.load(); this.render(); this.updateBuyModeBtn();
        try { atlas.checkNewCompletions(); } catch (e) {}
        try { atlas.checkChapterUnlocks(false); } catch (e2) {}
        try { soupEvolution.catchUpSilent(); soupEvolution.sync(); } catch (e3) {}
        try { softEvents.sync(); } catch (e4) {}
        const alb = document.getElementById('spoons-album');
        if (alb && !alb._spoonDelegated) {
            alb._spoonDelegated = true;
            alb.addEventListener('click', (e) => {
                const hideBtn = e.target.closest('.shop-hide-toggle');
                if (hideBtn) {
                    e.stopPropagation();
                    const card = hideBtn.closest('.spoon-card');
                    const id = card ? parseInt(card.dataset.spoonId, 10) : NaN;
                    if (Number.isFinite(id)) this.toggleSpoonHidden(id);
                    return;
                }
                const btn = e.target.closest('.spoon-btn');
                if (!btn || btn.disabled) return;
                e.stopPropagation();
                const card = btn.closest('.spoon-card');
                const id = card ? parseInt(card.dataset.spoonId, 10) : NaN;
                if (!Number.isFinite(id)) return;
                const s = this.spoons.find(x => x.id === id);
                if (!s) return;
                if (s.owned && !s.equipped) this.equipSpoon(id, btn);
                else if (!s.owned && this.e >= this.effSpoonCost(s)) this.buySpoon(id, btn);
            });
        }
        const halb = document.getElementById('hats-album');
        if (halb && !halb._hatDelegated) {
            halb._hatDelegated = true;
            halb.addEventListener('click', (e) => {
                const hideBtn = e.target.closest('.shop-hide-toggle');
                if (hideBtn) {
                    e.stopPropagation();
                    const card = hideBtn.closest('.spoon-card');
                    const id = card ? parseInt(card.dataset.hatId, 10) : NaN;
                    if (Number.isFinite(id)) this.toggleHatHidden(id);
                    return;
                }
                const btn = e.target.closest('.spoon-btn');
                if (!btn || btn.disabled) return;
                e.stopPropagation();
                const card = btn.closest('.spoon-card');
                const id = card ? parseInt(card.dataset.hatId, 10) : NaN;
                if (!Number.isFinite(id)) return;
                const h = this.hats.find(x => x.id === id);
                if (!h) return;
                if (h.owned && !h.equipped) this.equipHat(id);
                else if (!h.owned && this.e >= this.effHatCost(h)) this.buyHat(id);
            });
        }
        if (this.logicTick) clearInterval(this.logicTick);
        if (this.uiTick) clearInterval(this.uiTick);
        if (this.saveTick) clearInterval(this.saveTick);
        if (this.minigameUiTick) clearInterval(this.minigameUiTick);
        this.logicTick = setInterval(()=>!this.p && this.logic(), 1000);
        this.uiTick = setInterval(()=>!this.p && this.ui(), (typeof quality !== 'undefined' && quality.effMode() === 'low') ? 500 : 250);
        this.minigameUiTick = setInterval(() => this.syncMinigameButtons(), 500);
        this.saveTick = setInterval(()=>this.save(), 5000);
        if (!this._visBound) {
            this._visBound = true;
            document.addEventListener('visibilitychange', () => {
                // Al volver de 2º plano, invalida rects cacheados y reanuda el rAF.
                if (!document.hidden && this._loopPaused) { this._loopPaused = false; this._soupRect = null; this._stageRect = null; this._scoreTarget = null; this.loop(); }
                if (!document.hidden && !this._chefMouthChewActive) this._chefMouthShowClosed();
            });
        }
        this.loop();
        this._chefMouthShowClosed();
        this.syncMinigameButtons();
        try { this.ui(); } catch (e) {}
    },
    resize() { this.ctx.canvas.width = window.innerWidth; this.ctx.canvas.height = window.innerHeight; this._soupRect = null; this._stageRect = null; this._scoreTarget = null; },
    _cacheSoupSurf() {
        const so = document.getElementById('asset-soup');
        const r = so ? so.getBoundingClientRect() : null;
        this._soupRect = r;
        this._surf = r ? { x: r.left + r.width * 0.52, y: r.top + r.height * 0.42, w: r.width, h: r.height } : null;
        const stg = document.getElementById('main-stage');
        this._stageRect = stg ? stg.getBoundingClientRect() : null;
    },
    _chefMouthHideOverlay() {
        const mouth = document.getElementById('asset-chef-mouth');
        if (mouth) mouth.style.display = 'none';
    },
    _chefMouthShowClosed() {
        const chef = this._chefEl();
        if (!chef) return;
        this._chefMouthHideOverlay();
        this._chefMouthVisual = 'closed';
        chef.src = this.CHEF_SRC_CLOSED;
    },
    _chefMouthShowOpen() {
        const chef = this._chefEl();
        if (!chef) return;
        this._chefMouthHideOverlay();
        this._chefMouthVisual = 'open';
        if (chef.src !== this.CHEF_SRC_OPEN) chef.src = this.CHEF_SRC_OPEN;
    },
    _chefWarmMouthSprites() {
        try {
            if (!this._chefMouthWarm) {
                this._chefMouthWarm = true;
                const im = new Image();
                im.decoding = 'async';
                im.src = this.CHEF_SRC_OPEN;
            }
        } catch (e) {}
    },
    _chefMouthStopChewLoop() {
        this._chefMouthChewActive = false;
        this._chefMouthOpenState = false;
        if (this._chewIv) {
            clearInterval(this._chewIv);
            this._chewIv = null;
        }
        if (this._chefMouthAnimTimer) {
            clearInterval(this._chefMouthAnimTimer);
            this._chefMouthAnimTimer = null;
        }
    },
    _chefMouthStopAnim() { this._chefMouthStopChewLoop(); },
    _runChefMouthChewLoop(sliceOverride, maxToggles) {
        this._chefMouthStopChewLoop();
        this._chefMouthChewActive = true;
        this._setChefEating(true, true);
        this._chefMouthOpenState = true;
        this._chefMouthShowOpen();
        this._chefMouthVisual = null;
        const sliceMs = sliceOverride || this.CHEW_SLICE_MS || 500;
        let togglesLeft = (maxToggles != null) ? maxToggles : null;
        this._chefMouthAnimTimer = setInterval(() => {
            if (!this._chefMouthChewActive) return;
            if (togglesLeft !== null) {
                if (togglesLeft <= 0) { this._chefMouthStopChewLoop(); return; }
                togglesLeft--;
            }
            this._chefMouthOpenState = !this._chefMouthOpenState;
            if (this._chefMouthOpenState) this._chefMouthShowOpen();
            else this._chefMouthShowClosed();
        }, sliceMs);
    },
    getSaveData() {
        this.lastSeen = Date.now();
        var metaOut = null;
        try { if (typeof STORE_TIER !== 'undefined') metaOut = STORE_TIER.ensureMeta(this); } catch (e) {}
        if (!metaOut) {
            if (!this.meta || typeof this.meta !== 'object') this.meta = {};
            if (!Number.isFinite(this.meta.saveCreatedAt)) this.meta.saveCreatedAt = Date.now();
            metaOut = { saveCreatedAt: this.meta.saveCreatedAt, webLegacyPlayer: !!this.meta.webLegacyPlayer };
        }
        return {v:SCHEMA_VERSION, e:this.e, te:this.te, l:this.l, s:this.s, as:this.as, c:this.cp.map(x=>({lv:x.lv, ch:x.ch})), cd:this.cd, scd:this.scd, bm:this.buyMode, sp:this.spoons.map(s=>({o:s.owned, eq:s.equipped, h:!!s.hidden})), hp:this.hats.map(h=>({o:h.owned, eq:h.equipped, h:!!h.hidden})), lastSeen:this.lastSeen, tree:this.tree, daily:this.daily, ach:this.ach, rewards:this.rewards, coll:this.coll, farm:this.farm, decor:this.decor, pr:this.prevRun, br:this.bestRunEb, ps:this.playSec, lst:this.loginStreak, lday:this.loginDay, vt:this.vtTheme, cm:this.chefMood, px:this.prixStreak, wk:this.weekly, hb:this.hb, cmw:this.comm, boss:this.boss, meta:metaOut};
    },
    save() {
        const data = this.getSaveData();
        const str = secure.wrap(JSON.stringify(data));
        try { localStorage.setItem('soup_p_v17', str); } catch (e) {}
        // HOOK NUBE: Playables SDK + Steam Auto-Cloud (%APPDATA%\\Skullchef\\save.json).
        try {
            if (typeof electronAPI !== 'undefined' && electronAPI.platform === 'steam' && electronAPI.writeCloudSaveSync) {
                electronAPI.writeCloudSaveSync(str);
            } else {
                cloudSave.save(str);
            }
        } catch (e) { try { cloudSave.save(str); } catch (e2) {} }
        try { cloudSync.onSave(str); } catch (e) {}
        try { if (typeof isPlayablesEnv === 'function' && isPlayablesEnv()) ytPlayables.sendScore(this.te); } catch (e) {}
        // Leaderboard: cheap, debounced + monotonic inside the module; safe offline.
        try { if (typeof isPlayablesEnv === 'function' && !isPlayablesEnv()) leaderboard.submit({ score: this.te, prestige: this.s }); } catch (e) {}
    },
    // Clamp defensivo de TODOS los numéricos del save (anti NaN/Infinity/negativos
    // y topes razonables). No rompe progreso legítimo (los topes son muy holgados).
    sanitizeSave(d) {
        const num = (v, min, max, dflt) => { const n = Number(v); if (!Number.isFinite(n)) return dflt; return Math.min(max, Math.max(min, n)); };
        const BIG = 1e300;
        d.e = num(d.e, 0, BIG, 0);
        d.te = num(d.te, 0, BIG, 0);
        d.l = num(d.l, 0, BIG, 0);
        d.s = Math.floor(num(d.s, 0, 100000, 0));
        d.as = Math.floor(num(d.as, 0, 1e12, 0));
        d.br = num(d.br, 0, BIG, 0);
        d.ps = Math.floor(num(d.ps, 0, 1e12, 0));
        d.lst = Math.floor(num(d.lst, 0, 10000, 0));
        if (typeof d.lday !== 'string') d.lday = '';
        if (typeof d.vt !== 'string') d.vt = '';
        d.cm = num(d.cm, 0, 100, 55);
        d.px = Math.floor(num(d.px, 0, 10000, 0));
        if (d.pr && typeof d.pr === 'object') {
            d.pr.eb = num(d.pr.eb, 0, BIG, 0);
            d.pr.l = Math.floor(num(d.pr.l, 0, 1e12, 0));
            d.pr.cps = num(d.pr.cps, 0, 1e18, 0);
            d.pr.era = Math.floor(num(d.pr.era, 0, 100000, 0));
            d.pr.shards = Math.floor(num(d.pr.shards, 0, 1e6, 0));
        } else d.pr = null;
        d.cd = Math.floor(num(d.cd, 0, 36000, 0));
        d.scd = Math.floor(num(d.scd, 0, 36000, 0));
        if (Array.isArray(d.c)) d.c.forEach(x => { if (x && typeof x === 'object') { x.lv = Math.floor(num(x.lv, 0, 100000, 0)); x.ch = Math.max(0, Math.floor(Number(x.ch) || 0)); } });
        if (Number.isFinite(d.lastSeen)) d.lastSeen = num(d.lastSeen, 0, Date.now() + 86400000, 0); else d.lastSeen = 0;
        if (d.farm && typeof d.farm === 'object' && d.farm.stock && typeof d.farm.stock === 'object') {
            const cap = 1e6;
            for (const k in d.farm.stock) { if (Object.prototype.hasOwnProperty.call(d.farm.stock, k)) d.farm.stock[k] = Math.floor(num(d.farm.stock[k], 0, cap, 0)); }
        }
        try { if (typeof collOrigin !== 'undefined') collOrigin.sanitizeSaveColl(d); } catch (e) {}
        return d;
    },
    load() {
        let d = null;
        this._tampered = false;
        try {
            let raw = localStorage.getItem('soup_p_v17'); if (!raw) raw = localStorage.getItem('soup_p_v16');
            if (raw) { const u = secure.unwrap(raw); if (u && u.data && typeof u.data === 'object') { d = u.data; if (u.tampered) this._tampered = true; } }
        }
        catch (err) { d = null; }
        if (d && typeof d === 'object') d = migrateSave(d);
        if (d && typeof d === 'object') d = this.sanitizeSave(d);
        if (d && typeof d === 'object') {
            this.e = Number.isFinite(d.e) ? d.e : 0; this.l = Number.isFinite(d.l) ? d.l : 0; this.s = Number.isFinite(d.s) ? d.s : 0; this.cd = Number.isFinite(d.cd) ? d.cd : 0; this.scd = Number.isFinite(d.scd) ? d.scd : 0;
            // `te` = LIFETIME total EB earned (never reset on prestige). For pre-`te`
            // saves it's absent/0, so baseline it to at least the current wallet (`e`),
            // since lifetime earned can never be less than the wallet you hold now.
            this.te = Math.max(Number.isFinite(d.te) ? d.te : 0, this.e);
            this.as = Number.isFinite(d.as) ? d.as : this.s;
            if (d.bm === 1 || d.bm === 10 || d.bm === 'max') this.buyMode = d.bm;
            if (Array.isArray(d.c)) d.c.forEach((x, i) => {
                if (!this.cp[i] || !x || typeof x !== 'object') return;
                this.cp[i].lv = Math.max(0, Math.floor(Number(x.lv) || 0));
                this.cp[i].ch = Math.max(0, Math.floor(Number(x.ch) || 0));
                this.recomputeCompanionCost(this.cp[i]);
            });
            if (d.sp && Array.isArray(d.sp)) d.sp.forEach((item, i) => {
                if (!this.spoons[i]) return;
                if (typeof item === 'boolean') { this.spoons[i].owned = item; }
                else {
                    this.spoons[i].owned = !!item.o;
                    this.spoons[i].equipped = !!item.eq;
                    this.spoons[i].hidden = item.h !== undefined ? !!item.h : !!(d.shi && item.eq);
                }
            });
            if (d.hp && Array.isArray(d.hp)) d.hp.forEach((item, i) => {
                if (!this.hats[i]) return;
                if (typeof item === 'boolean') { this.hats[i].owned = item; }
                else {
                    this.hats[i].owned = !!item.o;
                    this.hats[i].equipped = !!item.eq;
                    this.hats[i].hidden = item.h !== undefined ? !!item.h : !!(d.hh && item.eq);
                }
            });
            if (d.eq !== undefined && typeof d.eq === 'string') {
                const mig = { bone: 0, tentacle: 1, golden: 2 };
                const idx = mig[d.eq];
                if (idx !== undefined && this.spoons[idx].owned) { this.spoons.forEach(s => s.equipped = false); this.spoons[idx].equipped = true; }
            }
            const eq = this.spoons.filter(s => s.equipped);
            if (eq.length > 1) { this.spoons.forEach(s => s.equipped = false); eq[0].equipped = true; }
            const eqH = this.hats.filter(h => h.equipped);
            if (eqH.length > 1) { this.hats.forEach(h => h.equipped = false); eqH[0].equipped = true; }
            if (d.shi && !d.sp?.some(item => item && typeof item === 'object' && item.h !== undefined)) {
                const eqSp = this.spoons.find(s => s.equipped);
                if (eqSp) eqSp.hidden = true;
            }
            if (d.hh && !d.hp?.some(item => item && typeof item === 'object' && item.h !== undefined)) {
                const eqHt = this.hats.find(h => h.equipped);
                if (eqHt) eqHt.hidden = true;
            }
            this.lastSeen = Number.isFinite(d.lastSeen) ? d.lastSeen : 0;
            if (d.tree && typeof d.tree === 'object') { this.treeDefs.forEach(def => { const v = d.tree[def.k]; if (Number.isFinite(v)) this.tree[def.k] = Math.min(def.mx, Math.max(0, Math.floor(v))); }); }
            if (d.daily && typeof d.daily === 'object' && d.daily.counters && Array.isArray(d.daily.missions)) this.daily = d.daily;
            if (d.ach && typeof d.ach === 'object') this.ach = d.ach;
            if (d.rewards && typeof d.rewards === 'object') this.rewards = d.rewards;
            if (d.coll && typeof d.coll === 'object') {
                this.coll = d.coll;
                try { if (typeof collOrigin !== 'undefined') collOrigin.applyToGameColl(this.coll); } catch (e) {}
            }
            if (d.farm && typeof d.farm === 'object') this.farm = d.farm;
            if (d.decor && typeof d.decor === 'object') this.decor = d.decor;
            if (d.pr && typeof d.pr === 'object') this.prevRun = d.pr;
            else this.prevRun = null;
            this.bestRunEb = Number.isFinite(d.br) ? d.br : 0;
            this.playSec = Number.isFinite(d.ps) ? Math.floor(d.ps) : 0;
            this.loginStreak = Number.isFinite(d.lst) ? Math.floor(d.lst) : 0;
            this.loginDay = (typeof d.lday === 'string') ? d.lday : '';
            this.vtTheme = (typeof d.vt === 'string') ? d.vt : '';
            this.chefMood = Number.isFinite(d.cm) ? Math.min(100, Math.max(0, d.cm)) : 55;
            this.prixStreak = Number.isFinite(d.px) ? Math.floor(d.px) : 0;
            if (d.wk && typeof d.wk === 'object' && Array.isArray(d.wk.missions)) this.weekly = d.wk;
            else this.weekly = null;
            if (d.hb && typeof d.hb === 'object') this.hb = d.hb;
            else this.hb = null;
            if (d.cmw && typeof d.cmw === 'object') this.comm = d.cmw;
            else this.comm = null;
            if (d.boss && typeof d.boss === 'object') this.boss = d.boss;
            else this.boss = null;
            if (d.meta && typeof d.meta === 'object') this.meta = d.meta;
            else this.meta = null;
        }
        try { farm.ensure(); farm.syncPlotStates(); farm.updateBadge(); } catch (e) {}
        try { decor.ensure(); decor.applyVisual(); } catch (e) {}
        try { collection.normalize(); } catch (e) {}
        try { collection.purgeUnpublishedCharms(); } catch (e) {}
        // Grant the baseline common white chef hat to every player (new + existing
        // saves) silently, before visuals apply. Not equipped; no reveal/sound.
        try { collection.ensureBaseSkins(); } catch (e) {}
        this.applySpoonVisual();
        try { collection.applyEquippedVisual(); } catch (e) {}
        offline.evaluate();
        quests.ensureDaily();
        try { quests.ensureWeekly(); } catch (e) {}
        try { soupMenu.ensure(); } catch (e0) {}
        try { atlas.checkPrestigeChapters(this.s, true); } catch (e0b) {}
        try { helperBond.ensure(); } catch (e0c) {}
        try { commChallenge.ensure(); } catch (e0d) {}
        try { soupBoss.ensure(); } catch (e0e) {}
        try { loginStreak.evaluate(); } catch (e) {}
        try { visualTheme.init(); } catch (e) {}
        this.syncMinigameButtons();
        try { if (typeof STORE_TIER !== 'undefined') STORE_TIER.applyAfterLoad(this); } catch (e) {}
    },
    compCostMult() { try { return balanceCompCostMult(); } catch (e) { return 1.14; } },
    companionNextCost(c) {
        const i = c.id;
        const base = (Array.isArray(this.cpBaseCost) && this.cpBaseCost[i] != null)
            ? this.cpBaseCost[i] : (c.cs || 1);
        const cm = this.compCostMult();
        if (c.lv <= 0) return base;
        return Math.floor(base * Math.pow(cm, c.lv));
    },
    recomputeCompanionCost(c) { if (c) c.cs = this.companionNextCost(c); },
    calcBulkCost(c, n) {
        const base = this.cpBaseCost[c.id] ?? c.cs;
        const cm = this.compCostMult();
        const disc = this.hatCompanionDisc();
        let total = 0;
        for (let i = 0; i < n; i++) total += Math.floor(Math.floor(base * Math.pow(cm, c.lv + i)) * disc);
        return total;
    },
    maxAffordableLevels(c, energy) {
        if (energy < Math.floor(c.cs * this.hatCompanionDisc())) return 0;
        let lo = 0, hi = 1;
        while (this.calcBulkCost(c, hi) <= energy) { hi *= 2; if (hi > 1e6) break; }
        while (lo < hi) { const mid = Math.ceil((lo + hi + 1) / 2); if (this.calcBulkCost(c, mid) <= energy) lo = mid; else hi = mid - 1; }
        return lo;
    },
    cycleBuyMode() { this.buyMode = this.buyMode === 1 ? 10 : (this.buyMode === 10 ? 'max' : 1); this.updateBuyModeBtn(); this.render(); },
    getEquippedSpoon() { return this.spoons.find(s => s.equipped); },
    getEquippedShopHat() { return this.hats.find(h => h.equipped); },
    equippedSpoonHidden() { const s = this.getEquippedSpoon(); return !!(s && s.owned && s.hidden); },
    equippedHatHidden() { const h = this.getEquippedShopHat(); return !!(h && h.owned && h.hidden); },
    resetShopForPrestige() {
        this.spoons.forEach(s => { s.owned = false; s.equipped = false; s.hidden = false; });
        this.hats.forEach(h => { h.owned = false; h.equipped = false; h.hidden = false; });
        try { collection.clearShopPurchases(); } catch (e) {}
        try { this.applySpoonVisual(); } catch (e) {}
        try { collection.applyEquippedVisual(); } catch (e) {}
    },
    getCps() {
        let b = 0;
        this.cp.forEach(c => { if (c.id !== 2) b += (c.lv * c.pw * balanceEraMult(this.s) * this.champMult(c.ch) * this.milestoneMult(c.lv)); });
        b *= this.hatHelperCpsMult();
        const pioPct = (typeof balanceGet === 'function' ? balanceGet('pioCpsPctPerLv', 0.045) : 0.045);
        let cps = b * (1 + (this.cp[2].lv * pioPct * this.milestoneMult(this.cp[2].lv) * this.champMult(this.cp[2].lv ? this.cp[2].ch : 0)));
        const eq = this.getEquippedSpoon();
        if (eq && eq.id === 2) cps *= 2;
        cps *= this.treeCpsMult();
        cps *= this.treeAuraMult();
        cps *= this.treeEternalMult();
        cps *= this.buffMult('cps');
        try { cps *= atlas.setBonusMult(); } catch (e) {}
        try { cps *= collection.packSynergyMult(); } catch (e1) {}
        try { cps *= collection.equippedAscensionMult(); } catch (e1b) {}
        try { cps *= chefMood.mult(); } catch (e2) {}
        try { cps *= softEvents.cpsMult(); } catch (e3) {}
        try { cps *= soupEvolution.cpsMult(); } catch (e4) {}
        try { cps *= soupMenu.cpsMult(); } catch (e4b) {}
        try { cps *= helperDuos.cpsMult(); } catch (e5) {}
        try { cps *= helperBond.equippedCpsMult(); } catch (e5b) {}
        try { cps *= farm.brothMult(); } catch (e5c) {}
        try { cps *= farm.wagonCpsMult(); } catch (e5d) {}
        try { cps *= collection.cauldronMult(); } catch (e5e) {}
        return cps;
    },
    milestoneMult(lv) { try { return balanceMilestoneMult(lv); } catch (e) { let m = 1; if (lv >= 10) m *= 2; if (lv >= 25) m *= 2; if (lv >= 50) m *= 2; if (lv >= 100) m *= 2; return m; } },
    champMult(w) { return (w > 0) ? (1 + w) : 1; },
    // Banana Splash (Bongo): +3% stir/click power per level (milestones + crowns stack).
    // Complements Bunny's exponential click curve without cloning Ivan's raw EB/s role.
    bongoClickMult() {
        const b = this.cp[4];
        if (!b || b.lv <= 0) return 1;
        const bongoPct = (typeof balanceGet === 'function' ? balanceGet('bongoClickPctPerLv', 0.032) : 0.032);
        return 1 + b.lv * bongoPct * this.milestoneMult(b.lv) * this.champMult(b.ch);
    },
    nextMilestone(lv) {
        const steps = (typeof balanceGet === 'function' ? balanceGet('milestoneSteps', []) : []);
        if (steps.length) {
            for (var i = 0; i < steps.length; i++) if (lv < steps[i].lv) return steps[i].lv;
            return null;
        }
        const t = [10, 25, 50, 100];
        for (const x of t) if (lv < x) return x;
        return null;
    },
    treeCpsMult() { const p = (typeof balanceGet === 'function' ? balanceGet('treeCaldoPctPerLv', 0.15) : 0.15); return 1 + this.tree.caldo * p; },
    treeClickMult() { const p = (typeof balanceGet === 'function' ? balanceGet('treeManosPctPerLv', 0.20) : 0.20); return 1 + this.tree.manos * p; },
    treeSpoonDisc() { const p = (typeof balanceGet === 'function' ? balanceGet('treeCucharaPctPerLv', 0.075) : 0.075); return Math.max(0.1, 1 - this.tree.cuchara * p); },
    treeOfflineMult() { const p = (typeof balanceGet === 'function' ? balanceGet('treeOfflinePctPerLv', 0.26) : 0.26); return 1 + this.tree.tiempo * p; },
    // Aura Dorada: multiplicador GLOBAL de EB (afecta CPS y click). +8% por nivel.
    treeAuraMult() { const a = Number.isFinite(this.tree.aura) ? this.tree.aura : 0; const p = (typeof balanceGet === 'function' ? balanceGet('treeAuraPctPerLv', 0.08) : 0.08); return 1 + a * p; },
    treeEternalMult() { const v = Number.isFinite(this.tree.eterno) ? this.tree.eterno : 0; const p = (typeof balanceGet === 'function' ? balanceGet('treeEternalPctPerLv', 0.03) : 0.03); return 1 + v * p; },
    // === Recompensa de fragmentos al prestigiar (escala con el tamaño de la run) ===
    // En vez de un +1 fijo, premiamos cuánto empujó el jugador por encima del umbral
    // de prestigio. `ratio = wallet / umbral` (>=1 siempre que el prestigio sea legal).
    // base = floor(sqrt(ratio)) -> curva idle estándar y suave:
    //   ratio 1x   -> 1 fragmento  (= comportamiento antiguo, SIN regresión)
    //   ratio 4x   -> 2,  9x -> 3,  25x -> 5,  100x -> 10,  10000x -> 100
    // El nodo `fortuna` suma +1 fragmento plano por nivel (máx +10). TUNABLE:
    // sube/baja el exponente (0.5) o añade un multiplicador para recalibrar.
    presShards() {
        const g = balancePrestigeGoal(this.s);
        const ratio = (g > 0 && Number.isFinite(this.e)) ? (this.e / g) : 1;
        let base = Math.floor(Math.pow(Math.max(1, ratio), (typeof balanceGet === 'function' ? balanceGet('prestigeShardSqrtExp', 0.55) : 0.55)));
        if (!Number.isFinite(base) || base < 1) base = 1;
        const bonus = Number.isFinite(this.tree.fortuna) ? this.tree.fortuna : 0;
        return base + bonus;
    },
    /** Resumen legible de nodos activos del Árbol del Ángel (overlay de prestigio). */
    prestigeTreeChips() {
        const tr = this.tree || {};
        const chips = [];
        const add = (k, n) => { if (n > 0) chips.push(t('node_' + k + '_name') + ' Lv.' + n); };
        add('caldo', tr.caldo || 0);
        add('manos', tr.manos || 0);
        add('eco', tr.eco || 0);
        add('cuchara', tr.cuchara || 0);
        add('tiempo', tr.tiempo || 0);
        add('aura', tr.aura || 0);
        add('fortuna', tr.fortuna || 0);
        if ((tr.eterno || 0) > 0) add('eterno', tr.eterno);
        return chips;
    },
    fmtRunStat(n) {
        const v = Number(n);
        if (!Number.isFinite(v)) return '0';
        if (v >= 1e9) return (v / 1e9).toFixed(2) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(2) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(1) + 'k';
        return Math.floor(v).toLocaleString();
    },
    renderPrestigeOverlaySummary(shardsPreview, endingRun) {
        const sum = document.getElementById('pres-summary');
        const cmp = document.getElementById('pres-run-compare');
        const newEra = this.s + 1;
        const totalShards = (Number.isFinite(this.as) ? this.as : 0) + shardsPreview;
        if (sum) {
            const chips = this.prestigeTreeChips();
            let html = '<div class="pres-summary-row">' + t('pres_summary_era', { era: newEra, lv: newEra }) + '</div>';
            html += '<div class="pres-summary-row">' + t('pres_summary_shards', { total: totalShards.toLocaleString(), gain: shardsPreview }) + '</div>';
            if (chips.length) {
                html += '<div class="pres-summary-row"><span>' + t('pres_summary_tree') + '</span></div>';
                html += '<div class="pres-tree-chips">' + chips.map(c => '<span class="pres-tree-chip">' + c + '</span>').join('') + '</div>';
            }
            sum.innerHTML = html;
        }
        if (cmp) {
            const cur = endingRun || { eb: this.e, l: this.l, cps: this.getCps() };
            const prev = this.prevRun;
            if (prev && Number.isFinite(prev.eb) && prev.eb > 0) {
                cmp.style.display = 'block';
                let delta = '';
                if (cur.eb > prev.eb) {
                    const pct = Math.round(((cur.eb - prev.eb) / prev.eb) * 100);
                    delta = '<div class="pres-run-delta">' + t('pres_run_delta_up', { pct }) + '</div>';
                } else if (cur.eb < prev.eb) {
                    const pct = Math.round(((prev.eb - cur.eb) / prev.eb) * 100);
                    delta = '<div class="pres-run-delta down">' + t('pres_run_delta_down', { pct }) + '</div>';
                } else delta = '<div class="pres-run-delta">' + t('pres_run_delta_same') + '</div>';
                cmp.innerHTML = '<div class="pres-run-title">' + t('pres_run_compare_title') + '</div>'
                    + '<div>' + t('pres_run_this', { eb: this.fmtRunStat(cur.eb), cps: (cur.cps || 0).toFixed(1), clicks: (cur.l || 0).toLocaleString() }) + '</div>'
                    + '<div>' + t('pres_run_prev', { eb: this.fmtRunStat(prev.eb), cps: (prev.cps || 0).toFixed(1), clicks: (prev.l || 0).toLocaleString() }) + '</div>'
                    + delta;
            } else { cmp.style.display = 'none'; cmp.innerHTML = ''; }
        }
    },
    checkEraMilestone(era) {
        const e = Math.floor(Number(era) || 0);
        if (e < 5 || e % 5 !== 0) return;
        const k = 'era' + e;
        if (this.ach[k]) return;
        const d = ach.defs.find(x => x.k === k);
        const reward = d && d.reward ? d.reward : e * 2500;
        this.ach[k] = true;
        if (reward > 0) { this.e += reward; this.te += reward; }
        try { gx.toast(t('era_milestone_toast', { era: e, reward: Math.floor(reward).toLocaleString() })); } catch (e2) {}
        try { sound.play('prestige'); } catch (e3) {}
        try {
            const o = this.soupPartOrigin();
            this.part(o.x, o.y, 'magic');
            this.part(window.innerWidth / 2, window.innerHeight * 0.35, 'magic');
            this.spawnRipple(o.x, o.y - 12);
        } catch (e4) {}
        try { achievementsProvider.unlock(k); } catch (e5) {}
        this.save();
    },
    fmtPlayTime(sec) {
        const s = Math.max(0, Math.floor(Number(sec) || 0));
        const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
        if (h > 0) return h + 'h ' + m + 'm';
        if (m > 0) return m + 'm';
        return s + 's';
    },
    fmtDuration(sec) {
        const s = Math.max(0, Math.floor(Number(sec) || 0));
        if (s >= 86400) return Math.floor(s / 86400) + 'd ' + Math.floor((s % 86400) / 3600) + 'h';
        if (s >= 3600) return Math.floor(s / 3600) + 'h ' + Math.floor((s % 3600) / 60) + 'm';
        if (s >= 60) return Math.floor(s / 60) + 'm ' + (s % 60) + 's';
        return s + 's';
    },
    stirComboMult() {
        try { return balanceStirComboMult(this._stirCombo || 0); } catch (e) {
            const c = this._stirCombo || 0;
            if (c >= 20) return 1.18;
            if (c >= 12) return 1.10;
            if (c >= 6) return 1.06;
            return 1;
        }
    },
    stirComboPct() {
        const m = this.stirComboMult();
        return m > 1 ? Math.round((m - 1) * 100) : 0;
    },
    tickStirCombo() {
        const now = performance.now();
        if (this._stirComboUntil && now > this._stirComboUntil) {
            this._stirCombo = 0;
            this._stirComboUntil = 0;
        }
    },
    presEtaText() {
        const g = balancePrestigeGoal(this.s);
        if (this.e >= g) return '';
        const need = g - this.e;
        const cps = this.getCps();
        if (!(cps > 0)) return t('pres_eta_idle');
        return t('pres_eta', { time: this.fmtDuration(need / cps) });
    },
    lifetimeStatsHtml() {
        const best = Math.max(Number.isFinite(this.bestRunEb) ? this.bestRunEb : 0, Number.isFinite(this.e) ? this.e : 0);
        let html = t('pause_lifetime', {
            te: this.fmtRunStat(this.te),
            pres: (Number.isFinite(this.s) ? this.s : 0).toLocaleString(),
            as: (Number.isFinite(this.as) ? this.as : 0).toLocaleString(),
            best: this.fmtRunStat(best),
            time: this.fmtPlayTime(this.playSec)
        });
        if ((this.loginStreak || 0) > 0) html += '<br>' + t('streak_pause', { n: this.loginStreak });
        if ((this.prixStreak || 0) > 0) html += '<br>' + t('prix_streak_pause', { n: this.prixStreak });
        return html;
    },
    effSpoonCost(s) { return Math.floor(s.cost * this.treeSpoonDisc()); },
    effHatCost(h) { return Math.floor(h.cost * this.treeSpoonDisc()); },
    hatHelperCpsMult() { const eq = this.getEquippedShopHat(); return (eq && eq.id === 1) ? 1.20 : 1; },
    hatCompanionDisc() { const eq = this.getEquippedShopHat(); return (eq && eq.id === 2) ? 0.90 : 1; },
    hatDropLuckMult() { const eq = this.getEquippedShopHat(); return (eq && eq.id === 2) ? 1.15 : 1; },
    hatFarmBonusRoll() { const eq = this.getEquippedShopHat(); return !!(eq && eq.id === 0 && Math.random() < 0.40); },
    addBuff(kind, mult, dur, labelKey) {
        this._buffs = this._buffs.filter(b => b.kind !== kind);
        this._buffs.push({ kind, mult, until: Date.now() + dur * 1000, labelKey });
        this.renderBuffs();
    },
    buffMult(kind) { const now = Date.now(); let m = 1; this._buffs.forEach(b => { if (b.kind === kind && b.until > now) m *= b.mult; }); return m; },
    renderBuffs() {
        const bar = document.getElementById('buff-bar'); if (!bar) return;
        const now = Date.now();
        this._buffs = this._buffs.filter(b => b.until > now);
        // Solo se regenera el innerHTML si cambió el set de buffs o el segundo mostrado.
        const key = this._buffs.map(b => b.labelKey + ':' + Math.ceil((b.until - now) / 1000)).join('|') + '#' + LANG;
        if (key === this._buffKey) return;
        this._buffKey = key;
        bar.innerHTML = this._buffs.map(b => {
            const sec = Math.ceil((b.until - now) / 1000);
            const esc = (s) => String(s || '').replace(/"/g, '&quot;');
            return `<div class="buff-chip hud-chip-tap" role="button" tabindex="0" data-chip="buff" data-buff-kind="${esc(b.kind)}" data-buff-mult="${b.mult}" data-buff-label="${esc(b.labelKey)}" data-i18n-title="chip_tap_hint" title="Tap for details">${t(b.labelKey)} (${sec}s)</div>`;
        }).join('');
    },
    track(type, amt) { if (this.daily && this.daily.counters && this.daily.counters[type] != null) this.daily.counters[type] += amt; quests.bump(type, amt); try { quests.bumpWeekly(type, amt); } catch (e) {} try { if (type === 'eb') { soupMenu.bumpEb(amt); try { commChallenge.bump(amt); } catch (e2) {} } } catch (e3) {} },
    getPrixCd() { const eq = this.getEquippedSpoon(); return (eq && eq.id === 2) ? 300 : 600; },
    getSkirmishCd() { const eq = this.getEquippedSpoon(); return (eq && eq.id === 2) ? 150 : 300; },
    _chefFeedInProgress() { return !!(this._chefMouthChewActive || this._chefFeedPendingTimer || this._chefMouthCloseTimer); },
    _chefEl() { return document.getElementById('asset-chef'); },
    _chefHandEl() { return document.getElementById('asset-chef-hand'); },
    /** Limpia animaciones de compra / feed del chef tras prestigio o cancelación. */
    resetCompanionSummonState() {
        try { this._summonGen = (this._summonGen || 0) + 1; } catch (e) {}
        try {
            clearTimeout(this._mShopCloseTimer);
            this._mShopCloseTimer = null;
            clearTimeout(this._mRebuildTimer);
            this._mRebuildTimer = null;
            this._mRebuildDirty = false;
            this._mSummonPumping = false;
            this._summonPipeSlot = false;
            this._mSummonQueue = [];
        } catch (e) {}
        try { document.querySelectorAll('.summon-clone').forEach(el => el.remove()); } catch (e) {}
        try { this._chefFeedSeq = (this._chefFeedSeq || 0) + 1; } catch (e) {}
        try {
            if (this._chefFeedPendingTimer) { clearTimeout(this._chefFeedPendingTimer); this._chefFeedPendingTimer = null; }
            if (this._chefMouthCloseTimer) { clearTimeout(this._chefMouthCloseTimer); this._chefMouthCloseTimer = null; }
            if (this._chefTintTimer) { clearTimeout(this._chefTintTimer); this._chefTintTimer = null; }
        } catch (e) {}
        try { this._chefMouthStopAnim(); } catch (e) {}
        try { this._chefMouthShowClosed(); } catch (e) {}
        try { this._setChefEating(false); } catch (e) {}
        try { this.applySpoonVisual(); } catch (e) {}
        try {
            const chef = this._chefEl();
            if (chef) {
                chef.classList.remove('chef-face-tint', 'chef-face-tint-fade');
                chef.style.removeProperty('--chef-tint-filter');
                chef.style.removeProperty('--chef-face-filter');
            }
            const rig = this._chefRigEl();
            if (rig) {
                rig.classList.remove('chef-face-glow', 'chef-face-glow-mobile');
                rig.style.removeProperty('--chef-glow-color');
                rig.style.removeProperty('--chef-glow-core');
                rig.style.removeProperty('--chef-glow-mid');
            }
        } catch (e) {}
        try { sound.stopEat(); } catch (e) {}
        try {
            const burst = document.getElementById('soup-fx-burst');
            if (burst) burst.innerHTML = '';
        } catch (e) {}
    },
    finalizePrestigeRunState() {
        try { this.resetCompanionSummonState(); } catch (e) {}
        try { this.syncCompanionLayout(); } catch (e) {}
        try { this.ensureReservedHelperSlot(); } catch (e) {}
        try { this._warmHelperSprites(); } catch (e) {}
        try { collection.applyEquippedVisual(); } catch (e) {}
        try { collection.flashSceneLoadout('prestige', 12000); } catch (e) {}
        try { if (typeof objective !== 'undefined') objective.sync(); } catch (e) {}
    },
    prestigeWelcomeMoment(shardsGained, eco) {
        this._uiScore = undefined;
        this._uiPresStat = undefined;
        this._uiPresTxt = undefined;
        this._loreKey = null;
        try { this.ui(); } catch (e) {}
        try { ach.check(); } catch (e) {}
        try { this.checkEraMilestone(this.s); } catch (e) {}
        try { chefMood.set(55, true); } catch (e) {}
        const pct = this.s * 50;
        let msg = t('pres_welcome_back', { era: this.s, pct, n: shardsGained });
        if (eco > 0) msg += '\n' + t('pres_welcome_eco', { eco });
        else msg += '\n' + t('pres_welcome_farm');
        try { gx.toast(msg); } catch (e) {}
        try { sound.play('bubble'); } catch (e) {}
        try {
            const o = this.soupPartOrigin();
            this.part(o.x, o.y, 'magic');
            this.spawnRipple(o.x, o.y - 12);
        } catch (e) {}
        const pulse = (id, cls) => {
            cls = cls || 'prestige-return-pulse';
            try {
                const el = document.getElementById(id);
                if (!el) return;
                el.classList.remove(cls);
                void el.offsetWidth;
                el.classList.add(cls);
                setTimeout(() => { try { el.classList.remove(cls); } catch (e) {} }, 1400);
            } catch (e) {}
        };
        pulse('score-box');
        pulse('sticky-center', 'prestige-soup-glow');
        pulse('altar-panel');
    },
    _setChefEating(on, restart) {
        const hand = this._chefHandEl();
        // The spoon rig is intentionally excluded: bouncing it stomps the charm
        // spoon's placement transform (and the default spoon's position), so the
        // spoon stays put in the chef's hand during the feed/eat window.
        for (const el of [this._chefRigEl(), hand]) {
            if (!el) continue;
            if (on) {
                if (restart) { el.classList.remove('chef-eating'); void el.offsetWidth; }
                el.classList.add('chef-eating');
            } else el.classList.remove('chef-eating');
        }
    },
    applySpoonVisual() {
        const el = document.getElementById('asset-spoon'); if (!el) return;
        const rig = document.getElementById('spoon-rig');
        const s = this.getEquippedSpoon();
        // NOTE: the chef feed/eat window must NOT hide or displace the spoon. The
        // default/hidden spoon stays visible in its normal position, and the charm
        // spoon keeps its custom placement (re-applied below). The eat bounce no
        // longer animates #spoon-rig, so the placement transform survives the feed.
        if (this.equippedSpoonHidden()) {
            el.src = this.defaultSpoonImg;
            if (rig) {
                rig.style.display = '';
                rig.classList.remove('charm-spoon', 'chef-eating');
                rig.style.transform = '';
            }
            this._spoonPlace = null;
            return;
        }
        if (rig) { rig.classList.remove('charm-spoon', 'chef-eating'); rig.style.transform = ''; }
        this._spoonPlace = null;
        if (rig) { rig.style.display = ''; rig.style.visibility = ''; }
        if (s && s.owned) {
            if (!this._applyShopSpoonVisual(el, rig, s)) {
                el.onerror = function () { try { collection.imgFail(this); } catch (e) {} };
                el.src = this.spoonSceneImg(s);
            }
        } else el.src = this.defaultSpoonImg;
    },
    toggleSpoonHidden(id) {
        const s = this.spoons.find(x => x.id === id);
        if (!s || !s.owned) return;
        s.hidden = !s.hidden;
        if (s.equipped) {
            try { this.applySpoonVisual(); } catch (e) {}
            try { collection.applyEquippedVisual(); } catch (e) {}
        }
        this.save();
        this._spoonUiKey = '';
        this.renderSpoons();
    },
    // Applies the equipped charm spoon's per-skin placement to #spoon-rig. When `stirF`
    // is a number, oscillates the rotation for the idle-stir animation (called by loop()).
    _applySpoonRig(stirF) { const rig = this._spoonRigEl || (this._spoonRigEl = document.getElementById('spoon-rig')); if (!rig) return; const p = this._spoonPlace; if (!p) return; try { rig.style.transform = collection.placementCss(p, (typeof stirF === 'number' ? Math.sin(stirF) * 5 : 0)); } catch (e) {} },
    _applySpoonStirNow() {
        if (this._chefFeedInProgress()) return;
        const rig = this._spoonRigEl || (this._spoonRigEl = document.getElementById('spoon-rig'));
        if (!rig) return;
        if (this._spoonPlace) this._applySpoonRig(this.f);
        else rig.style.transform = `translate(-50%,-50%) rotate(${-27 + Math.sin(this.f) * 5}deg)`;
    },
    spoonUiKey() {
        return this.spoons.map(s => (s.owned ? 'o' : 'u') + (s.equipped ? 'e' : '-') + (s.owned && s.hidden ? 'h' : 'v') + (this.e >= this.effSpoonCost(s) ? 'a' : 'l')).join('|');
    },
    summonSpoon(spoon, originEl, onLand) {
        let clone, done = false, landed = false;
        let animTimer, fadeTimer, particleTimer;
        const finish = () => {
            if (done) return;
            done = true;
            clearTimeout(failSafe);
            clearTimeout(animTimer);
            clearTimeout(particleTimer);
            clearTimeout(fadeTimer);
            this._spoonAnimating = false;
            if (onLand) onLand();
        };
        const failSafe = setTimeout(() => { if (clone && clone.parentNode) clone.remove(); finish(); }, 6000);
        const onLandAnim = () => {
            if (done || landed) return;
            landed = true;
            clearTimeout(animTimer);
            const slot = document.getElementById('asset-spoon');
            const rig = document.getElementById('spoon-rig');
            if (rig) rig.classList.remove('charm-spoon');
            if (slot) slot.src = this.spoonSceneImg(spoon);
            if (clone) {
                clone.style.transition = 'opacity 200ms ease';
                clone.style.opacity = '0';
                fadeTimer = setTimeout(() => {
                    if (clone && clone.parentNode) clone.remove();
                    finish();
                }, 200);
            } else finish();
        };
        try {
            if (!originEl) originEl = document.getElementById('spoons-album');
            if (!originEl) { finish(); return; }
            const slot = document.getElementById('asset-spoon');
            if (!slot) { finish(); return; }
            const rect = originEl.getBoundingClientRect();
            const slotRect = slot.getBoundingClientRect();
            const cloneW = 120;
            clone = document.createElement('img');
            clone.src = this.spoonSceneImg(spoon);
            clone.style.setProperty('--start-x', rect.left + rect.width / 2 + 'px');
            clone.style.setProperty('--start-y', rect.top + rect.height / 2 + 'px');
            clone.style.setProperty('--end-x', slotRect.left + slotRect.width / 2 + 'px');
            clone.style.setProperty('--end-y', slotRect.top + slotRect.height / 2 + 'px');
            clone.style.setProperty('--end-scale', Math.max(0.25, (slotRect.width / cloneW) * 0.95));
            clone.className = 'summon-clone forge-direct-active';
            document.body.appendChild(clone);
            particleTimer = setTimeout(() => {
                this.part(window.innerWidth / 2, window.innerHeight / 2, 'magic');
            }, 900);
            clone.addEventListener('animationend', (e) => {
                if (e.animationName === 'forgeSpoonDirect') onLandAnim();
            });
            animTimer = setTimeout(onLandAnim, 1800);
        } catch (err) {
            if (clone && clone.parentNode) clone.remove();
            finish();
        }
    },
    buySpoon(id, btn) {
        const s = this.spoons.find(x => x.id === id);
        if (!s || s.owned || this._spoonAnimating) return;
        const cost = this.effSpoonCost(s);
        if (this.e < cost) return;
        this.e -= cost;
        s.owned = true;
        try { collection.addOwnedCharm(s.skinId); } catch (e) {}
        sound.play('prestige');
        this._spoonUiKey = '';
        this.renderSpoons();
        this._spoonAnimating = true;
        this.summonSpoon(s, btn || document.getElementById('spoons-album'), () => {
            this.spoons.forEach(sp => sp.equipped = false);
            s.equipped = true;
            this.applySpoonVisual();
            this.save();
            this._spoonUiKey = '';
            this.renderSpoons();
        });
        this._mAutoCloseShop();
    },
    equipSpoon(id, btn) {
        const s = this.spoons.find(x => x.id === id);
        if (!s || !s.owned || s.equipped || this._spoonAnimating) return;
        this._spoonAnimating = true;
        this.summonSpoon(s, btn || document.getElementById('spoons-album'), () => {
            this.spoons.forEach(sp => sp.equipped = false);
            s.equipped = true;
            this.applySpoonVisual();
            this.save();
            this._spoonUiKey = '';
            this.renderSpoons();
        });
    },
    renderSpoons() {
        const alb = document.getElementById('spoons-album'); if (!alb) return;
        alb.innerHTML = '';
        this.spoons.forEach(s => {
            const card = document.createElement('div');
            card.className = 'spoon-card ' + s.rarity + (s.equipped ? ' equipped' : '');
            card.dataset.spoonId = String(s.id);
            let actionHtml = '';
            const sc = this.effSpoonCost(s);
            const owned = !!s.owned;
            if (owned) {
                const hideLbl = s.hidden ? t('spoon_show') : t('spoon_hide');
                if (s.equipped) {
                    actionHtml = `<div class="shop-card-actions"><span class="spoon-equipped-badge">${t('spoon_equipped')}</span><button class="shop-hide-toggle${s.hidden ? ' on' : ''}" type="button">${hideLbl}</button></div>`;
                } else {
                    actionHtml = `<div class="shop-card-actions"><button class="spoon-btn equip" type="button">${t('spoon_equip_btn')}</button><button class="shop-hide-toggle${s.hidden ? ' on' : ''}" type="button">${hideLbl}</button></div>`;
                }
            } else if (this.e >= sc) actionHtml = `<button class="spoon-btn buy" type="button">${t('spoon_buy_btn')}</button><div class="spoon-cost">${sc.toLocaleString()} EB</div>`;
            else actionHtml = `<button class="spoon-btn locked" type="button" disabled>${t('spoon_buy_btn')}</button><div class="spoon-cost">${sc.toLocaleString()} EB</div>`;
            card.innerHTML = `<img src="${this.spoonCardImg(s)}" class="spoon-card-img" alt="${t(s.cardKey)}"><span class="spoon-rarity ${s.rarity}">${t('rarity_' + s.rarity)}</span><div style="font-size:0.82rem;font-weight:bold;line-height:1.2">${t(s.cardKey)}<button type="button" class="shop-info-btn" title="${t('chip_tap_hint')}" onclick="event.stopPropagation();itemBonus.shopTip('spoon',${s.id})">ⓘ</button></div><div style="font-size:0.68rem;color:#cbd5e1">${t(s.nameKey)}</div><div class="spoon-benefit">${t(s.bonusKey)}</div>${actionHtml}`;
            const btn = card.querySelector('.spoon-btn');
            if (btn && !btn.disabled) {
                if (owned && !s.equipped) btn.onclick = (e) => { e.stopPropagation(); this.equipSpoon(s.id, e.currentTarget); };
                else if (!owned && this.e >= this.effSpoonCost(s)) btn.onclick = (e) => { e.stopPropagation(); this.buySpoon(s.id, e.currentTarget); };
            }
            alb.appendChild(card);
        });
        this._spoonUiKey = this.spoonUiKey();
    },
    hatUiKey() {
        return this.hats.map(h => (h.owned ? 'o' : 'u') + (h.equipped ? 'e' : '-') + (h.owned && h.hidden ? 'h' : 'v') + (this.e >= this.effHatCost(h) ? 'a' : 'l')).join('|');
    },
    buyHat(id) {
        const h = this.hats.find(x => x.id === id);
        if (!h || h.owned || this._hatAnimating) return;
        const cost = this.effHatCost(h);
        if (this.e < cost) return;
        this.e -= cost;
        h.owned = true;
        try { collection.addOwnedCharm(h.skinId); } catch (e) {}
        sound.play('prestige');
        this.hats.forEach(x => x.equipped = false);
        h.equipped = true;
        try { collection.applyEquippedVisual(); } catch (e) {}
        this.save();
        this._hatUiKey = '';
        this.renderHats();
        this._mAutoCloseShop();
    },
    equipHat(id) {
        const h = this.hats.find(x => x.id === id);
        if (!h || !h.owned || h.equipped || this._hatAnimating) return;
        this.hats.forEach(x => x.equipped = false);
        h.equipped = true;
        try { this.applySpoonVisual(); } catch (e) {}
        try { collection.applyEquippedVisual(); } catch (e) {}
        this.save();
        this._hatUiKey = '';
        this.renderHats();
    },
    toggleHatHidden(id) {
        const h = this.hats.find(x => x.id === id);
        if (!h || !h.owned) return;
        h.hidden = !h.hidden;
        if (h.equipped) {
            try { collection.applyEquippedVisual(); } catch (e) {}
        }
        this.save();
        this._hatUiKey = '';
        this.renderHats();
    },
    renderHats() {
        const alb = document.getElementById('hats-album'); if (!alb) return;
        alb.innerHTML = '';
        this.hats.forEach(h => {
            const card = document.createElement('div');
            card.className = 'spoon-card ' + h.rarity + (h.equipped ? ' equipped' : '');
            card.dataset.hatId = String(h.id);
            let actionHtml = '';
            const hc = this.effHatCost(h);
            if (h.owned && h.equipped) {
                actionHtml = `<div class="shop-card-actions"><span class="spoon-equipped-badge">${t('hat_equipped')}</span><button class="shop-hide-toggle${h.hidden ? ' on' : ''}" type="button">${t(h.hidden ? 'hat_show' : 'hat_hide')}</button></div>`;
            } else if (h.owned) {
                actionHtml = `<div class="shop-card-actions"><button class="spoon-btn equip" type="button">${t('hat_equip_btn')}</button><button class="shop-hide-toggle${h.hidden ? ' on' : ''}" type="button">${t(h.hidden ? 'hat_show' : 'hat_hide')}</button></div>`;
            } else if (this.e >= hc) actionHtml = `<button class="spoon-btn buy" type="button">${t('hat_buy_btn')}</button><div class="spoon-cost">${hc.toLocaleString()} EB</div>`;
            else actionHtml = `<button class="spoon-btn locked" type="button" disabled>${t('hat_buy_btn')}</button><div class="spoon-cost">${hc.toLocaleString()} EB</div>`;
            card.innerHTML = `<img src="${this.hatCardImg(h)}" class="spoon-card-img" alt="${t(h.cardKey)}"><span class="spoon-rarity ${h.rarity}">${t('rarity_' + h.rarity)}</span><div style="font-size:0.82rem;font-weight:bold;line-height:1.2">${t(h.cardKey)}<button type="button" class="shop-info-btn" title="${t('chip_tap_hint')}" onclick="event.stopPropagation();itemBonus.shopTip('hat',${h.id})">ⓘ</button></div><div style="font-size:0.68rem;color:#cbd5e1">${t(h.nameKey)}</div><div class="spoon-benefit">${t(h.bonusKey)}</div>${actionHtml}`;
            const btn = card.querySelector('.spoon-btn');
            if (btn && !btn.disabled) {
                if (h.owned && !h.equipped) btn.onclick = (e) => { e.stopPropagation(); this.equipHat(h.id); };
                else if (!h.owned && this.e >= this.effHatCost(h)) btn.onclick = (e) => { e.stopPropagation(); this.buyHat(h.id); };
            }
            alb.appendChild(card);
        });
        this._hatUiKey = this.hatUiKey();
    },
    updateBuyModeBtn() { const b = this._el ? this._el('buy-mode-toggle') : document.getElementById('buy-mode-toggle'); if (!b) return; const txt = this.buyMode === 1 ? t('buy_x1') : (this.buyMode === 10 ? t('buy_x10') : t('buy_max')); if (b.innerText !== txt) b.innerText = txt; },
    cardPriceDisplay(c) {
        const maxN = this.maxAffordableLevels(c, this.e);
        const fmt = (n) => Math.floor(n).toLocaleString() + ' EB';
        if (this.buyMode === 1) return { text: fmt(Math.floor(c.cs * this.hatCompanionDisc())), grayed: maxN < 1, affordable: maxN >= 1 };
        if (this.buyMode === 10) {
            if (maxN >= 1) return { text: fmt(this.calcBulkCost(c, Math.min(10, maxN))), grayed: false, affordable: true };
            return { text: fmt(this.calcBulkCost(c, 10)), grayed: true, affordable: false };
        }
        if (maxN >= 1) return { text: t('max_label') + ' ' + fmt(this.calcBulkCost(c, maxN)), grayed: false, affordable: true };
        return { text: t('max_label') + ' ' + fmt(c.cs), grayed: true, affordable: false };
    },
    HELPER_GRID_POS: { 0: [1, 1], 1: [1, 2], 2: [1, 3], 3: [2, 1], 4: [2, 2] },
    _usesDesktopHelperGrid() {
        try {
            if (typeof mobileUI !== 'undefined' && mobileUI.isPhone && mobileUI.isPhone()) return false;
            if (window.innerWidth >= 1024 && window.innerHeight >= 640) return true;
            if (window.matchMedia('(pointer: fine) and (hover: hover)').matches && window.innerWidth >= 960) return true;
            if (window.matchMedia('(orientation: portrait) and (max-width: 768px)').matches) return false;
            if (window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 600px)').matches) return false;
            return true;
        } catch (e) { return true; }
    },
    _applyHelperGridPos(el, row, col) {
        if (!el || !this._usesDesktopHelperGrid()) { if (el) { el.style.gridRow = ''; el.style.gridColumn = ''; } return; }
        el.style.gridRow = String(row);
        el.style.gridColumn = String(col);
    },
    syncCompanionLayout() {
        try {
            const col = document.getElementById('companion-column');
            const ls = document.getElementById('lore-scroll');
            const gw = document.getElementById('game-wrapper');
            if (!col || !ls || !gw) return;
            if (!this._usesDesktopHelperGrid()) {
                try {
                    if (typeof mobileUI !== 'undefined') {
                        if (mobileUI._landscapePhone()) mobileUI.syncLandscapeLeftHud();
                        else mobileUI.syncPortraitHelperColumn();
                    }
                } catch (e) {}
                return;
            }
            const gap = 52;
            const top = ls.offsetTop + ls.offsetHeight + gap;
            if (col.__layoutTop !== top) { col.style.top = top + 'px'; col.__layoutTop = top; }
        } catch (e) {}
    },
    ensureReservedHelperSlot() {
        if (!this._usesDesktopHelperGrid()) {
            const old = document.getElementById('slot-reserved-6');
            if (old) old.remove();
            return;
        }
        let s = document.getElementById('slot-reserved-6');
        if (!s) {
            s = document.createElement('div');
            s.id = 'slot-reserved-6';
            s.className = 'companion-slot companion-slot-reserved';
            s.setAttribute('aria-hidden', 'true');
            document.getElementById('companion-column').appendChild(s);
        }
        this._applyHelperGridPos(s, 2, 3);
        if (!s.querySelector('.slot-reserved-mark')) s.innerHTML = '<span class="slot-reserved-mark">+</span>';
    },
    rebuild() {
        const col = document.getElementById('companion-column');
        col.innerHTML = '';
        this.cp.forEach(c => { if (c.lv > 0) this.slot(c); });
        this.ensureReservedHelperSlot();
        this.syncCompanionLayout();
        try { if (typeof mobileUI !== 'undefined') { mobileUI.syncLandscapeLeftHud(); mobileUI.syncPortraitHelperColumn(); mobileUI.syncAltarBelowHud(); } } catch (e) {}
        try { if (typeof helpersBox !== 'undefined') helpersBox.updateCount(); } catch (e) {}
    },
    // Light path for helper-skin equip: swap img src only (no column/list wipe).
    patchCompanionPreview(idx) {
        const c = this.cp[idx];
        if (!c) return;
        let shopPaths = { src: c.im, fb: c.im, def: c.im };
        let colPaths = shopPaths;
        try {
            if (typeof collection !== 'undefined') {
                if (collection.companionShopImg) shopPaths = collection.companionShopImg(idx);
                const sk = collection._sceneLoadoutKey || null;
                if (collection.companionColumnImg) colPaths = collection.companionColumnImg(idx, sk);
            }
        } catch (e) {}
        const shopFb = shopPaths.fb || shopPaths.src || c.im;
        const shopFb2 = shopPaths.def || collection.HELPER_DEFAULT_IMG[idx] || shopFb;
        if (c.lv > 0) {
            let slotEl = document.getElementById('slot-' + c.id);
            if (slotEl) {
                let img = slotEl.querySelector('.slot-img');
                const colFb = colPaths.fb || colPaths.src || c.im;
                const colFb2 = colPaths.def || collection.HELPER_DEFAULT_IMG[idx] || colFb;
                if (img) {
                    if (img.getAttribute('src') !== colPaths.src) img.setAttribute('src', colPaths.src);
                    img.dataset.fallback = colFb;
                    img.dataset.fallback2 = colFb2;
                    try { delete img.dataset.fallbackUsed; delete img.dataset.fallback2Used; delete img.dataset.phDone; } catch (e4) {}
                } else this.slot(c);
            } else {
                this.slot(c);
            }
        }
        const list = document.getElementById('companion-list');
        if (list && list.children[idx]) {
            const compImg = list.children[idx].querySelector('.comp-img');
            if (compImg) {
                if (compImg.getAttribute('src') !== shopPaths.src) compImg.setAttribute('src', shopPaths.src);
                compImg.dataset.fallback = shopFb;
                compImg.dataset.fallback2 = shopFb2;
                try { delete compImg.dataset.fallbackUsed; delete compImg.dataset.fallback2Used; delete compImg.dataset.phDone; } catch (e3) {}
            }
        }
    },
    companionCardDetailHtml(c, i) {
        const pioPct = (typeof balanceGet === 'function' ? balanceGet('pioCpsPctPerLv', 0.048) : 0.048);
        let d = c.id === 2 ? `+${(pioPct * 100).toFixed(1)}% ${t('prod')}` : c.id === 4 ? `${t('bongo_bonus', { pct: ((balanceGet('bongoClickPctPerLv', 0.036) * 100).toFixed(1)) })} · +${(c.pw * balanceEraMult(this.s)).toFixed(1)} EB/s` : `+${(c.pw * balanceEraMult(this.s)).toFixed(1)} EB/s`;
        if (c.id === 4 && c.lv > 0) d = `+${((this.bongoClickMult() - 1) * 100).toFixed(0)}% ${t('stir_word')} · +${(c.lv * c.pw * balanceEraMult(this.s) * this.champMult(c.ch) * this.milestoneMult(c.lv)).toFixed(1)} EB/s`;
        let angelText = (this.s > 0 && c.id !== 2) ? `<br><span style="color:#4ade80; font-size:0.6rem;">${t('angel_power', {pct: this.s*50})}</span>` : '';
        const mm = this.milestoneMult(c.lv); const nm = this.nextMilestone(c.lv);
        let mileText = c.lv > 0 ? `<br><span style="color:#fbbf24; font-size:0.6rem;">x${mm} ${t('milestone_word')}${nm ? ` · ${t('milestone_next')} ${t('lv')}${nm}` : ` · ${t('milestone_max')}`}</span>` : '';
        let bonusHtml = '';
        try { bonusHtml = itemBonus.helperCardHtml(i, c); } catch (eB) {}
        return `<div style="flex:1"><b>${t(c.nk)} (${c.lv})</b><div style="font-size:0.7rem;color:#cbd5e1">${d}${angelText}${mileText}${bonusHtml}</div>${c.ch>0?`<span class="champ-banner">${t('champion_banner', { mult: this.champMult(c.ch) })}</span>`:''}<span class="card-price" style="color:${this.cardPriceDisplay(c).grayed ? '#64748b' : '#fbbf24'};font-weight:bold;display:block;">${this.cardPriceDisplay(c).text}</span></div>`;
    },
    patchCompanionCard(i) {
        const list = document.getElementById('companion-list');
        const c = this.cp[i];
        if (!list || !c || !list.children[i]) return false;
        const card = list.children[i];
        const pd = this.cardPriceDisplay(c);
        let paths = { src: c.im, fb: c.im };
        try {
            if (typeof collection !== 'undefined' && collection.companionShopImg) paths = collection.companionShopImg(i);
        } catch (e) {}
        card.className = `companion-card ${pd.affordable ? 'affordable' : ''}`;
        let img = card.querySelector('.comp-img');
        if (!img) {
            img = document.createElement('img');
            img.className = 'comp-img';
            img.loading = 'lazy';
            img.decoding = 'async';
            img.onerror = function () { try { collection.imgFail(this); } catch (e2) {} };
            card.insertBefore(img, card.firstChild);
        }
        if (img.getAttribute('src') !== paths.src) img.setAttribute('src', paths.src);
        img.dataset.fallback = paths.fb || paths.src || c.im;
        img.dataset.fallback2 = paths.def || collection.HELPER_DEFAULT_IMG[i] || img.dataset.fallback;
        try { delete img.dataset.fallbackUsed; delete img.dataset.fallback2Used; delete img.dataset.phDone; } catch (e3) {}
        const body = card.querySelector('div[style*="flex:1"]');
        if (body) body.outerHTML = this.companionCardDetailHtml(c, i);
        return true;
    },
    renderCompanionCards() {
        const l = document.getElementById('companion-list'); if (!l) return;
        l.innerHTML = '';
        this.cp.forEach((c, i) => {
            const pd = this.cardPriceDisplay(c);
            const cd = document.createElement('div');
            cd.className = `companion-card ${pd.affordable ? 'affordable' : ''}`;
            cd.onclick = (e) => this.buy(i, e);
            let paths = { src: c.im, fb: c.im };
            try {
                if (typeof collection !== 'undefined' && collection.companionShopImg) paths = collection.companionShopImg(i);
            } catch (e) {}
            cd.innerHTML = `<img src="${paths.src}" data-fallback="${paths.fb || paths.src}" data-fallback2="${paths.def || collection.HELPER_DEFAULT_IMG[i] || paths.fb || paths.src}" class="comp-img" loading="lazy" decoding="async" onerror="collection.imgFail(this)">${this.companionCardDetailHtml(c, i)}`;
            l.appendChild(cd);
        });
    },
    slot(c) {
        let s = document.getElementById(`slot-${c.id}`);
        if (!s) { s = document.createElement('div'); s.id = `slot-${c.id}`; s.className = 'companion-slot'; document.getElementById('companion-column').appendChild(s); }
        const gp = this.HELPER_GRID_POS[c.id];
        if (gp) this._applyHelperGridPos(s, gp[0], gp[1]);
        let paths = { src: c.im, fb: c.im, def: collection.HELPER_DEFAULT_IMG[c.id] || c.im };
        try {
            if (c.lv > 0 && typeof collection !== 'undefined' && collection.companionColumnImg) {
                const sceneKey = collection._sceneLoadoutKey || null;
                paths = collection.companionColumnImg(c.id, sceneKey);
            }
        } catch (e) {}
        const imgFb = paths.fb || paths.src || c.im;
        const imgFb2 = paths.def || collection.HELPER_DEFAULT_IMG[c.id] || imgFb;
        s.innerHTML = `<img src="${paths.src}" data-fallback="${imgFb}" data-fallback2="${imgFb2}" class="slot-img" loading="lazy" decoding="async" onerror="collection.imgFail(this)"><div class="lv-badge">${t('lv')} ${c.lv}</div>${c.ch>0?`<div class="slot-crown">👑</div>`:''}${(game.farm && game.farm.wagon === c.id)?`<div class="wagon-badge">🌱</div>`:''}`;
        s.classList.toggle('wagon-active', !!(game.farm && game.farm.wagon === c.id));
        s.onclick = (function (hid) { return function (ev) { ev.stopPropagation(); try { helperBond.tap(hid); } catch (e) {} }; })(c.id);
        try { if (typeof helpersBox !== 'undefined') helpersBox.updateCount(); } catch (e) {}
        return s;
    },
    logic() {
        this.tickStirCombo();
        try { chefMood.tick(); } catch (e) {}
        this.c = this.getCps();
        const prevDisp = Math.floor(this.e);
        this.e += this.c; this.te += this.c; this.l += this.c;
        if (!this.p) this.playSec++;
        if (this.e > (this.bestRunEb || 0)) this.bestRunEb = this.e;
        const nextDisp = Math.floor(this.e);
        if (nextDisp > prevDisp) this._autoPartAcc += nextDisp - prevDisp;
        if (this.c > 0) this.track('eb', this.c);
        if (this.cd > 0) this.cd--;
        if (this.scd > 0) this.scd--;
        bubble.tick();
        quests.ensureDaily();
        try { collection.tick(1); } catch (e) {}
        try { farm.tickReady(); farm.tickWagonBond(); farm.updateBadge(); } catch (e) {}
        try { quests.ensureWeekly(); } catch (e) {}
        try { soupMenu.ensure(); } catch (e0) {}
        try { soupBoss.idleTick(this.c); } catch (e0b) {}
    },
    updateLore() {
        try { soupEvolution.updateRecipe(); } catch (e0) {}
        try { softEvents.updateLoreLine(); } catch (e0b) {}
        // this.m (the click multiplier tier) must be recomputed every call; the DOM
        // text only changes when the tier / era / language changes, so guard the write.
        let m;
        if (this.s === 0) {
            if (this.l < 1000) m = 1;
            else if (this.l < 10000) m = 2;
            else if (this.l < 100000) m = 3;
            else if (this.l < 500000) m = 4;
            else m = 5;
            this.m = m;
        } else { m = 6; this.m = 6; }
        const key = m + '|' + this.s + '|' + (typeof LANG !== 'undefined' ? LANG : '');
        if (key === this._loreKey) return;
        this._loreKey = key;
        const lt = document.getElementById('lore-text'), ti = document.getElementById('lore-title');
        if (!lt || !ti) return;
        const ls = document.getElementById('lore-scroll');
        if (ls) ls.classList.toggle('lore-adventure', !!atlas.path());
        if (this.s === 0) {
            let main = t('lore' + m);
            try { const extra = atlas.chronicleSnippet(); if (extra) main += '\n\n' + extra; } catch (e) {}
            lt.innerText = main;
            ti.innerText = t('chronicle') + ' ' + m;
        } else {
            let main = t('lore6');
            try { const extra = atlas.chronicleSnippet(); if (extra) main += '\n\n' + extra; } catch (e) {}
            lt.innerText = main;
            ti.innerText = t('chronicle') + ' 6 (' + t('era') + ' ' + this.s + ')';
        }
    },
    // Lazily cache stable element refs so the 250ms UI tick doesn't re-query the DOM.
    _el(id) { const c = this._els || (this._els = {}); return c[id] || (c[id] = document.getElementById(id)); },
    hasAwakenedHelper() {
        try { return (this.cp || []).some(function (c) { return c && c.lv > 0; }); } catch (e) { return false; }
    },
    minigameUnlocked() { return this.hasAwakenedHelper(); },
    syncMinigameButtons() {
        try {
            const unlocked = this.minigameUnlocked();
            const prixFab = document.getElementById('prix-fab');
            const skirmishFab = document.getElementById('skirmish-fab');
            if (this._els) {
                this._els['prix-fab'] = prixFab;
                this._els['skirmish-fab'] = skirmishFab;
            }
            if (prixFab) {
                const fvis = unlocked ? 'flex' : 'none';
                if (prixFab.style.display !== fvis) prixFab.style.display = fvis;
                if (unlocked) {
                    const lab = prixFab.querySelector('.prix-fab-label') || prixFab.querySelector('span');
                    if (this.cd > 0) {
                        const mm = String(Math.floor(this.cd / 60)).padStart(2, '0');
                        const ss = String(this.cd % 60).padStart(2, '0');
                        const txt = t('prix_cd', { mm: mm, ss: ss });
                        if (lab && lab.textContent !== txt) lab.textContent = txt;
                        if (this._prixCd !== true) {
                            prixFab.style.pointerEvents = 'none'; prixFab.style.opacity = '0.6'; prixFab.style.cursor = 'not-allowed';
                            this._prixCd = true;
                        }
                    } else {
                        const txt = t('enter_prix');
                        if (lab && lab.textContent !== txt) lab.textContent = txt;
                        if (this._prixCd !== false) {
                            prixFab.style.pointerEvents = 'auto'; prixFab.style.opacity = '1'; prixFab.style.cursor = 'pointer';
                            this._prixCd = false;
                        }
                    }
                }
            }
            if (skirmishFab) {
                const svis = unlocked ? 'flex' : 'none';
                if (skirmishFab.style.display !== svis) skirmishFab.style.display = svis;
                if (unlocked) {
                    if (this.scd > 0) {
                        const mm = String(Math.floor(this.scd / 60)).padStart(2, '0');
                        const ss = String(this.scd % 60).padStart(2, '0');
                        const txt = t('skirmish_cd', { mm: mm, ss: ss });
                        const slab = skirmishFab.querySelector('[data-i18n="skirmish_btn"]') || skirmishFab.querySelector('span');
                        if (slab && slab.textContent !== txt) slab.textContent = txt;
                        if (this._skirmishCd !== true) {
                            skirmishFab.style.pointerEvents = 'none'; skirmishFab.style.opacity = '0.6'; skirmishFab.style.cursor = 'not-allowed';
                            this._skirmishCd = true;
                        }
                    } else {
                        const txt = t('skirmish_btn');
                        const slab = skirmishFab.querySelector('[data-i18n="skirmish_btn"]') || skirmishFab.querySelector('span');
                        if (slab && slab.textContent !== txt) slab.textContent = txt;
                        if (this._skirmishCd !== false) {
                            skirmishFab.style.pointerEvents = 'auto'; skirmishFab.style.opacity = '1'; skirmishFab.style.cursor = 'pointer';
                            this._skirmishCd = false;
                        }
                    }
                }
            }
        } catch (e) {}
        try { if (typeof mobileUI !== 'undefined') mobileUI.syncMinigameLauncher(); } catch (e2) {}
    },
    ui() {
        // PERF: cache refs + only write to the DOM when a value actually changed, to
        // cut redundant writes / layout thrash. Visible output is identical.
        const disp = Math.floor(this.e);
        const scoreEl = this._el('score');
        if (scoreEl && disp !== this._uiScore) { scoreEl.innerText = disp.toLocaleString(); this._uiScore = disp; }
        this._dispScore = disp;
        const shEl = this._el('shards-count');
        if (shEl && this.as !== this._uiShards) { shEl.innerText = this.as; this._uiShards = this.as; }
        const cpsEl = this._el('cps-tag');
        const cpsStr = t('cps_per_sec', {n: this.c.toFixed(1)});
        if (cpsEl && cpsStr !== this._uiCps) { cpsEl.innerText = cpsStr; this._uiCps = cpsStr; }
        let g = balancePrestigeGoal(this.s); const b = this._el('btn-prestige');
        const presUnlocked = this.e >= g;
        if (b) { const cls = presUnlocked ? 'unlocked' : 'locked'; if (b.className !== cls) b.className = cls; }
        const presTxtEl = this._el('pres-txt');
        const presTxt = presUnlocked ? (t('awaken_soul') + ' · +' + this.presShards() + ' ⬨') : t('requires_eb', {eb: g.toLocaleString()});
        if (presTxtEl && presTxt !== this._uiPresTxt) { presTxtEl.innerText = presTxt; this._uiPresTxt = presTxt; }
        const presStatEl = this._el('pres-stat');
        const presStat = t('angel_lv', {s: this.s, pct: this.s*50});
        if (presStatEl && presStat !== this._uiPresStat) { presStatEl.innerText = presStat; this._uiPresStat = presStat; }
        const progEl = this._el('pres-progress');
        const progPct = g > 0 ? Math.min(100, (this.e / g) * 100) : 0;
        if (progEl && progPct !== this._uiPresProg) { progEl.style.width = progPct.toFixed(1) + '%'; this._uiPresProg = progPct; }
        const altarEl = this._el('altar-panel');
        if (altarEl) {
            const near = presUnlocked || progPct >= 85;
            if (near !== this._uiPresNear) { altarEl.classList.toggle('pres-near-ready', near); this._uiPresNear = near; }
        }
        const etaEl = this._el('pres-eta');
        const etaTxt = this.presEtaText();
        if (etaEl && etaTxt !== this._uiPresEta) { etaEl.textContent = etaTxt; this._uiPresEta = etaTxt; }
        const bonusEl = this._el('bonus-chip');
        if (bonusEl) {
            let sets = 0, pct = 0;
            try { sets = atlas.completedPackCount(); pct = atlas.setBonusPctDisplay(); } catch (e) {}
            if (sets > 0) {
                const btxt = t('bonus_chip_sets', { n: sets, pct });
                if (bonusEl.textContent !== btxt) bonusEl.textContent = btxt;
                if (bonusEl.style.display !== 'block') bonusEl.style.display = 'block';
            } else if (bonusEl.style.display !== 'none') bonusEl.style.display = 'none';
        }
        const stirEl = this._el('stir-combo');
        if (stirEl) {
            const combo = this._stirCombo || 0;
            const cpct = this.stirComboPct();
            if (combo >= 3 && cpct > 0) {
                const stxt = t('stir_combo', { combo, pct: cpct });
                if (stirEl.textContent !== stxt) stirEl.textContent = stxt;
                if (stirEl.style.display !== 'block') stirEl.style.display = 'block';
                stirEl.classList.toggle('hot', combo >= 12);
            } else {
                if (stirEl.style.display !== 'none') stirEl.style.display = 'none';
                stirEl.classList.remove('hot');
            }
        }
        this.syncMinigameButtons();
        this.updateLore();
        this.updateBuyModeBtn();
        document.querySelectorAll('.companion-card').forEach((card, i) => {
            const c = this.cp[i];
            if (!c) return;
            const pd = this.cardPriceDisplay(c);
            const cls = `companion-card ${pd.affordable ? 'affordable' : ''}`;
            if (card.className !== cls) card.className = cls;
            const nameEl = card.querySelector('b');
            if (nameEl) {
                const want = `${t(c.nk)} (${c.lv})`;
                if (nameEl.textContent !== want) nameEl.textContent = want;
            }
            const priceEl = card.querySelector('.card-price');
            if (priceEl) {
                if (priceEl.innerText !== pd.text) priceEl.innerText = pd.text;
                const col = pd.grayed ? '#64748b' : '#fbbf24';
                if (priceEl.__col !== col) { priceEl.style.color = col; priceEl.__col = col; }
            }
        });
        const sk = this.spoonUiKey();
        if (sk !== this._spoonUiKey) this.renderSpoons();
        const hk = this.hatUiKey();
        if (hk !== this._hatUiKey) this.renderHats();
        this.renderBuffs();
        ach.check();
        quests.updateBadge();
        if (typeof rewardSystem !== 'undefined') rewardSystem.renderButton();
        try { if (typeof mobileUI !== 'undefined') mobileUI.updateLauncherBadges(); } catch (e) {}
        try { if (typeof objective !== 'undefined') objective.sync(); } catch (e) {}
        try { chefMood.syncUi(); } catch (e) {}
        try { soupMenu.syncUi(); } catch (e0d) {}
        try { helperBond.syncUi(); } catch (e0e) {}
        try { helperDuos.syncUi(); } catch (e0e1) {}
        try { commChallenge.syncUi(); } catch (e0e2) {}
        try { collection.syncDropAccelChip(); } catch (e0e3) {}
        try { soupBoss.syncUi(); } catch (e0f) {}
        try { collection.syncSynergyChip(); } catch (e) {}
        try { this.syncCompanionLayout(); } catch (e) {}
        try {
            if (typeof mobileUI !== 'undefined') {
                const _n = performance.now();
                if (!this._altarHudSyncT || _n - this._altarHudSyncT > 350) {
                    mobileUI.syncPortraitHudAnchors();
                    this._altarHudSyncT = _n;
                }
            }
        } catch (e) {}
        try { const fm = document.getElementById('farm-modal'); if (fm && fm.classList.contains('open')) farm.render(); } catch (e) {}
    },
    click(ev) {
        if(this.p || ev.target.closest('#side-shop') || ev.target.closest('#altar-panel')) return;
        if (!this._isStirHit(ev)) return;
        // Lightweight tap gate: drop only clicks within the same ~2 frames (kills a true
        // double-fire) instead of the old 120ms lock that capped tapping to ~8/s and made
        // fast tapping feel laggy. The stir visual keeps its own 120ms timer below.
        const _now = performance.now();
        if (_now - this._clickGate < 33) return;
        this._clickGate = _now;
        try { if (ev && ev.pointerType === 'mouse' && ev.button !== 0) return; } catch (e) {}
        try { sound.touchAudioIfOn(); } catch (e) {}
        const m = Number.isFinite(this.m) ? Math.min(Math.max(this.m, 1), 6) : 1;
        const bunnyExpCap = (typeof balanceGet === 'function' ? balanceGet('clickBunnyExpCap', 24) : 24);
        const bunnyExpCoeff = (typeof balanceGet === 'function' ? balanceGet('clickBunnyExpCoeff', 0.48) : 0.48);
        const clickPow = (typeof balanceGet === 'function' ? balanceGet('clickPowBase', 1.32) : 1.32);
        const clickBase = (typeof balanceGet === 'function' ? balanceGet('clickBaseGain', 3) : 3);
        const exp = Math.min(this.cp[1].lv * this.champMult(this.cp[1].ch) * bunnyExpCoeff, bunnyExpCap);
        let gain = clickBase * Math.pow(clickPow, exp) * balanceEraMult(this.s) * m;
        const eq = this.getEquippedSpoon();
        if (eq && eq.id === 0) gain *= 1.50;
        if (eq && eq.id === 1 && Math.random() < 0.05) gain *= 10;
        gain *= this.milestoneMult(this.cp[1].lv) * this.bongoClickMult() * this.treeClickMult() * this.treeAuraMult() * this.treeEternalMult() * this.buffMult('click') * this.stirComboMult();
        try { gain *= collection.packSynergyMult(); } catch (e0) {}
        try { gain *= collection.equippedAscensionMult(); } catch (e0b) {}
        try { gain *= chefMood.mult(); } catch (e0b) {}
        try { gain *= soupEvolution.clickMult(); } catch (e) {}
        try { gain *= soupMenu.clickMult(); } catch (e0c) {}
        try { gain *= softEvents.clickMult(); } catch (e2) {}
        try { gain *= helperDuos.clickMult(); } catch (e3) {}
        try { gain *= helperBond.equippedCpsMult(); } catch (e3b) {}
        let crit = false;
        const critChance = (typeof balanceGet === 'function' ? balanceGet('critChance', 0.04) : 0.04);
        const critMult = (typeof balanceGet === 'function' ? balanceGet('critMult', 2.5) : 2.5);
        if (Math.random() < critChance) { gain *= critMult; crit = true; }
        if (!Number.isFinite(gain) || gain <= 0) return;
        this.e += gain; this.te += gain; this._lastClick = _now;
        this._stirCombo = (this._stirCombo || 0) + 1;
        this._stirComboUntil = _now + ((typeof balanceGet === 'function' ? balanceGet('stirComboDecayMs', 1800) : 1800));
        try { chefMood.bump(0.35, 'click'); } catch (e) {}
        try { soupBoss.damage(soupBoss.clickDamage()); } catch (e4) {}
        // Keep the stir/soup audio loop alive FIRST, before any DOM work, so the
        // audio call is never queued behind layout/paint on the main thread.
        sound.stirPulse();
        this.track('clicks', 1); this.track('eb', gain);
        if (!game.ach.firstClick) ach.grant('firstClick');
        this.f += 0.65;
        const lowQ = quality.effMode() === 'low';
        const px = (ev && (ev.clientX || ev.pageX)) || (window.innerWidth * 0.5);
        const py = (ev && (ev.clientY || ev.pageY)) || (window.innerHeight * 0.5);
        if (lowQ) {
            const disp = Math.floor(this.e);
            const scoreEl = this._el('score');
            if (scoreEl && disp !== this._uiScore) { scoreEl.innerText = disp.toLocaleString(); this._uiScore = disp; }
            this._applySpoonStirNow();
            const spoon = this._spoonEl || (this._spoonEl = document.getElementById('asset-spoon'));
            if (spoon) { spoon.classList.add('manual-stir'); clearTimeout(this._stirT); this._stirT = setTimeout(() => { spoon.classList.remove('manual-stir'); }, 120); }
            this.floatNum(px, py, gain, crit ? { crit: true } : null);
            if (!this._energyPartGate || _now - this._energyPartGate >= 180) {
                let ec = 0;
                for (let pi = 0; pi < this.particles.length; pi++) if (this.particles[pi].t === 'energy') ec++;
                if (ec < 3 && this.particles.length < quality.params.maxParts) {
                    const o = this.soupPartOrigin();
                    this.particles.push({
                        x: o.x + (Math.random() - 0.5) * 26,
                        y: o.y + (Math.random() - 0.5) * 12,
                        t: 'energy', vx: (Math.random() - 0.5) * 3, vy: -1.8,
                        life: 0.88, size: Math.random() * 6 + 9, color: '#a5f3fc'
                    });
                    this._energyPartGate = _now;
                }
            }
        } else {
            this._applySpoonStirNow();
            const spoon = this._spoonEl || (this._spoonEl = document.getElementById('asset-spoon'));
            if (spoon) { spoon.classList.add('manual-stir'); clearTimeout(this._stirT); this._stirT = setTimeout(() => { spoon.classList.remove('manual-stir'); }, 120); }
            this.floatNum(px, py, gain, crit ? { crit: true } : null);
            const o = this.soupPartOrigin();
            this.part(o.x + (Math.random() - 0.5) * 40, o.y + (Math.random() - 0.5) * 20, 'energy');
            this.spawnRipple(px, py);
        }
        try { if (typeof tutorial !== 'undefined' && tutorial.active) tutorial.notify('stir'); } catch (e) {}
    },
    /** Summon pose: midpoint of the gap between chef (#asset-chef) and shop purchase column (#side-shop). */
    summonPoseOrigin() {
        const stage = document.getElementById('main-stage');
        const stageR = stage ? stage.getBoundingClientRect() : { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight };
        const rectOk = (r) => r && r.width > 8 && r.height > 8;
        const chefEl = document.getElementById('asset-chef');
        let chefR = chefEl ? chefEl.getBoundingClientRect() : null;
        if (!rectOk(chefR)) {
            const anchor = document.getElementById('sticky-center');
            chefR = anchor ? anchor.getBoundingClientRect() : { left: stageR.left + stageR.width * 0.28, top: stageR.top + stageR.height * 0.12, right: stageR.left + stageR.width * 0.62, bottom: stageR.top + stageR.height * 0.88, width: stageR.width * 0.34, height: stageR.height * 0.76 };
        }
        let shopR = null;
        const shopEl = document.getElementById('side-shop');
        if (shopEl) {
            const sr = shopEl.getBoundingClientRect();
            if (rectOk(sr) && sr.left < window.innerWidth - 2) shopR = sr;
            else {
                const w = sr.width || Math.min(380, Math.max(180, stageR.width * 0.34));
                shopR = { left: window.innerWidth - w, top: sr.top || stageR.top, right: window.innerWidth, bottom: sr.bottom || stageR.bottom, width: w, height: sr.height || stageR.height };
            }
        }
        if (!shopR) {
            const card = document.querySelector('#companion-list .companion-card');
            if (card) shopR = card.getBoundingClientRect();
        }
        if (!rectOk(shopR)) {
            const list = document.getElementById('companion-list');
            if (list && list.children.length) shopR = list.getBoundingClientRect();
        }
        if (!rectOk(shopR)) {
            const shopW = Math.min(380, Math.max(180, stageR.width * 0.34));
            shopR = { left: stageR.right - shopW, top: stageR.top + stageR.height * 0.12, right: stageR.right, bottom: stageR.bottom - 72, width: shopW, height: stageR.height * 0.76 };
        }
        // PORTRAIT MOBILE ONLY: the shop is an off-screen slide-in sheet, so the
        // chef↔shop midpoint collapses on top of the chef/cauldron and hides the
        // feed/drop animations. Lift the summon focal point clearly ABOVE the chef's
        // head instead. Landscape/desktop keep the original midpoint logic below.
        if (window.matchMedia('(orientation: portrait) and (max-width: 768px)').matches) {
            const cx = (chefR.left + chefR.right) * 0.5;
            // Sit above the chef's head but BELOW the top-center toast zone (#gx-toast-wrap
            // is fixed at ~150px), so the "carteles" no longer cover the helper.
            const liftY = chefR.top - chefR.height * 0.35;
            const minY = stageR.top + 230; // stay below the toast/cartel stack
            return {
                x: Math.min(Math.max(cx, stageR.left + 28), stageR.right - 28),
                y: Math.min(Math.max(liftY, minY), stageR.bottom - 72)
            };
        }
        // LANDSCAPE PHONE ONLY: the shop is also an off-screen slide-in sheet here,
        // so the chef↔shop midpoint again collapses onto the chef/cauldron. Landscape
        // is short + wide, so lifting straight up would collide with the toast zone —
        // instead offset the helper to the SIDE (toward where the shop slides in from
        // the right) and bias it slightly up, beside the chef rather than on top of him.
        if (window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 600px)').matches) {
            const cyMid = (chefR.top + chefR.bottom) * 0.5;
            // Sit clearly to the RIGHT of the chef (toward the shop side) so the helper
            // never lands on top of him. Push past the chef's right edge by ~half his
            // width, then keep it on-screen.
            const sideX = chefR.right + Math.max(95, chefR.width * 0.45);
            return {
                x: Math.min(Math.max(sideX, stageR.left + 40), stageR.right - 95),
                y: Math.min(Math.max(cyMid - chefR.height * 0.18, stageR.top + 70), stageR.bottom - 60)
            };
        }
        const chefLeft = chefR.left, chefRight = chefR.right, chefTop = chefR.top, chefBottom = chefR.bottom;
        const shopLeft = shopR.left, shopRight = shopR.right, shopTop = shopR.top, shopBottom = shopR.bottom;
        let x;
        if (chefRight <= shopLeft) x = (chefRight + shopLeft) * 0.5;
        else if (shopRight <= chefLeft) x = (shopRight + chefLeft) * 0.5;
        else x = ((chefLeft + chefRight) * 0.5 + (shopLeft + shopRight) * 0.5) * 0.5;
        const vTop = Math.max(chefTop, shopTop);
        const vBot = Math.min(chefBottom, shopBottom);
        const y = vBot > vTop ? (vTop + vBot) * 0.5 : ((chefTop + chefBottom) * 0.5 + (shopTop + shopBottom) * 0.5) * 0.5;
        const pad = 28;
        return {
            x: Math.min(Math.max(x, stageR.left + pad), stageR.right - pad),
            y: Math.min(Math.max(y, stageR.top + 72), stageR.bottom - 72)
        };
    },
    _companionGridMetrics(col) {
        if (!col) return { gapPx: 8, cellW: 82, cellH: 82 };
        const styles = getComputedStyle(col);
        const gapPx = parseFloat(styles.gap || styles.columnGap || '8') || 8;
        const tracks = (styles.gridTemplateColumns || '').split(/\s+/).filter(Boolean);
        const rowTracks = (styles.gridTemplateRows || '').split(/\s+/).filter(Boolean);
        let cellW = 82, cellH = 82;
        if (tracks[0]) cellW = parseFloat(tracks[0]) || cellW;
        if (rowTracks[0]) cellH = parseFloat(rowTracks[0]) || cellH;
        const ref = col.querySelector('.companion-slot:not(.companion-slot-reserved)');
        if (ref && ref.offsetWidth > 4) cellW = ref.offsetWidth;
        if (ref && ref.offsetHeight > 4) cellH = ref.offsetHeight;
        return { gapPx, cellW, cellH };
    },
    companionGridLandPoint(c) {
        const col = document.getElementById('companion-column');
        const gp = this.HELPER_GRID_POS[c.id];
        if (!col || !gp || !this._usesDesktopHelperGrid()) return null;
        this.syncCompanionLayout();
        void col.offsetHeight;
        const cr = col.getBoundingClientRect();
        if (cr.width <= 4 || cr.height <= 4) return null;
        const { gapPx, cellW, cellH } = this._companionGridMetrics(col);
        const colIdx = gp[1] - 1;
        const rowIdx = gp[0] - 1;
        return {
            x: cr.left + colIdx * (cellW + gapPx) + cellW / 2,
            y: cr.top + rowIdx * (cellH + gapPx) + cellH / 2
        };
    },
    ensureHelperSlotLayout(c, cb) {
        const gp = this.HELPER_GRID_POS[c.id];
        if (!gp || !this._usesDesktopHelperGrid()) { cb(); return; }
        let left = 12;
        let done = false;
        const finish = () => { if (done) return; done = true; cb(); };
        const hardOut = setTimeout(finish, 320);
        const tick = () => {
            this.syncCompanionLayout();
            this.slot(c);
            const col = document.getElementById('companion-column');
            const s = document.getElementById(`slot-${c.id}`);
            if (col) void col.offsetHeight;
            const expected = this.companionGridLandPoint(c);
            if (expected && s) {
                const sr = s.getBoundingClientRect();
                if (sr.width > 4 && sr.height > 4) {
                    const sx = sr.left + sr.width / 2;
                    const sy = sr.top + sr.height / 2;
                    if (Math.abs(sx - expected.x) < 30 && Math.abs(sy - expected.y) < 30) { clearTimeout(hardOut); finish(); return; }
                }
                if (s.offsetWidth > 4 && s.offsetTop >= (gp[0] - 1) * (this._companionGridMetrics(col).cellH * 0.45)) {
                    clearTimeout(hardOut); finish(); return;
                }
            }
            if (expected && left <= 4) { clearTimeout(hardOut); finish(); return; }
            if (--left <= 0) { clearTimeout(hardOut); finish(); return; }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    },
    companionSlotLandPoint(c, cb) {
        const self = this;
        function measure(left) {
            self.syncCompanionLayout();
            self.slot(c);
            const col = document.getElementById('companion-column');
            const s = document.getElementById(`slot-${c.id}`);
            if (col) void col.offsetHeight;
            const gridPt = self.companionGridLandPoint(c);
            if (gridPt) {
                if (s) {
                    const sr = s.getBoundingClientRect();
                    if (sr.width > 4 && sr.height > 4) {
                        const sx = sr.left + sr.width / 2;
                        const sy = sr.top + sr.height / 2;
                        if (Math.abs(sx - gridPt.x) < 30 && Math.abs(sy - gridPt.y) < 30) {
                            cb(sx, sy);
                            return;
                        }
                    }
                }
                cb(gridPt.x, gridPt.y);
                return;
            }
            if (col && s && col.contains(s)) {
                const cr = col.getBoundingClientRect();
                const sr = s.getBoundingClientRect();
                if (sr.width > 4 && sr.height > 4) {
                    cb(sr.left + sr.width / 2, sr.top + sr.height / 2);
                    return;
                }
                if (cr.width > 4 && s.offsetWidth > 4) {
                    cb(cr.left + s.offsetLeft + s.offsetWidth / 2, cr.top + s.offsetTop + s.offsetHeight / 2);
                    return;
                }
            }
            if (left <= 0) { cb(null, null); return; }
            requestAnimationFrame(() => measure(left - 1));
        }
        measure(16);
    },
    summonLandClone(h, c, onLanded) {
        if (!h || !h.parentNode) { if (typeof onLanded === 'function') onLanded(); return; }
        this.companionSlotLandPoint(c, (lx, ly) => {
            const applyLand = () => {
                if (!h.parentNode) { if (typeof onLanded === 'function') onLanded(); return; }
                if (lx != null && ly != null) {
                    h.style.left = lx + 'px';
                    h.style.top = ly + 'px';
                } else {
                    const chip = document.getElementById('helpers-toggle');
                    const cr = (chip && chip.offsetParent !== null) ? chip.getBoundingClientRect() : null;
                    if (cr && cr.width) { h.style.left = (cr.left + cr.width / 2) + 'px'; h.style.top = (cr.top + cr.height / 2) + 'px'; }
                    else { h.style.left = '18%'; h.style.top = '82%'; }
                }
                h.style.transform = 'translate(-50%,-50%) scale(0.35) rotate(0deg)';
                if (typeof onLanded === 'function') setTimeout(onLanded, 320);
                const removeWhenPainted = (tries) => {
                    if (!h.parentNode) return;
                    const painted = h.complete && h.naturalWidth > 0;
                    const done = () => {
                        if (!h.parentNode) return;
                        if (this._mProdMobile && this._mProdMobile()) {
                            h.style.transition = 'opacity 0.2s ease';
                            h.style.opacity = '0';
                            setTimeout(() => { try { h.remove(); } catch (e) {} }, 220);
                        } else {
                            h.remove();
                        }
                    };
                    if (painted || tries <= 0) { done(); return; }
                    setTimeout(() => removeWhenPainted(tries - 1), 160);
                };
                setTimeout(() => removeWhenPainted(12), 1000);
            };
            requestAnimationFrame(() => requestAnimationFrame(applyLand));
        });
    },
    pickSummonIngredient(helperId, level) {
        const entry = this.SUMMON_INGREDIENTS[helperId];
        if (!entry) return null;
        const variants = entry.variants;
        if (!variants || !variants.length) return entry;
        const lv = Math.max(1, Math.floor(Number(level) || 1));
        return variants[lv % 2 === 1 ? 0 : 1] || variants[0];
    },
    summonImgForHelper(c) {
        try {
            const fam = collection.HELPER_FAM_BY_IDX[c.id];
            const eqId = fam ? collection.equippedIn(fam) : null;
            const skin = eqId ? collection.skinResolve(eqId) : null;
            if (skin && skin.img) return skin.img;
        } catch (e) {}
        try { return collection.HELPER_DEFAULT_IMG[c.id] || c.im; } catch (e2) {}
        return c.im;
    },
    helperSummonSrc(c) {
        let fallbackSrc = '';
        try { fallbackSrc = collection.HELPER_DEFAULT_IMG[c.id] || c.im || ''; } catch (e) { fallbackSrc = c.im || ''; }
        let primary = fallbackSrc;
        try { primary = this.summonImgForHelper(c) || fallbackSrc; } catch (e) {}
        let skinPng = '';
        try {
            const fam = collection.HELPER_FAM_BY_IDX[c.id];
            const eqId = fam ? collection.equippedIn(fam) : null;
            const skin = eqId ? collection.skinResolve(eqId) : null;
            if (skin && skin.img) skinPng = skin.img;
        } catch (e) {}
        return { src: primary || fallbackSrc, fb: skinPng || fallbackSrc, fb2: fallbackSrc };
    },
    // Pre-decode the exact sprite each helper will use on summon (equipped full-res
    // skin PNG, else default). Skin PNGs are large, so a COLD first decode used to
    // finish AFTER the summon clone was already removed — leaving "only particles, no
    // helper" (~1-in-N, cache dependent). Warming + holding a reference keeps them in
    // the decoded cache so the clone always has a painted bitmap ready. Re-run on init
    // and whenever equipment changes.
    _warmHelperSprites() {
        try {
            if (!this._warmImgs) this._warmImgs = {};
            const srcs = new Set();
            (this.cp || []).forEach(c => {
                if (!c) return;
                try { const s = this.summonImgForHelper(c); if (s) srcs.add(s); } catch (e) {}
                try { const d = collection.HELPER_DEFAULT_IMG[c.id]; if (d) srcs.add(d); } catch (e) {}
            });
            srcs.forEach(src => {
                if (this._warmImgs[src]) return;
                const im = new Image();
                im.decoding = 'async';
                im.addEventListener('error', () => {}, { passive: true });
                im.src = src;
                this._warmImgs[src] = im;
                try { if (im.decode) im.decode().catch(() => {}); } catch (e) {}
            });
        } catch (e) {}
    },
    isFeedMilestone(level) {
        const lv = Math.floor(Number(level) || 0);
        return lv > 0 && lv % (this.FEED_MILESTONE_EVERY || 4) === 0;
    },
    isExtraIngredientRainMilestone(level) {
        const lv = Math.floor(Number(level) || 0);
        const step = this.EXTRA_INGREDIENT_RAIN_EVERY || 10;
        return lv >= step && lv % step === 0;
    },
    _soupLiquidScreenRect() {
        const wrap = document.getElementById('soup-liquid');
        if (!wrap) return null;
        const r = wrap.getBoundingClientRect();
        return (r.width > 6 && r.height > 6) ? r : null;
    },
    _soupMaskedEllipseScreen() {
        const r = this._soupLiquidScreenRect();
        if (!r) return null;
        const cx = r.left + r.width * 0.47;
        const cy = r.top + r.height * 0.47;
        const rx = r.width * 0.33 * 0.66;
        const ry = r.height * 0.31 * 0.66;
        return { cx, cy, rx, ry };
    },
    _isInSoupEllipse(x, y, e) {
        if (!e || e.rx <= 0 || e.ry <= 0) return false;
        const dx = (x - e.cx) / e.rx;
        const dy = (y - e.cy) / e.ry;
        return dx * dx + dy * dy <= 1;
    },
    _stirHitEllipse() {
        const pot = document.getElementById('asset-soup');
        if (pot) {
            const r = pot.getBoundingClientRect();
            if (r.width > 6 && r.height > 6) {
                return {
                    cx: r.left + r.width * 0.47,
                    cy: r.top + r.height * 0.48,
                    rx: r.width * 0.44,
                    ry: r.height * 0.40
                };
            }
        }
        const e = this._soupMaskedEllipseScreen();
        if (!e) return null;
        const pad = 1.85;
        return { cx: e.cx, cy: e.cy, rx: e.rx * pad, ry: e.ry * pad };
    },
    _isStirHit(ev) {
        if (!ev) return false;
        const x = ev.clientX != null ? ev.clientX : ev.pageX;
        const y = ev.clientY != null ? ev.clientY : ev.pageY;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
        const ellipse = this._stirHitEllipse();
        return ellipse ? this._isInSoupEllipse(x, y, ellipse) : false;
    },
    _bindStirPointer() {
        const stage = document.getElementById('main-stage');
        if (!stage || stage._stirPtr) return;
        stage._stirPtr = true;
        stage.addEventListener('pointerdown', (ev) => {
            if (!this._isStirHit(ev)) return;
            this.click(ev);
        }, { passive: true });
    },
    _bindStirCursor() {
        const stage = document.getElementById('main-stage');
        if (!stage || stage._stirCur) return;
        stage._stirCur = true;
        const set = (ev) => {
            try { stage.classList.toggle('stir-hit', this._isStirHit(ev)); } catch (e) {}
        };
        stage.addEventListener('pointermove', set, { passive: true });
        stage.addEventListener('pointerleave', () => {
            try { stage.classList.remove('stir-hit'); } catch (e) {}
        }, { passive: true });
    },
    extraIngredientRain(helperId, level, visualOnly) {
        const dry = !!visualOnly;
        const entry = this.SUMMON_INGREDIENTS[helperId];
        if (!entry) return;
        const variants = entry.variants && entry.variants.length ? entry.variants : [entry];
        const cfgA = variants[0];
        const cfgB = variants[1] || variants[0];
        const primaryCfg = this.pickSummonIngredient(helperId, level) || cfgA;
        const c = this.cp[helperId];
        const funKey = 'extra_ing_rain_fun_' + helperId;
        try {
            const lines = [t('extra_ing_rain_title'), t('extra_ing_rain_sub', { name: t(c && c.nk ? c.nk : 'comp_coco'), lv: level })];
            const fun = t(funKey);
            if (fun !== funKey) lines.push(fun);
            gx.toast(lines.join('\n'));
        } catch (e) {}
        if (!dry) this.addBuff('cps', 1.1, 30, 'buff_extra_ing');
        try { sound.play('rainStart'); } catch (e) {}
        const ellipse = this._soupMaskedEllipseScreen();
        const soupY = ellipse ? ellipse.cy : this.soupPartOrigin().y;
        const low = quality.params.maxParts <= 30;
        const count = low ? (20 + Math.floor(Math.random() * 10)) : (32 + Math.floor(Math.random() * 14));
        const waveSpanMs = 2800 + Math.random() * 700;
        if (!dry) {
            const rainPopCount = low ? 2 : 3;
            for (let pi = 0; pi < rainPopCount; pi++) {
                const popAt = waveSpanMs * (0.2 + (pi + 0.35) / (rainPopCount + 0.5)) + Math.random() * 120;
                setTimeout(() => { try { sound.play('bubblePop'); } catch (e) {} }, popAt);
            }
        }
        const waves = 4;
        const fxA = cfgA.fx || 'banana';
        const fxB = cfgB.fx || fxA;
        let soupHits = 0;
        let midBubbles = false;
        let finished = 0;
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const marginX = Math.max(10, vw * 0.025);
        const endY = vh + 56 + Math.random() * 32;
        const dropOpacity = dry ? '0.45' : '1';
        for (let i = 0; i < count; i++) {
            const dropCfg = i % 2 === 0 ? cfgA : cfgB;
            const waveIdx = Math.min(waves - 1, Math.floor(i / Math.ceil(count / waves)));
            const idxInWave = i % Math.ceil(count / waves);
            const delay = (waveIdx / waves) * waveSpanMs * 0.82 + idxInWave * (waveSpanMs / count) + Math.random() * 140;
            setTimeout(() => {
                const dropGlyphs = dropCfg.glyphs || ['✨'];
                const dropColors = dropCfg.particleColors || ['#fde047', '#facc15'];
                const dropTint = dropCfg.rippleTint;
                const startX = marginX + Math.random() * (vw - marginX * 2);
                const drift = (Math.random() - 0.5) * vw * 0.07;
                const endX = startX + drift;
                const startY = -32 - Math.random() * Math.min(140, vh * 0.14);
                const fallDur = 2.5 + Math.random() * 1.0;
                const scale = 0.68 + Math.random() * 0.55;
                const rotStart = Math.round((Math.random() - 0.5) * 140);
                const rotEnd = rotStart + 200 + Math.random() * 260;
                const glyph = dropGlyphs[Math.floor(Math.random() * dropGlyphs.length)];
                const el = document.createElement('div');
                el.className = 'ingredient-proj' + (dry ? ' ingredient-proj-dry' : '');
                el.textContent = glyph;
                el.style.left = startX + 'px';
                el.style.top = startY + 'px';
                el.style.transform = 'translate(-50%,-50%) scale(' + scale + ') rotate(' + rotStart + 'deg)';
                el.style.opacity = dropOpacity;
                el.style.transition = 'none';
                document.body.appendChild(el);
                requestAnimationFrame(() => {
                    const fadeAt = (fallDur * 0.86).toFixed(2);
                    el.style.transition = 'left ' + fallDur + 's cubic-bezier(0.42, 0, 0.58, 1), top ' + fallDur + 's cubic-bezier(0.55, 0.04, 0.85, 0.92), transform ' + fallDur + 's linear, opacity 0.32s ease ' + fadeAt + 's';
                    el.style.left = endX + 'px';
                    el.style.top = endY + 'px';
                    el.style.transform = 'translate(-50%,-50%) scale(' + (scale * 0.82) + ') rotate(' + rotEnd + 'deg)';
                    el.style.webkitTransform = el.style.transform;
                    el.style.opacity = '0';
                });
                if (!dry) {
                    const pathLen = endY - startY;
                    const frac = pathLen > 8 ? Math.max(0, Math.min(1, (soupY - startY) / pathLen)) : -1;
                    if (frac > 0.04 && frac < 0.96) {
                        const hitTime = fallDur * frac;
                        const hitX = startX + drift * frac;
                        const inSoup = this._isInSoupEllipse(hitX, soupY, ellipse);
                        setTimeout(() => {
                            if (!inSoup) return;
                            soupHits++;
                            const rotHit = Math.round(rotStart + (rotEnd - rotStart) * frac);
                            const bounce = scale * (1.1 + Math.random() * 0.14);
                            el.style.transition = 'transform 0.18s cubic-bezier(0.34, 1.45, 0.64, 1)';
                            el.style.transform = 'translate(-50%,-50%) scale(' + bounce + ') rotate(' + rotHit + 'deg)';
                            setTimeout(() => {
                                el.style.transition = 'transform 0.26s ease-out';
                                el.style.transform = 'translate(-50%,-50%) scale(' + (scale * 0.76) + ') rotate(' + (rotHit + 18) + 'deg)';
                            }, 170);
                            this.emitSplashParticle(hitX, soupY, dropColors[Math.floor(Math.random() * dropColors.length)]);
                            if (soupHits % 4 === 0) this.spawnRipple(hitX, soupY, dropTint);
                            if (!midBubbles && soupHits >= Math.ceil(count * 0.26)) {
                                midBubbles = true;
                                if (!this._soupFxTouch()) {
                                    this.spawnSoupColoredBubbles(fxA);
                                    if (fxB !== fxA) this.spawnSoupColoredBubbles(fxB);
                                }
                            }
                        }, hitTime * 1000);
                    }
                }
                setTimeout(() => {
                    finished++;
                    if (el.parentNode) el.remove();
                    if (!dry && finished >= count) setTimeout(() => this.soupIngredientHit(primaryCfg, 'bubblePop', { rainLite: true }), 90);
                }, Math.ceil(fallDur * 1000) + 480);
            }, delay);
        }
    },
    chefMouthOrigin() {
        const a = this.CHEF_MOUTH_ANCHOR || { x: 0.47, y: 0.34, w: 0.09, h: 0.055 };
        const chef = document.getElementById('asset-chef');
        if (!chef) return { x: window.innerWidth * 0.42, y: window.innerHeight * 0.28, w: 40, h: 24 };
        const r = chef.getBoundingClientRect();
        return { x: r.left + r.width * a.x, y: r.top + r.height * a.y, w: r.width * a.w, h: r.height * a.h };
    },
    _chefFaceTintFilter(tint) {
        const glow = tint.glow || this.hexA(tint.core, 0.55);
        return `${tint.filter} brightness(1.28) saturate(1.35) drop-shadow(0 0 18px ${glow}) drop-shadow(0 0 34px ${glow})`;
    },
    hexA(hex, a) { try { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; } catch (e) { return `rgba(148,163,184,${a})`; } },
    _pickChefFeedFaceTint() {
        const palette = this.CHEF_FEED_FACE_PALETTE || [];
        if (!palette.length) return { id: 'gold', core: '#ffd020', mid: '#ffe060', filter: 'sepia(0.36) saturate(2) hue-rotate(48deg) brightness(1.17)', glow: 'rgba(255, 208, 32, 0.55)' };
        let idx;
        do { idx = Math.floor(Math.random() * palette.length); } while (palette.length > 1 && palette[idx].id === this._lastChefFeedFaceColor);
        this._lastChefFeedFaceColor = palette[idx].id;
        const pick = palette[idx];
        return { ...pick, glow: this.hexA(pick.core, 0.55) };
    },
    _applyChefFaceTint() {
        const glowOnly = !!(this._mProdMobile && this._mProdMobile());
        const tint = this._pickChefFeedFaceTint();
        const filter = tint.filter;
        const glowColor = tint.glow;
        const coreHex = tint.core;
        const midHex = tint.mid;
        const faceFilter = this._chefFaceTintFilter(tint);
        const els = glowOnly ? [] : [document.getElementById('asset-chef')];
        const rig = this._chefRigEl();
        if (this._chefTintTimer) clearTimeout(this._chefTintTimer);
        if (rig) {
            rig.classList.remove('chef-face-glow', 'chef-face-glow-mobile');
            rig.style.setProperty('--chef-glow-color', glowColor);
            rig.style.setProperty('--chef-glow-core', this.hexA(coreHex, glowOnly ? 0.94 : 0.82));
            rig.style.setProperty('--chef-glow-mid', this.hexA(midHex, glowOnly ? 0.62 : 0.48));
            void rig.offsetWidth;
            rig.classList.add(glowOnly ? 'chef-face-glow-mobile' : 'chef-face-glow');
        }
        if (!glowOnly) {
            els.forEach(el => {
                if (!el) return;
                el.classList.remove('chef-face-tint', 'chef-face-tint-fade');
                el.style.setProperty('--chef-tint-filter', filter);
                el.style.setProperty('--chef-face-filter', faceFilter);
                void el.offsetWidth;
                el.classList.add('chef-face-tint', 'chef-face-tint-fade');
            });
        }
        this._chefTintTimer = setTimeout(() => {
            if (!glowOnly) {
                els.forEach(el => {
                    if (!el) return;
                    el.classList.remove('chef-face-tint', 'chef-face-tint-fade');
                    el.style.removeProperty('--chef-tint-filter');
                    el.style.removeProperty('--chef-face-filter');
                    el.style.removeProperty('filter');
                });
            }
            if (rig) {
                rig.classList.remove('chef-face-glow', 'chef-face-glow-mobile');
                rig.style.removeProperty('--chef-glow-color');
                rig.style.removeProperty('--chef-glow-core');
                rig.style.removeProperty('--chef-glow-mid');
            }
        }, 2600);
    },
    _chefRigEl() { return document.getElementById('chef-rig'); },
    chefFeedAnticipateOpen() {
        if (this._chefMouthChewActive) return;
        try { this._chefWarmMouthSprites(); } catch (e) {}
        this._chefFeedSeq = (this._chefFeedSeq || 0) + 1;
        if (this._chefMouthCloseTimer) {
            clearTimeout(this._chefMouthCloseTimer);
            this._chefMouthCloseTimer = null;
        }
        if (this._chefFeedPendingTimer) {
            clearTimeout(this._chefFeedPendingTimer);
            this._chefFeedPendingTimer = null;
        }
        this._chefMouthStopAnim();
        this._setChefEating(true, true);
        try { this.applySpoonVisual(); } catch (e) {}
        this._chefMouthShowOpen();
        if (this._mProdMobile && this._mProdMobile()) {
            try { this._applyChefFaceTint(); } catch (e) {}
        }
        const seq = this._chefFeedSeq;
        this._chefFeedPendingTimer = setTimeout(() => {
            if (seq !== this._chefFeedSeq || this._chefMouthChewActive) return;
            this.chefFeedClose();
        }, 4500);
    },
    chefFeedClose() {
        if (this._chefFeedPendingTimer) {
            clearTimeout(this._chefFeedPendingTimer);
            this._chefFeedPendingTimer = null;
        }
        this._chefMouthStopAnim();
        if (this._chefMouthCloseTimer) {
            clearTimeout(this._chefMouthCloseTimer);
            this._chefMouthCloseTimer = null;
        }
        this._chefMouthShowClosed();
        this._setChefEating(false);
        try { this.applySpoonVisual(); } catch (e) {}
    },
    chefFeedHit(cfg) {
        try { chefMood.bump(6, 'feed'); } catch (e) {}
        if (!(this._mProdMobile && this._mProdMobile())) this._applyChefFaceTint();
        if (this._mProdMobile && this._mProdMobile()) return;
        const mouth = this.chefMouthOrigin();
        const colors = (cfg && cfg.particleColors) || ['#fde047', '#facc15'];
        for (let i = 0; i < 10; i++) {
            this.emitSplashParticle(mouth.x + (Math.random() - 0.5) * 28, mouth.y + (Math.random() - 0.5) * 16, colors[Math.floor(Math.random() * colors.length)]);
        }
    },
    _endChefFeedChew(seq) {
        if (seq !== this._chefFeedSeq || this._chefFeedFinished === seq) return;
        this._chefFeedFinished = seq;
        if (this._chefMouthCloseTimer) {
            clearTimeout(this._chefMouthCloseTimer);
            this._chefMouthCloseTimer = null;
        }
        this._chefMouthStopChewLoop();
        this._chefMouthShowClosed();
        this._setChefEating(false);
        try { this.applySpoonVisual(); } catch (e) {}
        try { sound.stopEat(); } catch (e) {}
    },
    chefFeedEatSequence() {
        if (this._chefMouthChewActive) return;
        if (this._chefFeedPendingTimer) {
            clearTimeout(this._chefFeedPendingTimer);
            this._chefFeedPendingTimer = null;
        }
        if (this._chefMouthCloseTimer) {
            clearTimeout(this._chefMouthCloseTimer);
            this._chefMouthCloseTimer = null;
        }
        this._chefMouthStopChewLoop();
        if (!this._chefEl()) return;
        const seq = this._chefFeedSeq || 0;
        this._chefFeedFinished = null;
        const liteFeed = this._mProdMobile && this._mProdMobile();
        let chewMs = this.CHEF_FALLBACK_EAT_MS || 2000;
        try {
            sound.unlock();
            sound.stopEat();
            if (!sound.muted && sound.volume > 0) {
                const dur = sound.playEat();
                if (dur) chewMs = Math.max(chewMs, dur);
            }
        } catch (e) {}
        if (liteFeed) chewMs = Math.max(1500, Math.min(chewMs, 2200));
        else chewMs = Math.max(this.CHEF_FALLBACK_EAT_MS || 2000, chewMs);
        if (liteFeed) {
            try { this._chefWarmMouthSprites(); } catch (e) {}
            this._runChefMouthChewLoop(380, this.CHEW_LITE_MAX_TOGGLES != null ? this.CHEW_LITE_MAX_TOGGLES : 4);
        } else {
            this._chefMouthChewActive = true;
            this._setChefEating(true, true);
            try { this.applySpoonVisual(); } catch (e) {}
            let isOpen = true;
            let togglesLeft = this.CHEW_MAX_TOGGLES != null ? this.CHEW_MAX_TOGGLES : 3;
            this._chefMouthShowOpen();
            const sliceMs = this.CHEW_SLICE_MS || 500;
            this._chewIv = setInterval(() => {
                if (!this._chefMouthChewActive || togglesLeft <= 0) return;
                togglesLeft--;
                isOpen = !isOpen;
                if (isOpen) this._chefMouthShowOpen();
                else this._chefMouthShowClosed();
                if (togglesLeft <= 0) this._chefMouthStopChewLoop();
            }, sliceMs);
        }
        this._chefMouthCloseTimer = setTimeout(() => this._endChefFeedChew(seq), chewMs + 80);
        if (!liteFeed) { try { gx.toast(t('chef_taste_ingredient')); } catch (e) {} }
    },
    summonIngredientThrow(helperId, fromX, fromY, level, onComplete, feedMode, visualOnly) {
        const cfg = this.pickSummonIngredient(helperId, level != null ? level : (this.cp[helperId] && this.cp[helperId].lv));
        if (!cfg) { if (typeof onComplete === 'function') onComplete(); return; }
        const dry = !!visualOnly;
        const toChef = !!feedMode;
        const o = toChef ? this.chefMouthOrigin() : this.soupPartOrigin();
        const glyphs = cfg.glyphs || ['✨'];
        let count = cfg.count || 5;
        let stagger = cfg.stagger || 110;
        try {
            if (toChef && typeof game !== 'undefined' && game._mProdMobile && game._mProdMobile()) {
                count = Math.min(2, count);
                stagger = Math.min(stagger, 85);
            }
        } catch (e) {}
        const spread = toChef ? Math.min(cfg.spread || 32, 16) : (cfg.spread || 32);
        const startRot = cfg.startRot != null ? cfg.startRot : -20;
        const endRot = cfg.endRot != null ? cfg.endRot : 140;
        const endScale = cfg.endScale != null ? cfg.endScale : 0.98;
        const startScale = cfg.startScale != null ? cfg.startScale : 1.55;
        const arcLift = Math.max(42, Math.min(72, (fromY - o.y) * 0.22 + 48));
        const endYOffset = toChef ? 0 : 8;
        if (toChef && !dry) {
            try { this.chefFeedAnticipateOpen(); } catch (e) { console.warn('chefFeedAnticipateOpen', e); }
        }
        for (let i = 0; i < count; i++) {
            setTimeout(() => {
                const el = document.createElement('div');
                el.className = 'ingredient-proj' + (dry ? ' ingredient-proj-dry' : '');
                el.textContent = glyphs[i % glyphs.length];
                el.style.left = fromX + 'px';
                el.style.top = fromY + 'px';
                el.style.transform = `translate(-50%,-50%) scale(${startScale}) rotate(${startRot}deg)`;
                el.style.opacity = dry ? '0.45' : '1';
                document.body.appendChild(el);
                requestAnimationFrame(() => {
                    const off = (i - (count - 1) / 2) * spread;
                    const endX = o.x + off;
                    const endY = o.y + endYOffset;
                    const arcY = Math.min(fromY, endY) - arcLift - Math.abs(off) * 0.1;
                    const midX = fromX + (endX - fromX) * 0.48;
                    el.style.transition = 'left 0.46s cubic-bezier(0.42, 0, 0.58, 1), top 0.46s cubic-bezier(0.33, 0, 0.2, 1), transform 0.46s ease-in';
                    el.style.left = midX + 'px';
                    el.style.top = arcY + 'px';
                    setTimeout(() => {
                        el.style.transition = 'left 0.64s cubic-bezier(0.22, 1, 0.36, 1), top 0.64s cubic-bezier(0.22, 1, 0.36, 1), transform 0.64s ease-in, opacity 0.20s ease 0.46s';
                        el.style.left = endX + 'px';
                        el.style.top = endY + 'px';
                        el.style.transform = `translate(-50%,-50%) scale(${endScale}) rotate(${endRot}deg)`;
                        el.style.opacity = '0';
                    }, 460);
                });
                setTimeout(() => {
                    if (!el.parentNode) return;
                    if (typeof game !== 'undefined' && game._mProdMobile && game._mProdMobile()) {
                        el.style.visibility = 'hidden';
                        requestAnimationFrame(() => { try { if (el.parentNode) el.remove(); } catch (e) {} });
                    } else if (el.parentNode) el.remove();
                }, 1320);
                if (i === count - 1) {
                    setTimeout(() => {
                        if (!dry) {
                            if (toChef) {
                                try { this.chefFeedHit(cfg); } catch (e) { console.warn('chefFeedHit', e); }
                                this.chefFeedEatSequence();
                            } else {
                                try { this.soupIngredientHit(cfg); } catch (e) {}
                            }
                        }
                        const delay = dry ? 420 : (toChef ? 880 : this.SOUP_ING_FX_MS);
                        if (typeof onComplete === 'function') setTimeout(onComplete, delay);
                    }, 1100);
                }
            }, i * stagger);
        }
    },
    emitSplashParticle(x, y, color) {
        const MAX = quality.params.maxParts;
        if (this.particles.length >= MAX) return;
        this.particles.push({ x, y, t: 'ingredient', vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - 5, life: 1, size: Math.random() * 8 + 4, color: color || '#fde047' });
    },
    spawnSoupCanvasBubbles(cx, cy, colors, count) {
        const MAX = quality.params.maxParts;
        const n = Math.max(1, Math.min(count || 10, 16));
        const room = MAX - this.particles.length;
        if (room <= 0) return;
        const spawn = Math.min(n, room);
        for (let i = 0; i < spawn; i++) {
            this.particles.push({
                x: cx + (Math.random() - 0.5) * 56,
                y: cy + (Math.random() - 0.5) * 24,
                t: 'soupBubble',
                vx: (Math.random() - 0.5) * 0.7,
                vy: -(Math.random() * 1.1 + 0.65),
                life: 0.78 + Math.random() * 0.22,
                size: 3.5 + Math.random() * 6.5,
                color: colors[Math.floor(Math.random() * colors.length)] || '#fde047'
            });
        }
    },
    _soupFxBurst() { return document.getElementById('soup-fx-burst'); },
    _kickSoupFxAnim(el) {
        if (!el || !el.parentNode) return;
        if (this._soupFxTouch && this._soupFxTouch()) return;
        if (this._mProdMobile && this._mProdMobile()) return;
        requestAnimationFrame(() => {
            if (!el.parentNode) return;
            try {
                const runs = el.getAnimations ? el.getAnimations() : [];
                runs.forEach(a => { try { if (a.playState === 'paused') a.play(); } catch (e) {} });
            } catch (e) {}
        });
    },
    _soupFxFinishEl(el, ms) {
        if (!el) return;
        const cleanup = () => {
            if (!el.parentNode || el.dataset.fxDone === '1') return;
            el.dataset.fxDone = '1';
            try { el.remove(); } catch (e) {}
        };
        setTimeout(cleanup, ms + 60);
    },
    _soupFxClearBurst(burst) {
        if (!burst) return;
        try {
            burst.querySelectorAll('.sfx-k-bubble, .sfx-part, .sfx-k-pop-ring').forEach(el => {
                if (el.dataset.fxDone === '1') return;
                el.dataset.fxDone = '1';
                try { el.remove(); } catch (e) {}
            });
        } catch (e) { try { burst.textContent = ''; } catch (e2) {} }
    },
    _soupFxTouch() {
        try {
            if (this._mSheet && this._mSheet()) return true;
            return window.matchMedia('(pointer: coarse)').matches;
        } catch (e) { return false; }
    },
    _soupBubbleRisePx(area) {
        const touch = this._soupFxTouch();
        const h = Math.max(48, area && area.h ? area.h : 120);
        const liquidH = h * 0.28;
        if (touch) {
            const rise = liquidH * (0.08 + Math.random() * 0.06);
            return Math.max(5, Math.min(18, Math.round(rise)));
        }
        const rise = liquidH * (0.14 + Math.random() * 0.10);
        return Math.max(8, Math.min(32, Math.round(rise)));
    },
    _soupFxEl(tag, className, opts) {
        const burst = this._soupFxBurst();
        if (!burst) return null;
        const el = document.createElement(tag || 'div');
        el.className = className;
        if (opts.text != null) el.textContent = opts.text;
        if (opts.left != null) el.style.left = opts.left;
        if (opts.top != null) el.style.top = opts.top;
        if (opts.style) Object.assign(el.style, opts.style);
        if (opts.css) { for (const k in opts.css) el.style.setProperty(k, opts.css[k]); }
        if (opts.delay != null) el.style.animationDelay = opts.delay + 's';
        burst.appendChild(el);
        if (className.indexOf('sfx-k-bubble') >= 0 || className.indexOf('sfx-part') >= 0) this._kickSoupFxAnim(el);
        const ms = (opts.lifeMs != null ? opts.lifeMs : 2400);
        this._soupFxFinishEl(el, ms);
        return el;
    },
    _bubbleGradient(color) {
        return `radial-gradient(circle at 32% 26%, rgba(255,255,255,0.78) 0%, ${color} 34%, ${color} 100%)`;
    },
    _soupLiquidSpawnRect() {
        const wrap = document.getElementById('soup-liquid');
        if (!wrap) return { padL: 6, padT: 5, padR: 94, padB: 92, w: 1, h: 1 };
        const r = wrap.getBoundingClientRect();
        const pad = Math.max(4, Math.min(r.width, r.height) * 0.05);
        return {
            padL: (pad / r.width) * 100,
            padT: (pad / r.height) * 100,
            padR: 100 - (pad / r.width) * 100,
            padB: 100 - (pad / r.height) * 100,
            w: r.width,
            h: r.height
        };
    },
    _pickBubbleSize(spec) {
        const smin = (spec.size && spec.size[0]) || 10;
        const smax = (spec.size && spec.size[1]) || 42;
        const roll = Math.random();
        if (roll < 0.38) return smin + Math.random() * Math.min(7, (smax - smin) * 0.22);
        if (roll < 0.72) return smin + (smax - smin) * 0.28 + Math.random() * (smax - smin) * 0.32;
        return smin + (smax - smin) * 0.58 + Math.random() * (smax - smin) * 0.42;
    },
    spawnSoupColoredBubbles(fxId, opts) {
        opts = opts || {};
        const spec = this.SOUP_FX_BUBBLES[fxId] || this.SOUP_FX_BUBBLES.banana;
        const colors = spec.colors;
        const touch = this._soupFxTouch();
        const motion = touch ? 'rise' : (spec.motion || 'rise');
        const area = this._soupLiquidSpawnRect();
        const areaFactor = Math.min(1.15, Math.max(0.9, (area.w * area.h) / 420000));
        const rainLite = !!opts.rainLite;
        const base = spec.count || 42;
        const maxN = touch ? (rainLite ? 14 : 18) : (this.SOUP_FX_BUBBLE_MAX || 58);
        const n = Math.min(Math.round(base * areaFactor * (touch ? (rainLite ? 0.42 : 0.52) : 1)), maxN);
        const spawnWindowMs = touch ? (380 + Math.floor(Math.random() * 160)) : (820 + Math.floor(Math.random() * 360));
        const waves = touch ? 4 : 5;
        const perWave = Math.ceil(n / waves);
        let spawned = 0;
        const spawnOne = (waveIdx, idxInWave) => {
            if (spawned >= n) return;
            spawned++;
            const c = colors[Math.floor(Math.random() * colors.length)];
            const szRaw = Math.round(this._pickBubbleSize(spec));
            const sz = touch ? Math.max(6, Math.round(szRaw * (rainLite ? 0.58 : 0.66))) : szRaw;
            const left = (area.padL + Math.random() * (area.padR - area.padL)).toFixed(2) + '%';
            const top = (area.padT + Math.random() * (area.padB - area.padT)).toFixed(2) + '%';
            const rise = this._soupBubbleRisePx(area);
            const rise2off = touch ? 3 : 14;
            const bx = Math.round((Math.random() - 0.5) * (touch ? 16 : 36));
            const waveDelay = (waveIdx / waves) * spawnWindowMs;
            const jitter = idxInWave * (touch ? 9 : 18) + Math.random() * (touch ? 28 : 55);
            const delay = ((waveDelay + jitter) / 1000).toFixed(3);
            const dur = (touch ? (0.52 + Math.random() * 0.18) : (1.55 + Math.random() * 0.65)).toFixed(2);
            const sizeCss = touch
                ? { width: sz + 'px', height: sz + 'px' }
                : {
                    width: 'clamp(' + Math.round(sz * 0.65) + 'px, ' + (sz * 0.22).toFixed(1) + 'vw, ' + sz + 'px)',
                    height: 'clamp(' + Math.round(sz * 0.65) + 'px, ' + (sz * 0.22).toFixed(1) + 'vw, ' + sz + 'px)'
                };
            this._soupFxEl('div', 'sfx-k-bubble ' + motion, {
                left, top, delay: parseFloat(delay),
                css: Object.assign({
                    '--bd': dur + 's',
                    '--be': touch ? 'linear' : 'ease-out',
                    '--rise': rise + 'px',
                    '--rise2': (rise + rise2off) + 'px',
                    '--bx': bx + 'px',
                    '--bx2': (bx + Math.round((Math.random() - 0.5) * (touch ? 12 : 22))) + 'px',
                    '--sw': Math.round(280 + Math.random() * 200) + 'deg',
                    '--sr': Math.round(18 + Math.random() * 28) + 'px',
                    '--bb-glow': c,
                    background: this._bubbleGradient(c)
                }, sizeCss),
                lifeMs: parseFloat(dur) * 1000 + parseFloat(delay) * 1000 + 500
            });
            if (!touch && (motion === 'rise-pop' || motion === 'bounce')) {
                if (Math.random() > 0.5) {
                    setTimeout(() => {
                        this._soupFxEl('div', 'sfx-k-pop-ring', {
                            left, top: 'calc(' + top + ' - ' + Math.round(rise * 0.65) + 'px)',
                            css: { '--pop-c': c + 'cc', width: sz + 'px', height: sz + 'px' },
                            lifeMs: 500
                        });
                    }, (parseFloat(delay) + parseFloat(dur) * 0.72) * 1000);
                }
            }
        };
        for (let w = 0; w < waves; w++) {
            for (let j = 0; j < perWave; j++) spawnOne(w, j);
        }
    },
    _soupFxInk() {
        const clouds = [[47, 47, '#7c3aed', 0, 0, 120], [44, 50, '#581c87', -18, -8, 200], [50, 44, '#a78bfa', 16, 10, 160]];
        clouds.forEach(([lx, ty, col, tx, ty2, rot], i) => {
            this._soupFxEl('div', 'sfx-part sfx-ink-cloud', {
                left: lx + '%', top: ty + '%', delay: i * 0.08,
                css: { background: `radial-gradient(circle, ${col}ee, ${col}66 55%, transparent 78%)`, '--tx': tx + 'px', '--ty': ty2 + 'px', '--tx2': (tx * 1.4) + 'px', '--ty2': (ty2 - 12) + 'px', '--rot': rot + 'deg' }
            });
        });
        for (let i = 0; i < 9; i++) {
            this._soupFxEl('span', 'sfx-part sfx-ink-star', {
                left: (38 + Math.random() * 24) + '%', top: (40 + Math.random() * 14) + '%',
                text: ['✨', '⭐', '💜'][i % 3], delay: 0.55 + i * 0.07
            });
        }
    },
    _soupFxShrimp() {
        const area = this._soupLiquidSpawnRect();
        const touch = this._soupFxTouch();
        const n = touch ? 8 : 14;
        const dur = touch ? '0.72s' : '';
        for (let i = 0; i < n; i++) {
            const rise = this._soupBubbleRisePx(area);
            const col = ['#fb7185', '#fda4af', '#fecdd3'][i % 3];
            this._soupFxEl('div', 'sfx-part sfx-shrimp-bubble', {
                left: (36 + Math.random() * 28) + '%', top: (48 + Math.random() * 10) + '%',
                delay: i * (touch ? 0.04 : 0.05),
                style: dur ? { animationDuration: dur } : undefined,
                css: { '--rise': rise + 'px', background: this._bubbleGradient(col) }
            });
        }
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const lx = (38 + Math.random() * 24) + '%';
                const ty = (36 + Math.random() * 12) + '%';
                this._soupFxEl('div', 'sfx-part sfx-shrimp-pop', {
                    left: lx, top: ty, delay: 0,
                    css: { background: 'radial-gradient(circle, rgba(251,113,133,0.7), transparent 70%)' }
                });
            }, 400 + i * 120);
        }
    },
    _soupFxCarrot() {
        this._soupFxEl('span', 'sfx-part sfx-carrot-orbit', { left: '47%', top: '47%', text: '🥕' });
        for (let i = 0; i < 3; i++) {
            this._soupFxEl('span', 'sfx-part sfx-carrot-orbit', {
                left: '47%', top: '47%', text: '🥕', delay: 0.15 + i * 0.2,
                style: { animationDuration: (1.5 + i * 0.15) + 's', fontSize: 'clamp(0.85rem, 2.2vw, 1.2rem)' }
            });
        }
    },
    _soupFxLettuce() {
        for (let i = 0; i < 12; i++) {
            const col = ['#22c55e', '#4ade80', '#86efac', '#6ee7b7'][i % 4];
            this._soupFxEl('div', 'sfx-part sfx-leaf-petal', {
                left: (30 + Math.random() * 40) + '%', top: (28 + Math.random() * 8) + '%',
                delay: i * 0.07,
                css: { background: col, '--lr': Math.round(Math.random() * 360) + 'deg' }
            });
        }
        for (let i = 0; i < 8; i++) {
            this._soupFxEl('span', 'sfx-part sfx-leaf-spark', {
                left: (35 + Math.random() * 30) + '%', top: (42 + Math.random() * 12) + '%',
                text: '✨', delay: 0.2 + i * 0.08
            });
        }
    },
    _soupFxCorn() {
        const spots = [[42, 44], [47, 46], [52, 43], [45, 50], [50, 48], [44, 47], [48, 45]];
        spots.forEach(([lx, ty], i) => {
            setTimeout(() => {
                this._soupFxEl('div', 'sfx-part sfx-corn-flash', { left: '0', top: '0', delay: 0, lifeMs: 400 });
                this._soupFxEl('div', 'sfx-part sfx-corn-kernel', {
                    left: lx + '%', top: ty + '%', delay: 0,
                    css: { background: `radial-gradient(circle at 40% 35%, #fef08a, #fbbf24 60%, #f59e0b)` }
                });
            }, i * 130);
        });
    },
    _soupFxYolk() {
        for (let i = 0; i < 10; i++) {
            const deg = i * 36;
            this._soupFxEl('div', 'sfx-part sfx-yolk-ray', {
                left: '47%', top: '47%', delay: i * 0.02,
                css: { '--ray': deg + 'deg', background: 'linear-gradient(to top, rgba(253,224,71,0.85), rgba(254,240,138,0.2))' }
            });
        }
        for (let i = 0; i < 5; i++) {
            this._soupFxEl('span', 'sfx-part sfx-yolk-heart', {
                left: (40 + i * 4) + '%', top: (44 + Math.random() * 6) + '%',
                text: '💛', delay: 0.15 + i * 0.1
            });
        }
    },
    _soupFxHoney() {
        for (let i = 0; i < 4; i++) {
            this._soupFxEl('div', 'sfx-part sfx-honey-ring', {
                left: '47%', top: '47%', delay: i * 0.22,
                css: { borderColor: 'rgba(251,191,36,' + (0.85 - i * 0.12) + ')' }
            });
        }
        for (let i = 0; i < 3; i++) {
            this._soupFxEl('div', 'sfx-part sfx-honey-drip', {
                left: (42 + i * 5) + '%', top: (36 + i * 2) + '%', delay: i * 0.18,
                css: { background: 'linear-gradient(180deg, #fbbf24, #d97706)' }
            });
        }
    },
    _soupFxBerries() {
        const emojis = ['🫐', '🍓', '🫐', '🍓', '🫐', '🍓', '🍇', '🍒'];
        emojis.forEach((em, i) => {
            const ang = (i / emojis.length) * Math.PI * 2;
            const r1 = 18 + Math.random() * 14;
            const r2 = r1 + 10 + Math.random() * 8;
            this._soupFxEl('span', 'sfx-part sfx-berry-emoji', {
                left: '47%', top: '47%', text: em, delay: i * 0.06,
                css: {
                    '--bx': Math.round(Math.cos(ang) * r1) + 'px', '--by': Math.round(Math.sin(ang) * r1) + 'px',
                    '--bx2': Math.round(Math.cos(ang) * r2) + 'px', '--by2': Math.round(Math.sin(ang) * r2) + 'px',
                    '--br': Math.round(ang * 57) + 'deg'
                }
            });
        });
        for (let i = 0; i < 14; i++) {
            const ang = Math.random() * Math.PI * 2;
            const r = 8 + Math.random() * 22;
            const col = ['#a855f7', '#ec4899', '#ef4444', '#f472b6'][i % 4];
            this._soupFxEl('div', 'sfx-part sfx-berry-juice', {
                left: '47%', top: '47%', delay: 0.08 + i * 0.04,
                css: {
                    background: col,
                    '--jx': Math.round(Math.cos(ang) * r) + 'px', '--jy': Math.round(Math.sin(ang) * r) + 'px',
                    '--jx2': Math.round(Math.cos(ang) * (r + 12)) + 'px', '--jy2': Math.round(Math.sin(ang) * (r + 12)) + 'px'
                }
            });
        }
    },
    _soupFxBanana() {
        this._soupFxEl('div', 'sfx-part sfx-banana-arc', { left: '47%', top: '46%', delay: 0 });
        for (let i = 0; i < 3; i++) {
            this._soupFxEl('span', 'sfx-part sfx-banana-slide', {
                left: (42 + i * 4) + '%', top: (44 + i * 2) + '%', text: '🍌', delay: i * 0.12
            });
        }
    },
    _soupFxCoconut() {
        this._soupFxEl('div', 'sfx-part sfx-coco-puff', {
            left: '47%', top: '47%', delay: 0,
            css: { background: 'radial-gradient(circle, rgba(255,255,255,0.85), rgba(254,243,199,0.4) 55%, transparent 75%)' }
        });
        for (let i = 0; i < 10; i++) {
            const col = ['#ffffff', '#fef3c7', '#d6d3d1'][i % 3];
            this._soupFxEl('div', 'sfx-part sfx-coco-swirl', {
                left: '47%', top: '47%', delay: i * 0.06,
                css: { background: col, '--sr': Math.round(300 + Math.random() * 180) + 'deg' }
            });
        }
        this._soupFxEl('span', 'sfx-part sfx-coco-half', { left: '40%', top: '46%', text: '🥥', delay: 0.1 });
        this._soupFxEl('span', 'sfx-part sfx-coco-half', { left: '54%', top: '46%', text: '🥥', delay: 0.18, style: { transform: 'scaleX(-1)' } });
    },
    _runSoupFxUnique(fxId) {
        const fn = {
            ink: () => this._soupFxInk(),
            shrimp: () => this._soupFxShrimp(),
            carrot: () => this._soupFxCarrot(),
            lettuce: () => this._soupFxLettuce(),
            corn: () => this._soupFxCorn(),
            yolk: () => this._soupFxYolk(),
            honey: () => this._soupFxHoney(),
            berries: () => this._soupFxBerries(),
            banana: () => this._soupFxBanana(),
            coconut: () => this._soupFxCoconut()
        }[fxId];
        if (fn) fn();
    },
    _isSoupIngredientSplashActive() {
        const wrap = document.getElementById('soup-liquid');
        return !!(wrap && wrap.classList.contains('ingredient-splash-active'));
    },
    _resetSoupLiquidMotion() {
        const sl = this._soupLiquidEl || (this._soupLiquidEl = document.getElementById('asset-soup-liquid'));
        if (!sl) return;
        try {
            if (sl.getAnimations) sl.getAnimations().forEach(a => { try { a.cancel(); } catch (e) {} });
        } catch (e) {}
        sl.style.removeProperty('animation');
        sl.style.transform = '';
    },
    _finishSoupIngredientSplash(wrap, fxId) {
        if (!wrap) return;
        const touchFx = this._soupFxTouch && this._soupFxTouch();
        wrap.classList.remove('ingredient-splash-active', 'ing-fx-' + fxId);
        wrap.classList.remove('ing-fx-ink', 'ing-fx-shrimp', 'ing-fx-carrot', 'ing-fx-lettuce', 'ing-fx-corn', 'ing-fx-yolk', 'ing-fx-honey', 'ing-fx-berries', 'ing-fx-banana', 'ing-fx-coconut');
        wrap.style.removeProperty('--ing-filter');
        if (!touchFx) this._resetSoupLiquidMotion();
        if (this._soupIngFxTimer) { clearTimeout(this._soupIngFxTimer); this._soupIngFxTimer = null; }
    },
    soupIngredientHit(cfg, sfx, opts) {
        opts = opts || {};
        const touchFx = this._soupFxTouch && this._soupFxTouch();
        if (touchFx) {
            const o = this.soupPartOrigin();
            const colors = cfg.particleColors || ['#fde047', '#facc15'];
            const n = opts.rainLite ? 8 : 12;
            this.spawnSoupCanvasBubbles(o.x, o.y, colors, n);
            if (cfg.rippleTint) this.spawnRipple(o.x, o.y, cfg.rippleTint);
            try { sound.play(sfx || 'bubble'); } catch (e) {}
            return;
        }
        const fxMs = this.SOUP_ING_FX_MS || 2600;
        const wrap = document.getElementById('soup-liquid');
        const sl = this._soupLiquidEl || (this._soupLiquidEl = document.getElementById('asset-soup-liquid'));
        const fxId = (cfg && cfg.fx) || 'banana';
        if (wrap) {
            if (this._soupIngFxTimer) clearTimeout(this._soupIngFxTimer);
            if (this._soupIngFxEndHandler && sl) sl.removeEventListener('animationend', this._soupIngFxEndHandler);
            wrap.classList.remove('ingredient-splash-active');
            wrap.classList.remove('ing-fx-ink', 'ing-fx-shrimp', 'ing-fx-carrot', 'ing-fx-lettuce', 'ing-fx-corn', 'ing-fx-yolk', 'ing-fx-honey', 'ing-fx-berries', 'ing-fx-banana', 'ing-fx-coconut');
            this._resetSoupLiquidMotion();
            if (!touchFx) void wrap.offsetWidth;
            wrap.classList.add('ing-fx-' + fxId, 'ingredient-splash-active');
            if (cfg.soupFilter) wrap.style.setProperty('--ing-filter', cfg.soupFilter);
            const finish = () => this._finishSoupIngredientSplash(wrap, fxId);
            this._soupIngFxTimer = setTimeout(finish, fxMs + 80);
            if (sl) {
                this._soupIngFxEndHandler = (ev) => { if (ev.target === sl) finish(); };
                sl.addEventListener('animationend', this._soupIngFxEndHandler, { once: true });
            }
        }
        const burst = this._soupFxBurst();
        if (burst) this._soupFxClearBurst(burst);
        const o = this.soupPartOrigin();
        const colors = cfg.particleColors || ['#fde047', '#facc15'];
        const n = touchFx ? Math.min(cfg.particleCount || 16, 8) : (cfg.particleCount || 16);
        for (let i = 0; i < n; i++) {
            this.emitSplashParticle(o.x + (Math.random() - 0.5) * 80, o.y + (Math.random() - 0.5) * 40, colors[Math.floor(Math.random() * colors.length)]);
        }
        const tint = cfg.rippleTint;
        const rippleN = fxId === 'shrimp' ? 5 : (fxId === 'honey' ? 4 : 3);
        for (let i = 0; i < rippleN; i++) {
            this.spawnRipple(o.x + (Math.random() - 0.5) * 36, o.y + (Math.random() - 0.5) * 20, tint);
        }
        const spawnBubbles = () => {
            this.spawnSoupColoredBubbles(fxId, opts.rainLite ? { rainLite: true } : null);
            if (!touchFx) this._runSoupFxUnique(fxId);
        };
        if (touchFx) requestAnimationFrame(spawnBubbles);
        else spawnBubbles();
        try { sound.play(sfx || 'bubble'); } catch (e) {}
    },
    summon(c, btn, feedMode, testLevel, rainOnLand) {
        try { sound.play('buy'); } catch (e) {}
        if (!btn || typeof btn.getBoundingClientRect !== 'function') {
            const cards = document.querySelectorAll('#companion-list .companion-card');
            btn = cards[c.id] || document.getElementById('companion-column') || document.body;
        }
        const r = btn.getBoundingClientRect();
        const h = document.createElement('img');
        const paths = this.helperSummonSrc(c);
        const fallbackSrc = paths.fb2 || paths.fb || paths.src || '';
        h.onerror = () => {
            const step = h.dataset.fellBack || '0';
            if (step === '0' && paths.fb && h.src !== paths.fb) { h.dataset.fellBack = '1'; h.src = paths.fb; return; }
            if (step !== '2' && fallbackSrc && h.src !== fallbackSrc) { h.dataset.fellBack = '2'; h.src = fallbackSrc; return; }
        };
        h.className = 'summon-clone';
        h.decoding = 'async';
        h.loading = 'eager';
        h.src = paths.src || fallbackSrc;
        h.style.left = (r.left + r.width / 2) + 'px'; h.style.top = (r.top + r.height / 2) + 'px';
        h.style.transform = 'translate(-50%,-50%) scale(0.2)';
        document.body.appendChild(h);
        void h.offsetWidth;
        const lv = (typeof testLevel === 'number' && testLevel > 0)
            ? Math.max(1, Math.floor(testLevel))
            : Math.max(1, Math.floor(Number(c.lv) || 1));
        const feed = feedMode != null ? !!feedMode : this.isFeedMilestone(lv);
        const pendingRain = Math.max(0, Math.floor(Number(rainOnLand) || 0));
        let visualOnlyThrow = false;
        let landed = false;
        let flyStartedAt = 0;
        let throwReady = false;
        let flyReady = false;
        const MIN_FLY_MS = 1150;
        const tryLand = () => {
            if (landed || !throwReady || !flyReady) return;
            const elapsed = flyStartedAt ? (performance.now() - flyStartedAt) : MIN_FLY_MS;
            const wait = Math.max(0, MIN_FLY_MS - elapsed);
            const doLand = () => {
                if (landed) return;
                landed = true;
                clearTimeout(landFailSafe);
                this.summonLandClone(h, c, () => {
                    const rainLv = pendingRain || (this.isExtraIngredientRainMilestone(lv) ? lv : 0);
                    if (rainLv) this.extraIngredientRain(c.id, rainLv, visualOnlyThrow);
                });
            };
            if (wait > 0) setTimeout(doLand, wait);
            else doLand();
        };
        const landClone = () => { throwReady = true; tryLand(); };
        const landFailSafe = setTimeout(() => { throwReady = true; flyReady = true; tryLand(); }, 12000);
        let throwDone = false;
        const ensureThrow = () => {
            if (throwDone) return;
            throwDone = true;
            const pose = this.summonPoseOrigin();
            if (!this._skipSummonSparkles()) this.part(pose.x, pose.y, 'magic');
            const skipCost = testLevel != null && creator.isDev();
            if (skipCost || farm.consumeThrow(c.id, lv, feed)) {
                this.summonIngredientThrow(c.id, pose.x, pose.y, lv, landClone, feed, false);
            } else {
                visualOnlyThrow = true;
                farm.toastEmpty(c.id, lv);
                this.summonIngredientThrow(c.id, pose.x, pose.y, lv, landClone, feed, true);
            }
        };
        const startFly = () => {
            ensureThrow();
            if (!h.parentNode) { throwReady = true; flyReady = true; tryLand(); return; }
            flyStartedAt = performance.now();
            const pose = this.summonPoseOrigin();
            const peakScale = window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 600px)').matches ? 0.8 : 2.1;
            requestAnimationFrame(() => requestAnimationFrame(() => {
                if (!h.parentNode) { flyReady = true; tryLand(); return; }
                h.style.left = pose.x + 'px'; h.style.top = pose.y + 'px';
                h.style.transform = 'translate(-50%,-50%) scale(' + peakScale + ') rotate(360deg)';
                requestAnimationFrame(() => {
                    if (!h.parentNode) { flyReady = true; tryLand(); return; }
                    const rc = h.getBoundingClientRect();
                    if (rc.width < 12 || rc.height < 12 || rc.right < 8 || rc.left > window.innerWidth - 8 || rc.bottom < 8) {
                        const chef = document.getElementById('asset-chef');
                        const cr = chef ? chef.getBoundingClientRect() : null;
                        if (cr && cr.width > 8) {
                            h.style.left = Math.min(cr.right + 80, window.innerWidth - 100) + 'px';
                            h.style.top = (cr.top + cr.height * 0.25) + 'px';
                            h.style.transform = 'translate(-50%,-50%) scale(1) rotate(360deg)';
                        }
                    }
                });
                setTimeout(() => { flyReady = true; tryLand(); }, MIN_FLY_MS);
            }));
        };
        let flyStarted = false;
        const beginFly = () => {
            if (flyStarted) return;
            flyStarted = true;
            clearTimeout(flyReadyFailSafe);
            clearTimeout(throwFailSafe);
            clearTimeout(spriteKick);
            startFly();
        };
        const flyReadyFailSafe = setTimeout(beginFly, 2200);
        const throwFailSafe = setTimeout(beginFly, 900);
        const spriteKick = setTimeout(beginFly, 420);
        const waitForSprite = () => {
            if (h.complete && h.naturalWidth > 0) { clearTimeout(spriteKick); beginFly(); return; }
            if (h.complete && h.naturalWidth === 0 && h.src) { clearTimeout(spriteKick); beginFly(); return; }
            if (typeof h.decode === 'function') {
                h.decode().then(() => { clearTimeout(spriteKick); beginFly(); }).catch(() => { clearTimeout(spriteKick); beginFly(); });
            }
            h.addEventListener('load', () => { clearTimeout(spriteKick); beginFly(); }, { once: true });
            h.addEventListener('error', () => { clearTimeout(spriteKick); setTimeout(beginFly, 0); }, { once: true });
        };
        requestAnimationFrame(waitForSprite);
    },
    devTestSummonFx(helperId, kind) {
        if (!creator.isDev()) return;
        const c = this.cp[helperId];
        if (!c) return;
        const feedEvery = this.FEED_MILESTONE_EVERY || 4;
        const rainEvery = this.EXTRA_INGREDIENT_RAIN_EVERY || 10;
        let testLv, feedOverride;
        if (kind === 'feed') { testLv = feedEvery; feedOverride = true; }
        else if (kind === 'rain') { testLv = rainEvery; feedOverride = false; }
        else if (kind === 'both') {
            const a = feedEvery, b = rainEvery;
            testLv = a * b / (function g(x, y) { return y ? g(y, x % y) : x; })(a, b);
            feedOverride = null;
        }
        else return;
        const cards = document.querySelectorAll('#companion-list .companion-card');
        const btn = cards[helperId] || document.getElementById('helpers-toggle') || document.body;
        try { sound.unlock(); } catch (e) {}
        this.summon(c, btn, feedOverride, testLv);
    },
    buy(i, ev) {
        try { sound.unlock(); } catch (e) {}
        const c = this.cp[i];
        let n = this.buyMode === 1 ? 1 : (this.buyMode === 10 ? Math.min(10, this.maxAffordableLevels(c, this.e)) : this.maxAffordableLevels(c, this.e));
        if (n <= 0) return;
        const total = this.calcBulkCost(c, n);
        if (this.e < total) return;
        const prevLv = c.lv;
        this.e -= total;
        c.lv += n;
        let rainOnLand = 0;
        for (let lv = prevLv + 1; lv <= c.lv; lv++) {
            if (this.isExtraIngredientRainMilestone(lv)) { rainOnLand = lv; break; }
        }
        this.recomputeCompanionCost(c);
        this.track('levels', n);
        try { chefMood.bump(Math.min(4, 1 + n * 0.4), 'buy'); } catch (e) {}
        if ([5, 10, 25, 50, 100].some(th => prevLv < th && c.lv >= th) && !this._skipSummonSparkles()) { this.part(window.innerWidth / 2, window.innerHeight * 0.5, 'magic'); sound.play('bubble'); gx.toast(t(this.milestoneMsg[i] || 'milestone_generic')); }
        ach.check();
        const feed = this.isFeedMilestone(c.lv);
        let originStub = ev && ev.currentTarget;
        try {
            if (originStub && originStub.getBoundingClientRect) {
                const snap = originStub.getBoundingClientRect();
                originStub = { getBoundingClientRect: () => snap };
            }
        } catch (e) {}
        if (!this.patchCompanionCard(i)) this.renderCompanionCards();
        this.save();
        if (this._mSheet()) {
            if (c.lv > 0) { try { this.slot(c); this.syncCompanionLayout(); } catch (e) {} }
            this._mScheduleRebuild();
            this.syncMinigameButtons();
            const buyLv = c.lv;
            const buyFeed = feed;
            const buyRain = rainOnLand;
            const buyStub = originStub;
            this._mDeferSummonClose(() => this.summon(c, buyStub, buyFeed, buyLv, buyRain));
            try { if (typeof tutorial !== 'undefined' && tutorial.active) tutorial.notify('buy'); } catch (e) {}
            return;
        }
        this.rebuild();
        this.syncMinigameButtons();
        this._summonGen = (this._summonGen || 0) + 1;
        const summonGen = this._summonGen;
        const launchSummon = () => {
            if (summonGen !== this._summonGen) return;
            this.ensureHelperSlotLayout(c, () => {
                if (summonGen !== this._summonGen) return;
                try { this._warmHelperSprites(); } catch (e) {}
                this.summon(c, originStub, feed, null, rainOnLand);
            });
        };
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(launchSummon)));
        try { if (typeof tutorial !== 'undefined' && tutorial.active) tutorial.notify('buy'); } catch (e) {}
    },
    _mPortrait() {
        try { return window.matchMedia('(orientation: portrait) and (max-width: 768px)').matches; } catch (e) { return false; }
    },
    _mLandscapePhone() {
        try { return window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 600px)').matches; } catch (e) { return false; }
    },
    _cinemaPhone() {
        try { return typeof mobileUI !== 'undefined' && mobileUI.isPhone(); } catch (e) { return this._mPortrait() || this._mLandscapePhone(); }
    },
    cinemaViewCenter() {
        const vv = window.visualViewport;
        const w = vv ? vv.width : window.innerWidth;
        const h = vv ? vv.height : window.innerHeight;
        const ox = vv ? vv.offsetLeft : 0;
        const oy = vv ? vv.offsetTop : 0;
        const cx = ox + w * 0.5;
        if (this._mPortrait()) {
            const root = getComputedStyle(document.documentElement);
            const sat = parseFloat(root.getPropertyValue('env(safe-area-inset-top)')) || 0;
            const sab = parseFloat(root.getPropertyValue('env(safe-area-inset-bottom)')) || 0;
            const padT = Math.max(h * 0.14, sat + 56);
            const padB = Math.max(h * 0.12, sab + 52);
            return { x: cx, y: oy + padT + (h - padT - padB) * 0.5 };
        }
        return { x: cx, y: oy + h * 0.5 };
    },
    cinemaPoseOrigin() {
        return this.cinemaViewCenter();
    },
    championImgSrc(c) {
        let fallbackSrc = '';
        try { fallbackSrc = collection.HELPER_DEFAULT_IMG[c.id] || c.im || ''; } catch (e) { fallbackSrc = c.im || ''; }
        let champImg = fallbackSrc;
        try { champImg = this.summonImgForHelper(c) || fallbackSrc; } catch (e2) { champImg = fallbackSrc; }
        return champImg || fallbackSrc || c.im || '';
    },
    resetCrownCeremony(p, cr) {
        if (!cr) return;
        const crownIntro = this.cinemaCrownIntroScale();
        cr.style.transition = '';
        cr.style.top = '-150px';
        cr.style.left = '50%';
        cr.style.transform = `translate(-50%, -50%) scale(${crownIntro})`;
        if (p) {
            p.style.transition = '';
            p.style.transform = '';
            p.style.opacity = '';
            p.style.left = '';
            p.style.top = '';
            p.style.position = '';
            p.style.zIndex = '';
            p.onload = null;
        }
    },
    beginCrownCeremony(c, p, cr) {
        if (!c || !p || !cr) return;
        const off = (this.CROWN_HEAD[c.id] || { x: 0.5, y: 0.18, w: 0.22 });
        const pose = this.cinemaViewCenter();
        const champScale = this.cinemaChampScale();
        const crownIntro = this.cinemaCrownIntroScale();
        const fallbackSrc = this.championImgSrc(c);
        p.onerror = () => {
            if (p.dataset.fellBack) return;
            const fb = fallbackSrc || c.im || '';
            if (fb && p.src !== fb) { p.dataset.fellBack = '1'; p.src = fb; }
        };
        p.loading = 'eager';
        p.decoding = 'async';
        delete p.dataset.fellBack;
        p.src = fallbackSrc;
        p.style.transition = 'none';
        p.style.position = 'fixed';
        p.style.zIndex = '105001';
        p.style.left = pose.x + 'px';
        p.style.top = pose.y + 'px';
        p.style.maxWidth = '';
        p.style.maxHeight = '';
        p.style.width = '';
        p.style.height = '';
        p.style.opacity = '1';
        p.style.transform = `translate(-50%, -50%) scale(${champScale})`;
        cr.textContent = '👑';
        cr.style.transition = 'none';
        cr.style.position = 'fixed';
        cr.style.left = pose.x + 'px';
        cr.style.top = '-150px';
        cr.style.transform = `translate(-50%, -50%) scale(${crownIntro})`;
        void cr.offsetHeight;
        let placed = false;
        const estRect = () => {
            const baseW = this._cinemaPhone()
                ? Math.min(340, window.innerWidth * 0.357)
                : Math.min(300, window.innerWidth * 0.42);
            const w = (p.naturalWidth > 0 && p.naturalHeight > 0)
                ? Math.min(baseW, baseW * (p.naturalWidth / p.naturalHeight))
                : baseW;
            const h = (p.naturalWidth > 0 && p.naturalHeight > 0)
                ? w * (p.naturalHeight / p.naturalWidth)
                : Math.max(90, w * 0.85);
            const rw = w * champScale, rh = h * champScale;
            return { left: pose.x - rw * 0.5, top: pose.y - rh * 0.5, width: rw, height: rh };
        };
        const placeCrown = (r) => {
            if (placed) return;
            placed = true;
            const headX = r.left + r.width * off.x;
            const landY = (r.top + r.height * off.y) + 'px';
            const scale = Math.max(0.45, (r.width * off.w) / 64);
            cr.style.left = headX + 'px';
            cr.style.transform = `translate(-50%, -50%) scale(${scale})`;
            void cr.offsetHeight;
            cr.style.transition = 'top 1.2s cubic-bezier(0.25, 1, 0.5, 1)';
            cr.style.setProperty('top', landY, 'important');
        };
        let placeTries = 0;
        const place = () => {
            const r = p.getBoundingClientRect();
            if (r.width >= 10 && r.height >= 10) { placeCrown(r); return; }
            if (++placeTries < 90) { requestAnimationFrame(place); return; }
            placeCrown(estRect());
        };
        const startPlace = () => setTimeout(place, 80);
        if (p.complete && p.naturalWidth > 0) startPlace();
        else {
            p.onload = () => { p.onload = null; startPlace(); };
            startPlace();
        }
    },
    cinemaChampScale() {
        if (!this._cinemaPhone()) return 2.5;
        return 2.1;
    },
    cinemaCrownIntroScale() {
        return this._cinemaPhone() ? 2.2 : 2.2;
    },
    /* True when the shop is the collapsible slide-in SHEET (phone, portrait OR
       landscape) rather than a permanent desktop sidebar. Gates the buy-then-auto-close
       flow so it also works in landscape phones, not just portrait. */
    _mSheet() {
        try { return typeof mobileUI !== 'undefined' && mobileUI.isPhone(); } catch (e) { return this._mPortrait(); }
    },
    /* Store / GitHub Pages PWA on a real phone (not LAN localhost tunnel). Heavier FX
       are trimmed here — local dev keeps full feed for tuning. */
    _skipSummonSparkles() {
        return !!((this._mProdMobile && this._mProdMobile()) || (this._soupFxTouch && this._soupFxTouch()));
    },
    _mProdMobile() {
        try {
            if (typeof SC_LOCAL_DEV !== 'undefined' && SC_LOCAL_DEV) return false;
            return this._mSheet();
        } catch (e) { return false; }
    },
    /* Phone (portrait OR landscape): after a successful purchase, slide the shop sheet
       away so the player can watch the summon / eat animation without closing it
       manually. DEBOUNCED: each purchase resets a short timer, so the player can buy
       several times in a row (2, 3, 4, 5...) and the shop only closes once they pause.
       No-op on desktop (permanent sidebar). */
    _mAutoCloseShop() {
        if (this._mSheet()) this._mScheduleShopClose();
    },
    /* Portrait companions: queue the visible ingredient-throw to fire AFTER the shop
       slides closed, so the helpers start throwing into the now-visible cauldron —
       a clear, gratifying payoff instead of an animation hidden behind the sheet. */
    _mDeferSummonClose(thunk) {
        try {
            if (typeof thunk !== 'function') return;
            if (!this._mSummonQueue) this._mSummonQueue = [];
            this._mSummonQueue.push(thunk);
            this._mScheduleShopClose();
        } catch (e) {}
    },
    /* Shared debounced close: closes the sheet once buying pauses, then drains the
       summon queue ONE AT A TIME (no overlap — rapid buys used to fire all at 240ms
       and freeze mobile / kill audio). */
    _mScheduleShopClose() {
        try {
            clearTimeout(this._mShopCloseTimer);
            this._mShopCloseTimer = setTimeout(() => {
                try { if (typeof mobileUI !== 'undefined') mobileUI.closeAll(); } catch (e) {}
                setTimeout(() => { try { this._mPumpSummonQueue(); } catch (e) {} }, 320);
            }, 650);
        } catch (e) {}
    },
    _summonAnimBusy() {
        try {
            if (document.querySelector('.summon-clone')) return true;
            if (document.querySelector('.ingredient-proj:not(.ingredient-proj-dry)')) return true;
            if (this._chefFeedInProgress()) return true;
            if (this._chefMouthCloseTimer) return true;
        } catch (e) {}
        return false;
    },
    _summonPipelineBusy() {
        if (this._summonPipeSlot) return true;
        return this._summonAnimBusy();
    },
    _mobileSummonHot() {
        try {
            if (this._mSummonPumping) return true;
            if (this._summonPipelineBusy()) return true;
            if (this._mSummonQueue && this._mSummonQueue.length > 0) return true;
        } catch (e) {}
        return false;
    },
    _uiModalBlocking() {
        try {
            const am = document.getElementById('ambient-modal');
            if (am && am.classList.contains('open')) return true;
        } catch (e) {}
        return false;
    },
    _summonBusy() { return this._summonPipelineBusy(); },
    _mPumpSummonQueue() {
        if (this._mSummonPumping) return;
        if (!this._mSummonQueue || !this._mSummonQueue.length) {
            this._mFlushPendingRebuild();
            return;
        }
        this._mSummonPumping = true;
        const step = () => {
            const q = this._mSummonQueue;
            if (!q || !q.length) {
                this._mSummonPumping = false;
                this._summonPipeSlot = false;
                this._mFlushPendingRebuild();
                return;
            }
            if (this._uiModalBlocking()) {
                setTimeout(step, 320);
                return;
            }
            if (this._summonPipelineBusy()) {
                setTimeout(step, 240);
                return;
            }
            const job = q.shift();
            this._summonPipeSlot = true;
            const t0 = Date.now();
            try { job(); } catch (e) { console.warn('summon queue job', e); }
            const finishJob = () => {
                this._summonPipeSlot = false;
                const gap = this._mProdMobile() ? 920 : 240;
                setTimeout(step, gap);
            };
            const waitDone = () => {
                if (this._summonAnimBusy()) {
                    if (Date.now() - t0 > 32000) { finishJob(); return; }
                    setTimeout(waitDone, 240);
                    return;
                }
                const settle = this._mProdMobile() ? 720 : 180;
                setTimeout(finishJob, settle);
            };
            setTimeout(waitDone, 320);
        };
        step();
    },
    _mScheduleRebuild() {
        this._mRebuildDirty = true;
        if (this._mRebuildTimer) return;
        const tick = () => {
            this._mRebuildTimer = null;
            if (this._mSummonPumping || this._summonPipelineBusy() || (this._mSummonQueue && this._mSummonQueue.length > 0)) {
                this._mRebuildTimer = setTimeout(tick, 200);
                return;
            }
            this._mFlushPendingRebuild();
        };
        this._mRebuildTimer = setTimeout(tick, 220);
    },
    _mFlushPendingRebuild() {
        if (!this._mRebuildDirty) return;
        this._mRebuildDirty = false;
        try { this.rebuild(); } catch (e) {}
    },
    playPrestigeCinematic(opts) {
        opts = opts || {};
        const previewOnly = !!opts.previewOnly;
        if (!previewOnly) {
            try {
                if (typeof STORE_TIER !== 'undefined' && !STORE_TIER.canPrestige(this)) {
                    STORE_TIER.prestigeBlockedToast();
                    return false;
                }
            } catch (e) {}
        }
        if (this.p && !previewOnly) return false;
        const shardsPreview = (opts.shards != null && Number.isFinite(opts.shards)) ? Math.max(1, Math.floor(opts.shards)) : this.presShards();
        this.p = true;
        if (!previewOnly) {
            try { this.resetCompanionSummonState(); } catch (e) {}
        }
        sound.play('prestige');
        const show = document.getElementById('angel-showcase');
        if (show) show.classList.add('active');
        this.part(window.innerWidth / 2, window.innerHeight / 2, 'magic');
        setTimeout(() => {
            if (show) show.classList.remove('active');
            const o = document.getElementById('prestige-overlay');
            const loreEl = document.getElementById('pres-lore');
            const shardsEl = document.getElementById('pres-shards-gain');
            const endingRun = { eb: this.e, l: this.l, cps: this.getCps(), era: this.s };
            if (loreEl) loreEl.textContent = t('pres_lore');
            if (shardsEl) shardsEl.textContent = t('pres_shards_overlay', { n: shardsPreview });
            try { this.renderPrestigeOverlaySummary(shardsPreview, endingRun); } catch (e) {}
            if (o) {
                o.classList.remove('open');
                o.style.opacity = '0';
                o.style.display = 'flex';
                o.setAttribute('aria-hidden', 'false');
                requestAnimationFrame(() => { o.classList.add('open'); o.style.opacity = '1'; });
            }
            setTimeout(() => {
                if (previewOnly) {
                    if (o) {
                        o.classList.remove('open'); o.style.opacity = '0'; o.setAttribute('aria-hidden', 'true');
                        setTimeout(() => { o.style.display = 'none'; this.p = false; try { this.resetCompanionSummonState(); } catch (e) {} }, 500);
                    } else { this.p = false; try { this.resetCompanionSummonState(); } catch (e) {} }
                    try { gx.toast(t('creator_pres_preview_ok')); } catch (e) {}
                    return;
                }
                const shardsGained = shardsPreview;
                const ecoLv = this.tree.eco;
                if (Number.isFinite(endingRun.eb)) {
                    this.bestRunEb = Math.max(Number.isFinite(this.bestRunEb) ? this.bestRunEb : 0, endingRun.eb);
                    this.prevRun = { eb: endingRun.eb, l: endingRun.l, cps: endingRun.cps, era: endingRun.era, shards: shardsGained };
                }
                this.s++; this.as += shardsGained; this._buffs = [];
                try { atlas.checkPrestigeChapters(this.s); } catch (e) {}
                try { if (typeof isPlayablesEnv !== 'function' || !isPlayablesEnv()) leaderboard.submit({ prestige: this.s, score: this.te }); } catch (e) {}
                ach.grant('firstPres');
                const eco = ecoLv;
                this.e = 0; this.l = 0; this.cp.forEach(c => { c.lv = eco; c.ch = 0; this.recomputeCompanionCost(c); });
                try { farm.resetForPrestige(); } catch (e) {}
                try { this.resetShopForPrestige(); } catch (e) {}
                this.rebuild(); this.render(); this.save();
                try { this.finalizePrestigeRunState(); } catch (e) {}
                const welcome = () => { try { this.prestigeWelcomeMoment(shardsGained, eco); } catch (e) {} };
                if (o) {
                    o.classList.remove('open'); o.style.opacity = '0'; o.setAttribute('aria-hidden', 'true');
                    setTimeout(() => { o.style.display = 'none'; this.p = false; welcome(); }, 500);
                } else { this.p = false; welcome(); }
            }, 3200);
        }, 2000);
        return true;
    },
    pres() {
        let g = balancePrestigeGoal(this.s);
        if (this.e < g) {
            document.getElementById('btn-prestige').classList.add('shake');
            setTimeout(() => document.getElementById('btn-prestige').classList.remove('shake'), 300);
            return;
        }
        this.playPrestigeCinematic({ previewOnly: false });
    },
    coron(c, rewardToast, opts) {
        opts = opts || {};
        const skirmish = !!opts.skirmish;
        this.p = true;
        try { document.body.classList.add('coronation-active'); if (typeof mobileUI !== 'undefined') mobileUI.closeAll(); } catch (e) {}
        if (!opts.skipSound) try { sound.play('victory'); } catch (e) {}
        const v = document.getElementById('victory-cinema'), p = document.getElementById('cinema-plushie'), cr = document.getElementById('cinema-crown'), wo = document.getElementById('white-out');
        const glow = v ? v.querySelector('.champion-ceremony-glow') : null;
        if (glow) glow.style.display = '';
        v.style.display = 'flex';
        v.style.transition = 'none';
        v.style.opacity = '1';
        v.style.transform = '';
        wo.style.opacity = '0';
        this.beginCrownCeremony(c, p, cr);
        v.style.transition = '';
        setTimeout(() => {
            v.style.opacity = '0';
            v.style.transform = 'translateY(10px) scale(0.9)';
        }, 2800);
        setTimeout(() => {
            v.style.display = 'none';
            v.style.opacity = '';
            v.style.transform = '';
            this.resetCrownCeremony(p, cr);
            if (glow) glow.style.display = '';
            try { document.body.classList.remove('coronation-active'); } catch (e2) {}
            if (skirmish) {
                this.p = true;
            } else {
                this.cd = this.getPrixCd();
                this.p = false;
            }
            if (!opts.skipRebuild) {
                try { collection.restoreSceneAfterMinigame(); } catch (e5) { this.rebuild(); this.render(); }
                try { this.syncMinigameButtons(); } catch (e6) {}
            }
            if (typeof opts.onDone === 'function') {
                try { opts.onDone(); } catch (e3) {}
            }
            if (rewardToast && !opts.skipToast) {
                try { gx.toast(rewardToast); } catch (e4) {}
            }
        }, 3700);
    },
    loop() {
        if (typeof ytPlayables !== 'undefined' && ytPlayables._hostPaused) { this._loopPaused = true; return; }
        if (this.p && bubble.node) bubble.despawn();
        const sp = this._spoonRigEl || (this._spoonRigEl = document.getElementById('spoon-rig'));
        this._frame = (this._frame || 0) + 1;
        const lowQ = quality.effMode() === 'low';
        const clickStir = performance.now() - this._lastClick < 1500;
        const nativeCap = (() => { try { const c = window.Capacitor; return !!(c && c.isNativePlatform && c.isNativePlatform()); } catch (e) { return false; } })();
        const feedActive = this._chefFeedInProgress();
        const pipeBusy = feedActive || this._summonPipelineBusy() || this._mSummonPumping;
        const ambOpen = this._uiModalBlocking && this._uiModalBlocking();
        if (this._mProdMobile && this._mProdMobile() && (pipeBusy || ambOpen) && (this._frame % 4 !== 0)) {
            if (this.particles.length > 0) {
                this.draw();
                this._flushScorePulse();
            }
            if (!document.hidden) requestAnimationFrame(() => this.loop());
            return;
        }
        const stirActive = !this.p && !feedActive && (this.c > 0 || clickStir);
        if (!this.p) this._wave += 0.018;
        try { document.body.classList.toggle('soup-stirring', stirActive); } catch (e) {}
        // On low/native, halve idle rAF work (ambient soup bubbles are CSS-driven).
        if (lowQ && !this.p && this.particles.length === 0 && (this._frame % 2 === 1) && (!clickStir || nativeCap)) {
            if (!document.hidden) requestAnimationFrame(() => this.loop());
            return;
        }
        // El rect de #asset-soup se cachea y solo se relee cada 30 frames (o cuando se
        // invalida en resize/visibilitychange). Evita forzar layout cada frame.
        if (!this._soupRect || (this._frame % 30 === 0)) this._cacheSoupSurf();
        const sr = this._soupRect;
        if (stirActive && !(lowQ && this._frame % 2 === 1)) {
            this.f += this.c > 0 ? (0.04 + Math.log10(this.c + 1) * 0.05) : 0.055;
            if (sp) {
                if (this._spoonPlace) this._applySpoonRig(this.f);
                else sp.style.transform = `translate(-50%,-50%) rotate(${-27 + Math.sin(this.f) * 5}deg)`;
            }
        }
        // Drain the auto-particle accumulator. On low/mobile we DON'T emit ambient
        // CPS particles, so just keep the counter bounded (it's fed every logic tick).
        if (this._autoPartAcc > 40) this._autoPartAcc = 40;
        if (!this.p && this.c > 0 && this._autoPartAcc > 0 && !lowQ) {
            // CAP por frame: como mucho N emisiones/frame (según calidad) aunque el CPS sea altísimo.
            const burst = Math.min(this._autoPartAcc, quality.params.partCap);
            const o = this.soupPartOrigin();
            for (let i = 0; i < burst; i++) this.part(o.x + (Math.random() - 0.5) * 40, o.y + (Math.random() - 0.5) * 20, 'energy');
            this._autoPartAcc -= burst;
        }
        if (!this.p && (this._frame % 2 === 0)) {
            const sl = this._soupLiquidEl || (this._soupLiquidEl = document.getElementById('asset-soup-liquid'));
            if (sl && !this._isSoupIngredientSplashActive()) {
                const w = this._wave;
                const wm = quality.params.waveMul;
                const sy = 1 + (Math.sin(w) * 0.018 + (stirActive ? Math.sin(this.f) * 0.007 : 0)) * wm;
                const sx = 1 + Math.sin(w * 0.85 + 1.1) * 0.009 * wm;
                const sk = Math.sin(w * 0.7) * 0.95 * wm;
                const tx = Math.sin(w * 0.6) * 1.1 * wm;
                sl.style.transform = `translateX(${tx.toFixed(3)}%) scale(${sx.toFixed(4)},${sy.toFixed(4)}) skewX(${sk.toFixed(3)}deg)`;
            }
        }
        if (!this.p && sr && !lowQ) {
            this._steamIdleTick++;
            if (this._steamIdleTick >= 8) {
                this._steamIdleTick = 0;
                this.part(
                    sr.left + sr.width * (0.30 + Math.random() * 0.40),
                    sr.top + sr.height * (0.33 + Math.random() * 0.06),
                    'steam'
                );
            }
            this._ambientRippleTick++;
            if (this._ambientRippleTick >= 150) { this._ambientRippleTick = 0; this.spawnRipple(); }
        } else if (this.p) {
            this._steamIdleTick = 0;
        }
        this.draw();
        this._flushScorePulse();
        // Pausa el bucle de animación cuando la pestaña está oculta (no anima en 2º plano).
        if (document.hidden) { this._loopPaused = true; return; }
        requestAnimationFrame(()=>this.loop());
    },
    render() {
        this.renderCompanionCards();
        this.renderSpoons();
        this.renderHats();
        this.syncMinigameButtons();
    },
    floatNum(x, y, gain, opts) {
        opts = opts || null;
        const crit = !!(opts && opts.crit);
        // On low/mobile, coalesce: show at most one float per ~100ms, accumulating gain.
        if (quality.effMode() === 'low') {
            const now = performance.now();
            if (now - this._floatThrottle < 100) { this._floatAcc += gain; return; }
            this._floatThrottle = now;
            gain += this._floatAcc; this._floatAcc = 0;
        }
        const fmt = gain >= 100 ? Math.floor(gain).toLocaleString() : (gain % 1 === 0 ? String(Math.floor(gain)) : gain.toFixed(1));
        // Reuse a pooled node (max 8) instead of create/append/remove on every click.
        const pool = this._floatPool;
        let el = null;
        for (let i = 0; i < pool.length; i++) { if (!pool[i]._busy) { el = pool[i]; break; } }
        if (!el) {
            if (pool.length < 8) {
                el = document.createElement('div');
                el.className = 'click-float';
                el.style.animation = 'none';   // motion driven by WAAPI / restarted below
                document.body.appendChild(el);
                pool.push(el);
            } else {
                el = pool[this._floatIdx]; this._floatIdx = (this._floatIdx + 1) % pool.length;
                if (el._anim) { try { el._anim.cancel(); } catch (e) {} }
            }
        }
        el._busy = true;
        el.style.display = '';
        el.style.left = x + 'px';
        el.style.top = y + 'px';
        el.className = crit ? 'click-float crit' : 'click-float';
        el.textContent = crit ? (t('crit_stir') + ' +' + fmt + ' EB') : ('+' + fmt + ' EB');
        if (el.animate) {
            const a = el.animate(
                [ { opacity: 1, transform: 'translate(-50%, -50%)' },
                  { opacity: 0, transform: 'translate(-50%, -50%) translateY(-50px)' } ],
                { duration: 800, easing: 'ease-out', fill: 'forwards' });
            el._anim = a;
            a.onfinish = () => { el._busy = false; el.style.display = 'none'; };
        } else {
            el.style.animation = 'none';
            requestAnimationFrame(() => { el.style.animation = 'floatUp 800ms ease-out forwards'; });
            el.onanimationend = () => { el._busy = false; el.style.display = 'none'; };
        }
    },
    particles: [],
    soupPartOrigin() {
        const cr = this._soupRect;
        if (cr) return { x: cr.left + cr.width * 0.52, y: cr.top + cr.height * 0.42 };
        const so = document.getElementById('asset-soup');
        if (!so) return { x: window.innerWidth / 2, y: window.innerHeight / 2 + 100 };
        const r = so.getBoundingClientRect();
        return { x: r.left + r.width * 0.52, y: r.top + r.height * 0.42 };
    },
    initSoupBalls() {
        let host = document.getElementById('soup-ambient-bubbles');
        if (!host) {
            const liq = document.getElementById('soup-liquid');
            if (!liq) return;
            host = document.createElement('div');
            host.id = 'soup-ambient-bubbles';
            host.setAttribute('aria-hidden', 'true');
            const burst = document.getElementById('soup-fx-burst');
            if (burst) liq.insertBefore(host, burst);
            else liq.appendChild(host);
        }
        host.innerHTML = '';
        const n = 10;
        for (let i = 0; i < n; i++) {
            const ang = (i / n) * Math.PI * 2 + Math.random() * 0.5;
            const rr = 0.25 + Math.random() * 0.7;
            const nx = Math.cos(ang) * rr;
            const ny = Math.sin(ang) * rr;
            const r = 12 + Math.random() * 12;
            const a = 0.46 + Math.random() * 0.30;
            const el = document.createElement('div');
            el.className = 'soup-ambient-ball';
            el.style.left = (47 + nx * 20).toFixed(2) + '%';
            el.style.top = (47 + ny * 8.5).toFixed(2) + '%';
            const pct = Math.max(1.6, (r * 2 * 100) / 1250);
            el.style.width = pct.toFixed(2) + '%';
            el.style.height = (pct * 0.78).toFixed(2) + '%';
            el.style.setProperty('--ball-a', a.toFixed(3));
            el.style.setProperty('--sway', (3 + Math.random() * 4).toFixed(1) + 'px');
            el.style.setProperty('--bob', (-3 - Math.random() * 3).toFixed(1) + 'px');
            el.style.setProperty('--ball-dur', (2.8 + Math.random() * 2.4).toFixed(2) + 's');
            el.style.setProperty('--ball-delay', (-Math.random() * 4).toFixed(2) + 's');
            host.appendChild(el);
        }
        requestAnimationFrame(() => {
            host.querySelectorAll('.soup-ambient-ball').forEach(el => {
                void el.offsetWidth;
                el.style.animationPlayState = 'running';
            });
        });
    },
    spawnRipple(cx, cy, tint) {
        const cont = this._rippleContEl || (this._rippleContEl = document.getElementById('soup-ripples'));
        const stage = document.getElementById('main-stage');
        if (!cont || !stage) return;
        let sr = this._soupRect; const so = document.getElementById('asset-soup');
        if (!sr && so) sr = so.getBoundingClientRect();
        if (!sr) return;
        const ox = sr.left + sr.width * 0.52, oy = sr.top + sr.height * 0.42;
        const rx = sr.width * 0.20, ry = sr.height * 0.11;
        let px, py;
        if (cx === undefined) {
            const a = Math.random() * Math.PI * 2, q = Math.sqrt(Math.random());
            px = ox + Math.cos(a) * rx * q; py = oy + Math.sin(a) * ry * q;
        } else {
            let dx = cx - ox, dy = cy - oy;
            const norm = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
            if (norm > 1) { const kk = 1 / Math.sqrt(norm); dx *= kk; dy *= kk; }
            px = ox + dx; py = oy + dy;
        }
        // Use the cached stage rect to avoid forcing layout on every click (which
        // janks the main thread and stutters the stir/soup audio loop on phones).
        const st = this._stageRect || (this._stageRect = stage.getBoundingClientRect());
        // Reuse a pooled node (max 7) instead of create/append/remove on every click.
        const pool = this._ripplePool;
        let el = null;
        for (let i = 0; i < pool.length; i++) { if (!pool[i]._busy) { el = pool[i]; break; } }
        if (!el) {
            if (pool.length < 7) {
                el = document.createElement('div');
                el.style.animation = 'none';   // motion driven by WAAPI / restarted below
                cont.appendChild(el);
                pool.push(el);
            } else {
                el = pool[this._rippleIdx]; this._rippleIdx = (this._rippleIdx + 1) % pool.length;
                if (el._anim) { try { el._anim.cancel(); } catch (e) {} }
            }
        }
        el._busy = true;
        el.className = 'liquid-ripple' + (tint ? ' ing-tint' : '');
        if (tint) {
            el.style.borderColor = tint.border || 'rgba(186,246,255,0.85)';
            el.style.boxShadow = `0 0 16px ${tint.glow || 'rgba(165,243,252,0.55)'}, inset 0 0 10px rgba(255,255,255,0.32)`;
        } else { el.style.borderColor = ''; el.style.boxShadow = ''; }
        el.style.display = '';
        el.style.left = (px - st.left) + 'px'; el.style.top = (py - st.top) + 'px';
        if (el.animate) {
            el.style.animation = 'none';
            const a = el.animate(
                [ { opacity: 0.8, transform: 'translate(-50%, -50%) scale(0.3)' },
                  { opacity: 0, transform: 'translate(-50%, -50%) scale(5.4)' } ],
                { duration: tint ? 1850 : 1900, easing: 'cubic-bezier(0.22,0.61,0.36,1)', fill: 'forwards' });
            el._anim = a;
            a.onfinish = () => { el._busy = false; el.style.display = 'none'; };
        } else {
            el.style.animation = (tint ? 'liquidRipple 1.85s' : 'liquidRipple 1.9s') + ' cubic-bezier(0.22,0.61,0.36,1) forwards';
            el.onanimationend = () => { el._busy = false; el.style.display = 'none'; };
        }
    },
    scorePartTarget() {
        // El marcador no se mueve: cacheamos su posición y la refrescamos cada 30 frames.
        if (this._scoreTarget && (this._frame % 30 !== 0)) return this._scoreTarget;
        const el = document.getElementById('score');
        if (!el) return this._scoreTarget || { x: window.innerWidth / 2, y: 45 };
        const r = el.getBoundingClientRect();
        this._scoreTarget = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        return this._scoreTarget;
    },
    pulseScore() {
        // Debounce: just flag it. The actual class/animation work happens at most
        // once per frame in _flushScorePulse(), called from loop(). This avoids the
        // synchronous layout (void offsetWidth) that used to run for EVERY energy
        // particle arrival inside the rAF loop while tapping fast.
        this._scorePulseQueued = true;
    },
    _flushScorePulse() {
        const b = this._scoreBoxEl || (this._scoreBoxEl = document.getElementById('score-box'));
        if (!b) { this._scorePulseQueued = false; return; }
        // Step 2 (next frame): clear the temporary inline 'none' so the CSS animation
        // replays — no forced reflow needed because a full frame elapsed in between.
        if (this._scorePulseArmed) { this._scorePulseArmed = false; b.style.animation = ''; return; }
        if (this._scorePulseQueued) {
            this._scorePulseQueued = false;
            if (quality.effMode() === 'low') return;   // no score glow on low/mobile
            if (!b.classList.contains('glow')) b.classList.add('glow');
            b.style.animation = 'none';                 // kill current run (no layout read)
            this._scorePulseArmed = true;               // re-enable next frame to replay
        }
    },
    part(x, y, t) {
        if (t === 'steam') {
            let steamCount = 0; for (let i = 0; i < this.particles.length; i++) if (this.particles[i].t === 'steam') steamCount++;
            if (steamCount >= quality.params.steamMax) return;
            this.particles.push({ x, y, t, vx: (Math.random() - 0.5) * 0.8, vy: -(Math.random() * 0.9 + 0.35), life: 0.7 + Math.random() * 0.28, size: Math.random() * 10 + 7, color: Math.random() > 0.45 ? 'rgba(255,255,255,0.46)' : 'rgba(165,243,252,0.36)' });
            return;
        }
        // TOPE GLOBAL de partículas: si se supera, se descartan las nuevas para
        // evitar la explosión con CPS alto. El máximo mantiene el efecto visual.
        const MAX_PARTS = quality.params.maxParts;
        const want = (t === 'magic' ? 30 : quality.params.clickParts);
        const room = MAX_PARTS - this.particles.length;
        if (room <= 0) return;
        const n = Math.min(want, room);
        for (let i = 0; i < n; i++) this.particles.push({ x, y, t, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10 - (t === 'energy' ? 5 : 0), life: 1, size: Math.random() * 8 + 4, color: t === 'magic' ? (Math.random() > 0.5 ? '#fff' : '#fbbf24') : '#a5f3fc' });
    },
    draw() {
        const ctx = this.ctx;
        const lowQ = quality.effMode() === 'low';
        if (lowQ && this.particles.length === 0) {
            if (this._canvasDirty) {
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                this._canvasDirty = false;
            }
            return;
        }
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        this._canvasDirty = true;
        const scoreTarget = this.scorePartTarget();
        // Compactación in-place: recorremos una sola vez y vamos guardando las
        // partículas vivas al frente del array. Evita el splice(i,1) dentro de un
        // forEach (que es O(n²) por el desplazamiento y, además, se salta elementos
        // al mutar el array mientras se itera). Cada clic inyecta partículas 'energy',
        // así que este bucle por frame era el coste real al hacer clicks rápidos.
        const parts = this.particles;
        let w = 0;
        for (let i = 0; i < parts.length; i++) {
            const p = parts[i];
            if (p.t === 'energy') {
                if (p.boost === undefined) p.boost = lowQ ? 4 : 9;
                if (lowQ) {
                    const dx = scoreTarget.x - p.x, dy = scoreTarget.y - p.y;
                    const dist = Math.hypot(dx, dy);
                    if (dist < 10 || p.arrived) {
                        p.arrived = true;
                        p.life -= 0.24;
                    } else {
                        p.x += dx * 0.16; p.y += dy * 0.16;
                    }
                } else if (p.boost > 0) { p.boost--; p.vy += 0.18; }
                else {
                    const dx = scoreTarget.x - p.x, dy = scoreTarget.y - p.y;
                    const dist = Math.hypot(dx, dy);
                    p.vx = 0; p.vy = 0;
                    if (dist < 6 || p.arrived) {
                        if (!p.arrived) { p.arrived = true; this.pulseScore(); }
                        p.x = scoreTarget.x; p.y = scoreTarget.y; p.life -= 0.3;
                    } else { p.x += dx * 0.2; p.y += dy * 0.2; }
                }
            } else if (p.t === 'steam') { p.vx *= 0.985; p.vy -= 0.015; }
            else if (p.t === 'ingredient') { p.vy += 0.06; p.vx *= 0.98; p.life -= 0.022; }
            else if (p.t === 'soupBubble') { p.vy -= 0.035; p.vx *= 0.985; p.life -= 0.017; }
            p.x += p.vx; p.y += p.vy;
            if (p.t === 'soupBubble') {
                const r = p.size * (0.55 + p.life * 0.45);
                ctx.globalAlpha = Math.min(0.92, p.life * 1.05);
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.55, p.life * 0.5) + ')';
                ctx.beginPath();
                ctx.arc(p.x - r * 0.28, p.y - r * 0.28, Math.max(0.8, r * 0.32), 0, Math.PI * 2);
                ctx.fill();
            } else if (p.t !== 'ingredient') p.life -= p.t === 'steam' ? 0.011 : 0.015;
            if (p.t !== 'soupBubble') {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.t === 'steam' ? p.life * 1.05 : p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size * (p.t === 'steam' ? 0.6 + p.life * 0.5 : 1), 0, Math.PI * 2);
                ctx.fill();
            }
            if (p.life > 0) parts[w++] = p;
        }
        if (w !== parts.length) parts.length = w;
        ctx.globalAlpha = 1;
    }
};
    global.game = game;
})(typeof window !== 'undefined' ? window : this);
