/* Charms collection: providers, SkinAssetManager, collection UI (build-303). */
(function (global) {
    'use strict';

    var BUILD = global.BUILD || global.BUILD_TARGET || 'web';
    var _BAL = (typeof global.BALANCE !== 'undefined' ? global.BALANCE : {});

// === COLECCIÓN GENERATIVA POR CAPAS (Tarea 5) ===
// ====================================================================
// Capa AGNÓSTICA local. Amuletos cosméticos compuestos por capas (forma, material,
// patrón, emblema) + marco/brillo por rareza. Cada amuleto tiene un seed determinista
// que reproduce su apariencia (coleccionable estable). Drops por tiempo real jugado
// (cooldown por intervalo + tope diario, anti-abuso persistido y firmado).
const localCollectionProvider = {
    id: 'local',
    grantDrop(item) { return item; },
    getInventory() { return (game.coll && game.coll.items) ? game.coll.items : {}; },
    equip(equips) { if (game.coll) game.coll.equips = (equips && typeof equips === 'object') ? equips : {}; return true; }
};
// STUB Steam Inventory / mercado (BLOQUEADO por requisitos externos).
const steamMarketProvider = {
    id: 'steam',
    // TODO(Steam): ISteamInventory + item defs en panel; mercado = app publicada + umbrales Valve.
    grantDrop(item) {
        try {
            if (window.steamworks && window.steamworks.grantItem) {
                var sk = null;
                try { if (typeof collection !== 'undefined') sk = collection.skinById(item && item.id); } catch (e) {}
                var marketable = (typeof collOrigin !== 'undefined') ? collOrigin.canMarketItem(item, sk) : false;
                return window.steamworks.grantItem(item, { marketable: marketable });
            }
        } catch (e) {}
        return localCollectionProvider.grantDrop(item);
    },
    getInventory() {
        try {
            if (window.steamworks && window.steamworks.inventoryReady && window.steamworks.getInventory) {
                return window.steamworks.getInventory();
            }
        } catch (e) {}
        return localCollectionProvider.getInventory();
    },
    equip(key) { return localCollectionProvider.equip(key); }
};
function pickCollectionProvider() {
    try {
        if (BUILD === 'steam' && window.steamworks && window.steamworks.inventoryReady) return steamMarketProvider;
    } catch (e) {}
    return localCollectionProvider;
}
const collectionProvider = {
    grantDrop(item) { return pickCollectionProvider().grantDrop(item); },
    getInventory() { return pickCollectionProvider().getInventory(); },
    equip(e) { return pickCollectionProvider().equip(e); }
};
// === Skin asset manager (LRU, dual-resolution, platform-aware) ===
// Never decodes the full catalog at boot — scales to 1000+ skins.
const SkinAssetManager = (function () {
    const caches = { full: Object.create(null), thumb: Object.create(null) };
    const order = { full: [], thumb: [] };
    let limits = { full: 35, thumb: 70 };
    function initLimits() {
        const b = (typeof window !== 'undefined' && window.BUILD_TARGET) || 'web';
        let mob = false;
        try { mob = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent || ''); } catch (e) {}
        if (b === 'playables' || b === 'android' || b === 'ios' || mob) limits = { full: 20, thumb: 40 };
        else if (b === 'web') limits = { full: 40, thumb: 80 };
        else limits = { full: 35, thumb: 70 };
    }
    function canLoadFull() {
        try {
            const b = (typeof window !== 'undefined' && window.BUILD_TARGET) || 'web';
            if (b === 'playables' && typeof ytPlayables !== 'undefined' && ytPlayables && !ytPlayables._gameReadySent) return false;
        } catch (e) {}
        return true;
    }
    function touch(tier, key) {
        const o = order[tier];
        const i = o.indexOf(key);
        if (i >= 0) o.splice(i, 1);
        o.push(key);
    }
    function evictOne(tier) {
        const o = order[tier];
        if (!o.length) return;
        const key = o.shift();
        const entry = caches[tier][key];
        if (entry && entry.el) {
            try { entry.el.onload = null; entry.el.onerror = null; entry.el.src = ''; entry.el.removeAttribute('src'); } catch (e) {}
        }
        delete caches[tier][key];
    }
    function get(src, tier) {
        if (!src) return { el: null, ok: false };
        tier = tier === 'thumb' ? 'thumb' : 'full';
        if (tier === 'full' && !canLoadFull()) return { el: null, ok: false, deferred: true };
        const cache = caches[tier];
        if (cache[src]) { touch(tier, src); return cache[src]; }
        while (order[tier].length >= limits[tier]) evictOne(tier);
        const entry = { el: new Image(), ok: false };
        const notify = function () { try { collection._onSkinAssetLoaded(tier); } catch (e) {} };
        entry.el.decoding = 'async';
        entry.el.onload = function () { entry.ok = true; notify(); };
        entry.el.onerror = function () { entry.ok = false; notify(); };
        entry.el.src = src;
        if (entry.el.complete && entry.el.naturalWidth > 0) entry.ok = true;
        cache[src] = entry;
        touch(tier, src);
        return entry;
    }
    function bumpThumbLimit(min) {
        const n = Math.floor(Number(min) || 0);
        if (n > limits.thumb) limits.thumb = n;
    }
    initLimits();
    return { initLimits, get, canLoadFull, bumpThumbLimit, limits: function () { return limits; } };
})();

const collection = {
    RARITIES: [
        { k: 'common', weight: 55 }, { k: 'uncommon', weight: 28 }, { k: 'rare', weight: 12 },
        { k: 'epic', weight: 4 }, { k: 'legendary', weight: 0.7 }, { k: 'superleg', weight: 0.3 }, { k: 'anomaly', weight: 0.04 }
    ],
    rarRank: { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4, superleg: 5, anomaly: 6 },
    RAR_GLOW: { common: '#94a3b8', uncommon: '#4ade80', rare: '#a5f3fc', epic: '#d8b4fe', legendary: '#fbbf24', superleg: '#fb7185', anomaly: '#22d3ee' },
    DROP_INTERVAL: _BAL.charmDropIntervalSec || 600,
    DAILY_CAP: _BAL.charmDailyCap || 12,
    _view: 'grid', _packFilter: null, _browseFilter: 'all',
    _cache: {}, _gridIO: null, _loadedThumbs: null, _lastGridSig: '', _cauldronUpSig: '', _packOrderCache: null, _bulkGrant: false, _grantRenderTimer: null,
    catalog() { const c = (window.SKIN_CATALOG || []); return Array.isArray(c) ? c : []; },
    _storeTierOk(sk) {
        try { if (typeof STORE_TIER !== 'undefined' && STORE_TIER.skinAllowed) return STORE_TIER.skinAllowed(sk); } catch (e) {}
        return true;
    },
    _catalogLoadCb: null,
    ensureCatalog(cb) {
        const self = this;
        if (this.catalog().length) { if (cb) cb(true); return; }
        if (this._catalogLoadCb) { this._catalogLoadCb.push(cb || function () {}); return; }
        this._catalogLoadCb = [cb || function () {}];
        const done = function (ok) {
            const q = self._catalogLoadCb || [];
            self._catalogLoadCb = null;
            for (let i = 0; i < q.length; i++) { try { q[i](ok); } catch (e) {} }
        };
        const s = document.createElement('script');
        s.src = 'assets/skins/catalog.js?v=' + (typeof BUILD_V !== 'undefined' ? BUILD_V : String(Date.now()));
        s.onload = function () {
            const ok = self.catalog().length > 0;
            if (ok) try { self._reapplyEquipsAfterCatalog(); } catch (e) {}
            done(ok);
        };
        s.onerror = function () { done(false); };
        document.head.appendChild(s);
    },
    // Live = approved on server (dropLive !== false). Staging stays out of the album.
    liveCatalog() { return this.catalog().filter(s => s && s.id && s.dropLive !== false && this._storeTierOk(s)); },
    stagingCount() { return this.catalog().filter(s => s && s.id && s.dropLive === false).length; },
    publishedCount() { return this.liveCatalog().length; },
    // Album + drop stats: hide staged skins (dropLive:false) until released live or owned.
    // Player preview on local PC simulates live server album (no staging silhouettes).
    visibleCatalog() {
        if (typeof scIsPlayerPreview === 'function' && scIsPlayerPreview()) return this.liveCatalog();
        const cat = this.catalog();
        const owned = (game.coll && game.coll.items) ? game.coll.items : {};
        return cat.filter(s => s && s.id && (s.dropLive !== false || owned[s.id]) && (this._storeTierOk(s) || owned[s.id]));
    },
    /** Atlas set view: all catalog charms in pack (incl. staging silhouettes). */
    packCatalog(packId) {
        if (!packId) return [];
        let meta = null;
        try { meta = atlas.packMeta(packId); } catch (e) {}
        if (!meta || !Array.isArray(meta.skinIds) || !meta.skinIds.length) {
            return this.visibleCatalog().filter(s => s && s.id && atlas.packFor(s.id) === packId);
        }
        const out = [];
        for (let i = 0; i < meta.skinIds.length; i++) {
            const sk = this.skinById(meta.skinIds[i]);
            if (sk && sk.id) out.push(sk);
        }
        return out;
    },
    isLiveSkin(sk) { return !!(sk && sk.id && sk.dropLive !== false); },
    // Staging skins (dropLive:false) never drop randomly, but once a player owns one
    // it stays in the save forever — deploys must not wipe grandfathered charms.
    purgeUnpublishedCharms() {
        const c = this.normalize();
        let removed = 0;
        for (const id in c.items) {
            if (!Object.prototype.hasOwnProperty.call(c.items, id)) continue;
            const sk = this.skinById(id);
            if (sk && sk.dropLive === false) {
                const it = c.items[id];
                const owned = it && Math.floor(Number(it.count)) >= 1;
                if (owned) continue;
                delete c.items[id];
                removed++;
            }
        }
        if (removed && c.equips) {
            for (const slot of this.SLOTS) {
                const eq = c.equips[slot];
                if (eq && !c.items[eq]) c.equips[slot] = null;
            }
        }
        if (removed) {
            try { game.save(); } catch (e) {}
            try { this.refreshFab(); } catch (e2) {}
        }
        return removed;
    },
    skinById(id) { const cat = this.catalog(); for (let i = 0; i < cat.length; i++) { if (cat[i] && cat[i].id === id) return cat[i]; } return null; },
    skinsOfRarity(rar) { return this.catalog().filter(s => s && s.id && s.rarity === rar); },
    // Drop pool excludes EB shop spoons + skins staged on server with dropLive: false.
    dropPool(rarity) {
        let block = [];
        try { block = game.shopExclusiveSkinIds(); } catch (e) {}
        const shop = new Set(block);
        return this.skinsOfRarity(rarity).filter(s => !shop.has(s.id) && s.dropLive !== false && this._storeTierOk(s));
    },
    applyPathDropBias(pool) {
        try {
            const pathId = atlas.path();
            if (!pathId || !pool || !pool.length) return pool;
            const region = atlas.pathRegion(pathId);
            if (!region) return pool;
            const biased = [];
            for (let i = 0; i < pool.length; i++) {
                if (atlas.skinInPath(pool[i].id, pathId)) biased.push(pool[i]);
            }
            if (!biased.length) return pool;
            if (Math.random() < atlas.PATH_DROP_BIAS) return biased;
            return pool;
        } catch (e) { return pool; }
    },
    applyEventDropBias(pool) {
        try {
            const ev = softEvents.active();
            if (!ev || !ev.dropPack || !pool || !pool.length) return pool;
            const biased = [];
            for (let i = 0; i < pool.length; i++) {
                if (atlas.packFor(pool[i].id) === ev.dropPack) biased.push(pool[i]);
            }
            if (!biased.length) return pool;
            if (Math.random() < 0.35) return biased;
            return pool;
        } catch (e) { return pool; }
    },
    dropAccelMult() {
        let m = 1;
        try { m *= commChallenge.dropMult(); } catch (e) {}
        try {
            const c = this.normalize();
            const lv = Number.isFinite(c.cauldronLv) ? Math.min(5, Math.floor(c.cauldronLv)) : 0;
            if (lv > 0) m *= 1 + lv * (_BAL.cauldronDropPctPerLv != null ? _BAL.cauldronDropPctPerLv : 0.045);
        } catch (e2) {}
        return m;
    },
    dropAccelChipText() {
        let comm = false, cauld = false;
        try { if (commChallenge.dropMult() > 1.001) comm = true; } catch (e) {}
        try {
            const c = this.normalize();
            const lv = Number.isFinite(c.cauldronLv) ? Math.min(5, Math.floor(c.cauldronLv)) : 0;
            if (lv > 0) cauld = true;
        } catch (e2) {}
        const m = this.dropAccelMult();
        if (m <= 1.02) return '';
        const pct = Math.round((m - 1) * 100);
        if (comm && cauld) return t('drop_chip_both', { pct: pct });
        if (comm) return t('drop_chip_comm', { pct: pct });
        if (cauld) return t('drop_chip_cauldron', { pct: pct });
        return t('drop_chip', { pct: pct });
    },
    syncDropAccelChip() {
        const el = document.getElementById('drop-chip');
        if (!el) return;
        const txt = this.dropAccelChipText();
        if (txt) {
            if (el.textContent !== txt) el.textContent = txt;
            if (el.style.display !== 'block') el.style.display = 'block';
        } else if (el.style.display !== 'none') el.style.display = 'none';
    },
    cauldronMult() {
        const c = this.normalize();
        const maxLv = _BAL.cauldronMaxLv != null ? _BAL.cauldronMaxLv : 5;
        const lv = Number.isFinite(c.cauldronLv) ? Math.min(maxLv, Math.max(0, Math.floor(c.cauldronLv))) : 0;
        const cpsPct = _BAL.cauldronCpsPctPerLv != null ? _BAL.cauldronCpsPctPerLv : 0.022;
        return 1 + lv * cpsPct;
    },
    cauldronUpgradeCost() {
        const c = this.normalize();
        const lv = Number.isFinite(c.cauldronLv) ? Math.floor(c.cauldronLv) : 0;
        if (lv >= 5) return null;
        let cps = 100;
        try { cps = Math.max(100, game.getCps()); } catch (e) {}
        return { eb: Math.max(50000, Math.floor(cps * 200 * (lv + 1))), stock: 3 + lv };
    },
    cauldronUpgradeState() {
        const c = this.normalize();
        const lv = Number.isFinite(c.cauldronLv) ? Math.floor(c.cauldronLv) : 0;
        if (lv >= 5) return { maxed: true, lv };
        const cost = this.cauldronUpgradeCost();
        if (!cost) return { maxed: true, lv };
        try { farm.ensure(); } catch (e) {}
        const missing = [];
        for (let i = 0; i < FARM_TYPE_IDS.length; i++) {
            const id = FARM_TYPE_IDS[i];
            const have = (game.farm && game.farm.stock && game.farm.stock[id]) || 0;
            if (have < cost.stock) missing.push({ id, glyph: FARM_GLYPHS[id] || '?', have, need: cost.stock });
        }
        const affordEb = Number.isFinite(game.e) && game.e >= cost.eb;
        return { maxed: false, lv, cost, missing, affordEb, can: affordEb && missing.length === 0 };
    },
    upgradeCauldron() {
        const st = this.cauldronUpgradeState();
        if (st.maxed) { try { gx.toast(t('cauldron_max')); } catch (e) {} return; }
        if (!st.affordEb) {
            try { gx.toast(t('cauldron_need_eb', { n: st.cost.eb.toLocaleString() })); } catch (e2) {}
            return;
        }
        if (st.missing.length) {
            const list = st.missing.slice(0, 4).map(m => (m.glyph + ' ' + m.have + '/' + m.need)).join(', ');
            const more = st.missing.length > 4 ? '…' : '';
            try { gx.toast(t('cauldron_need_crops', { n: st.cost.stock, list: list + more })); } catch (e3) {}
            return;
        }
        const c = this.normalize();
        const lv = st.lv;
        game.e -= st.cost.eb;
        for (let j = 0; j < FARM_TYPE_IDS.length; j++) game.farm.stock[FARM_TYPE_IDS[j]] -= st.cost.stock;
        c.cauldronLv = lv + 1;
        this._cauldronUpSig = '';
        try { sound.play('buy'); } catch (e4) {}
        try { gx.toast(t('cauldron_upgrade_ok', { n: c.cauldronLv })); } catch (e5) {}
        try { game.save(); } catch (e6) {}
        this.renderCauldronUpgrade();
        try { farm.render(); } catch (e7) {}
    },
    renderCauldronUpgrade() {
        const host = document.getElementById('farm-cauldron-up');
        if (!host) return;
        const st = this.cauldronUpgradeState();
        if (st.maxed) {
            this._cauldronUpSig = 'max';
            host.innerHTML = `<span style="font-size:0.68rem;color:#94a3b8">${t('cauldron_max')}</span>`;
            return;
        }
        const sig = st.lv + '|' + st.cost.eb + '|' + st.cost.stock + '|' + Math.floor(game.e) + '|' + st.missing.map(m => m.id + ':' + m.have).join(',');
        if (sig === this._cauldronUpSig && host.querySelector('button')) return;
        this._cauldronUpSig = sig;
        const lv = st.lv;
        const status = lv > 0 ? `<div style="font-size:0.65rem;color:#94a3b8;margin-bottom:4px">${t('cauldron_status', { n: lv, cps: lv * 2, drop: lv * 4 })}</div>` : '';
        const cost = st.cost;
        let missingLine = '';
        if (st.missing.length) {
            const list = st.missing.slice(0, 5).map(m => m.glyph + ' ' + m.have + '/' + m.need).join(' · ');
            missingLine = `<div class="farm-cauldron-missing">${t('cauldron_need_crops', { n: cost.stock, list: list + (st.missing.length > 5 ? '…' : '') })}</div>`;
        } else if (st.affordEb) {
            missingLine = `<div style="font-size:0.62rem;color:#86efac;margin-top:4px">${t('cauldron_ready')}</div>`;
        } else {
            missingLine = `<div class="farm-cauldron-missing">${t('cauldron_need_eb', { n: cost.eb.toLocaleString() })}</div>`;
        }
        const btnCls = st.can ? 'gx-btn sm' : 'gx-btn sm cauldron-up-locked';
        host.innerHTML = status + `<button class="${btnCls}" type="button" style="width:100%" onclick="collection.upgradeCauldron()">${t('cauldron_upgrade', { n: lv + 1 })} · ${cost.eb.toLocaleString()} EB · ${cost.stock}× ${t('farm_each_crop')}</button>` + missingLine;
    },
    forgeStarToken(id) {
        const c = this.normalize();
        const it = c.items[id];
        if (!it || (it.ascended || 0) < 5) return;
        const packId = atlas.packFor(id);
        if (!packId) return;
        const missing = atlas.packMissingLiveSkins(packId);
        if (!missing.length) { try { gx.toast(t('coll_forge_none')); } catch (e) {} return; }
        const pick = missing[0];
        it.ascended -= 5;
        c.items[pick.id] = { id: pick.id, rarity: pick.rarity || 'common', count: 1 };
        try { game.save(); } catch (e2) {}
        try { sound.play('victory'); } catch (e3) {}
        const nm = (LANG === 'es') ? (pick.name_es || pick.name_en) : (pick.name_en || pick.name_es);
        try { gx.toast(t('coll_forge_toast', { name: nm || pick.id })); } catch (e4) {}
        try { this.showReveal(pick, pick.rarity); } catch (e5) {}
        this._lastGridSig = '';
        this._lastDupsSig = '';
        this.render(true);
        if (this._previewId === id) this.preview(id);
    },
    // === PER-SLOT EQUIP MODEL ===
    // Independent equip slots. Each helper family is its own slot, plus one spoon
    // and one chef-hat slot. The equipped state lives in c.equips[slotKey] = skinId|null.
    SLOTS: ['coco', 'bunny', 'pio', 'ivan', 'bongo', 'spoon', 'hat'],
    FAMILY_GROUPS: ['ivan', 'pio', 'coco', 'bunny', 'bongo', 'spoon', 'chefhat'],
    // Derive the slot key for a skin from its family. Helper skins map to their
    // helper token (the id prefix: coco/bunny/pio/ivan/bongo); spoon -> 'spoon';
    // chefhat -> 'hat'. Returns null if the skin doesn't map to any slot.
    slotOf(skin) {
        if (!skin) return null;
        if (skin.family === 'spoon') return 'spoon';
        if (skin.family === 'chefhat') return 'hat';
        if (skin.family === 'helper') {
            const token = String(skin.id || '').split('_')[0];
            return (this.HELPER_SLOT[token] != null) ? token : null;
        }
        return null;
    },
    // Infer helper slot from skin id prefix (coco_, pio_, …) when catalog lookup fails
    // (slow mobile load, stale SW shell). Prevents normalize() from wiping saved equips.
    slotOfIdBare(id) {
        if (!id || typeof id !== 'string') return null;
        const token = id.split('_')[0];
        return (this.HELPER_SLOT[token] != null) ? token : null;
    },
    slotOfId(id) {
        const fromCat = this.slotOf(this.skinById(id));
        return fromCat || this.slotOfIdBare(id);
    },
    // Owned helper id in save — keep equip/loadout even if catalog/SW is stale.
    _equipSlotValid(id, slot, c) {
        if (typeof id !== 'string' || !id || !c || !c.items || !c.items[id]) return false;
        if (slot === 'spoon' || slot === 'hat') return false;
        return this.slotOfIdBare(id) === slot;
    },
    // Resolve skin metadata for visuals even if catalog.js is momentarily unavailable.
    skinResolve(id) {
        const sk = this.skinById(id);
        if (sk) return sk;
        const slot = this.slotOfIdBare(id);
        if (!slot) return null;
        const c = game.coll;
        if (!c || !c.items || !c.items[id]) return null;
        const it = c.items[id];
        return {
            id,
            family: 'helper',
            img: 'assets/skins/' + id + '.png',
            thumb: 'assets/skins/thumbs/' + id + '.webp',
            rarity: it.rarity || 'common'
        };
    },
    // Helpers: equippable from Amuletos when owned. Spoon/hat: gallery-only in Amuletos —
    // equip only via the EB shop album (game.spoons / game.hats buy+equip flow).
    canEquipSkin(id) {
        const sk = this.skinById(id);
        if (sk) {
            if (sk.family === 'spoon' || sk.family === 'chefhat') return false;
            return true;
        }
        return !!this.slotOfIdBare(id);
    },
    // Currently-equipped skin id for a slot key (or null).
    equippedIn(slotKey) { const c = game.coll; return (c && c.equips && c.equips[slotKey]) ? c.equips[slotKey] : null; },
    equippedInForContext(slotKey, loadoutKey) {
        if (loadoutKey && this.LOADOUT_KEYS.indexOf(loadoutKey) >= 0) {
            const c = game.coll;
            const snap = c && c.loadouts && c.loadouts[loadoutKey];
            if (this.loadoutSnapValid(snap)) {
                const id = snap[slotKey];
                if (!id) return null;
                if (c.items && c.items[id] && this._equipSlotValid(id, slotKey, c)) return id;
                return null;
            }
        }
        return this.equippedIn(slotKey);
    },
    packSynergyInfo() {
        const counts = {};
        const helperSlots = ['coco', 'bunny', 'pio', 'ivan', 'bongo'];
        for (let i = 0; i < helperSlots.length; i++) {
            const id = this.equippedIn(helperSlots[i]);
            if (!id) continue;
            let pack = null;
            try { pack = atlas.packFor(id); } catch (e) { pack = null; }
            if (!pack) continue;
            counts[pack] = (counts[pack] || 0) + 1;
        }
        let bestPack = null, bestN = 0;
        for (const p in counts) { if (counts[p] > bestN) { bestN = counts[p]; bestPack = p; } }
        if (bestN < 2) return { mult: 1, pack: null, n: 0, pct: 0 };
        let mult = 1;
        if (bestN >= 4) mult = 1 + bestN * 0.028;
        else if (bestN >= 3) mult = 1 + bestN * 0.022;
        else mult = 1 + bestN * 0.015;
        return { mult, pack: bestPack, n: bestN, pct: Math.round((mult - 1) * 100) };
    },
    packSynergyMult() { return this.packSynergyInfo().mult; },
    syncSynergyChip() {
        const el = document.getElementById('synergy-chip');
        if (!el) return;
        const info = this.packSynergyInfo();
        if (info.n >= 2 && info.pack) {
            let packName = info.pack;
            try { packName = atlas.packDisplayTitle(info.pack); } catch (e) {}
            const stxt = t('synergy_chip', { pack: packName, n: info.n, pct: info.pct });
            if (el.textContent !== stxt) el.textContent = stxt;
            if (el.style.display !== 'block') el.style.display = 'block';
        } else if (el.style.display !== 'none') el.style.display = 'none';
    },
    equippedAscensionMult() {
        let bonus = 0;
        const slots = ['coco', 'bunny', 'pio', 'ivan', 'bongo'];
        for (let i = 0; i < slots.length; i++) {
            const id = this.equippedIn(slots[i]);
            if (!id || !game.coll || !game.coll.items || !game.coll.items[id]) continue;
            const stars = game.coll.items[id].ascended || 0;
            if (stars > 0) bonus += stars * 0.015;
        }
        return 1 + bonus;
    },
    // A skin id is "equipped" iff it's the current skin for its own slot.
    isEquipped(id) { const slot = this.slotOfId(id); return !!slot && this.equippedIn(slot) === id; },
    // === PER-SKIN PLACEMENT MODEL (PERMANENT) ===
    // Each spoon/hat skin's art is framed at a different scale/offset, so each id
    // gets its OWN placement { x, y, scale, rot } applied to the equipped sprite:
    //   x,y   -> px offset from the sprite's CSS anchor (right+, down+)
    //   scale -> multiplier on the sprite's base CSS size
    //   rot   -> absolute rotation in degrees (spoon stir oscillates around it)
    // Effective placement = override[id] (localStorage) || default[id] || family fallback.
    // These baked defaults apply to ALL players; the localStorage layer lets the
    // owner (or the temp calibration tool below) fine-tune without code changes.
    PLACE_KEY: 'soup_skin_placement',
    PLACE_FALLBACK: { spoon: { x: 95, y: -135, scale: 0.66, rot: -28 }, hat: { x: 0, y: -55, scale: 1.5, rot: 0 } },
    PLACE_DEFAULTS: {
        // Spoons: calibrated in-game with the creator placement tool (held in the chef's hand).
        spoon_common_wood:     { x: 117, y: 78, scale: 1.1,  rot: -24 },
        spoon_uncommon_carved: { x: 117, y: 72, scale: 1.14, rot: -16 },
        spoon_rare_steel:      { x: 111, y: 46, scale: 1,    rot: -14 },
        spoon_epic_gold:       { x: 116, y: 59, scale: 1,    rot: -17 },
        spoon_legendary_royal: { x: 103, y: 65, scale: 1.02, rot: -19 },
        spoon_superleg_iced:   { x: 133, y: 47, scale: 1.34, rot: 32 },
        // --- New spoons (Wave 1 + 2): APPROXIMATE defaults cloned from the closest
        // existing spoon of the same rarity. Fine-tune in-browser with the placement tool. ---
        spoon_common_skullwood:  { x: 117, y: 78, scale: 1.1,  rot: -24 },
        spoon_uncommon_bone:     { x: 117, y: 72, scale: 1.14, rot: -16 },
        spoon_rare_potion:       { x: 111, y: 46, scale: 1,    rot: -14 },
        spoon_epic_inferno:      { x: 116, y: 59, scale: 1,    rot: -17 },
        spoon_legendary_dragon:  { x: 103, y: 65, scale: 1.02, rot: -19 },
        spoon_superleg_crystal:  { x: 133, y: 47, scale: 1.34, rot: 32 },
        spoon_common_candy:      { x: 117, y: 78, scale: 1.1,  rot: -24 },
        spoon_uncommon_bamboo:   { x: 117, y: 72, scale: 1.14, rot: -16 },
        spoon_rare_thunder:      { x: 111, y: 46, scale: 1,    rot: -14 },
        spoon_epic_frost:        { x: 116, y: 59, scale: 1,    rot: -17 },
        spoon_superleg_cosmos:   { x: 133, y: 47, scale: 1.34, rot: 32 },
        spoon_epic_pizza:        { x: 122, y: 105, scale: 0.98, rot: -28 },
        spoon_legendary_sushi:   { x: 130, y: 73, scale: 0.92, rot: -28 },
        spoon_superleg_milkshake:  { x: 127, y: 106, scale: 1.06, rot: -25 },
        // Hats: calibrated in-game with the creator placement tool (sit on the bald skull).
        chefhat_common_white:    { x: -225, y: -249, scale: 1.54, rot: -39 },
        chefhat_uncommon_band:   { x: -214, y: -232, scale: 1.56, rot: -39 },
        chefhat_rare_skullprint: { x: -196, y: -219, scale: 1.36, rot: -39 },
        chefhat_epic_goldemblem: { x: -209, y: -234, scale: 1.5,  rot: -39 },
        chefhat_legendary_royal: { x: -203, y: -223, scale: 1.56, rot: -39 },
        chefhat_superleg_iced:   { x: -229, y: -247, scale: 1.78, rot: -39 },
        // --- New hats (Wave 1 + 2): APPROXIMATE defaults cloned from the closest
        // existing hat of the same rarity. Fine-tune in-browser with the placement tool. ---
        chefhat_common_duck:     { x: -225, y: -249, scale: 1.54, rot: -39 },
        chefhat_uncommon_bandana:{ x: -214, y: -232, scale: 1.56, rot: -39 },
        chefhat_rare_sushi:      { x: -196, y: -219, scale: 1.36, rot: -39 },
        chefhat_epic_gold:       { x: -209, y: -234, scale: 1.5,  rot: -39 },
        chefhat_legendary_crown: { x: -203, y: -223, scale: 1.56, rot: -39 },
        chefhat_superleg_galaxy: { x: -229, y: -247, scale: 1.78, rot: -39 },
        chefhat_common_classic:  { x: -225, y: -249, scale: 1.54, rot: -39 },
        chefhat_uncommon_pizza:  { x: -214, y: -232, scale: 1.56, rot: -39 },
        chefhat_rare_cactus:     { x: -196, y: -219, scale: 1.36, rot: -39 },
        chefhat_epic_flame:      { x: -209, y: -234, scale: 1.5,  rot: -39 },
        chefhat_superleg_prism:  { x: -229, y: -247, scale: 1.78, rot: -39 },
        chefhat_epic_pizza:      { x: -208, y: -221, scale: 1.3,  rot: -41 },
        chefhat_epic_chicken:    { x: -209, y: -234, scale: 1.5,  rot: -39 },
        chefhat_legendary_sushi: { x: -217, y: -224, scale: 1.32, rot: -42 },
        chefhat_superleg_milkshake: { x: -213, y: -225, scale: 1.28, rot: -41 },
        // Summer decor (chef hat / face overlays — same placement model as charms).
        summer_straw_hat: { x: -178, y: -193, scale: 1.26, rot: -25 },
        summer_shades:    { x: -80, y: -177, scale: 1.26, rot: -35 }
    },
    _placeCache: null,
    placeOverrides() {
        if (this._placeCache) return this._placeCache;
        let o = {};
        try { const raw = localStorage.getItem(this.PLACE_KEY); if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') o = p; } } catch (e) {}
        this._placeCache = o; return o;
    },
    // Effective placement for a skin id, normalized to {x,y,scale,rot}.
    placementFor(id) {
        const skin = this.skinById(id);
        const fam = skin ? (skin.family === 'chefhat' ? 'hat' : skin.family) : null;
        const base = this.PLACE_DEFAULTS[id] || (fam && this.PLACE_FALLBACK[fam]) || { x: 0, y: 0, scale: 1, rot: 0 };
        const ov = this.placeOverrides()[id];
        return Object.assign({ x: 0, y: 0, scale: 1, rot: 0 }, base, ov || {});
    },
    // Build a CSS transform from a placement; baseRot lets the caller add a stir offset.
    placementCss(p, rotAdd) {
        const r = (p.rot || 0) + (typeof rotAdd === 'number' ? rotAdd : 0);
        return `translate(-50%, -50%) translate(${p.x || 0}px, ${p.y || 0}px) rotate(${r}deg) scale(${p.scale != null ? p.scale : 1})`;
    },
    // localStorage override writers (used by the temp calibration tool; harmless to keep).
    setPlacement(id, obj) {
        const o = this.placeOverrides();
        o[id] = Object.assign({ x: 0, y: 0, scale: 1, rot: 0 }, this.placementFor(id), obj || {});
        try { localStorage.setItem(this.PLACE_KEY, JSON.stringify(o)); } catch (e) {}
        this._placeCache = o;
    },
    resetPlacement(id) {
        const o = this.placeOverrides();
        delete o[id];
        try { localStorage.setItem(this.PLACE_KEY, JSON.stringify(o)); } catch (e) {}
        this._placeCache = o;
    },
    // Canonical skin URLs: WebP primary everywhere; PNG fallback only via imgFail().
    _skinUrl(path) {
        if (!path) return null;
        try {
            const v = (typeof BUILD_V !== 'undefined' && BUILD_V) ? BUILD_V : '';
            if (v) return path + (path.indexOf('?') >= 0 ? '&' : '?') + 'v=' + encodeURIComponent(v);
        } catch (e) {}
        return path;
    },
    srcFull(skin) {
        if (!skin || !skin.img) return null;
        if (skin.rarity === 'anomaly') return this._skinUrl(skin.img);
        if (/\.webp$/i.test(skin.img)) return this._skinUrl(skin.img);
        return this._skinUrl(skin.img.replace(/\.png$/i, '.webp'));
    },
    srcThumb(skin) {
        if (!skin) return null;
        if (skin.thumb) return this._skinUrl(skin.thumb);
        if (skin.id) return this._skinUrl('assets/skins/thumbs/' + skin.id + '.webp');
        if (skin.img) return this._skinUrl(skin.img.replace(/\.png$/i, '.webp'));
        return null;
    },
    // Anomaly thumbs: PNG primary (large art, reliable on file:// and mobile).
    srcThumbDisplay(skin) {
        if (!skin) return null;
        if (skin.rarity === 'anomaly' && skin.img) return this._skinUrl(skin.img);
        return this.srcThumb(skin);
    },
    sceneImgForHelper(idx, loadoutKey) {
        const fam = this.HELPER_FAM_BY_IDX[idx];
        const eqId = fam ? this.equippedInForContext(fam, loadoutKey) : null;
        const skin = eqId ? this.skinResolve(eqId) : null;
        if (skin && skin.img && !this._playablesBlocksFull()) return this.srcFull(skin) || skin.img;
        return this.HELPER_DEFAULT_IMG[idx];
    },
    sceneImgFallbackForHelper(idx, loadoutKey) {
        try {
            const fam = this.HELPER_FAM_BY_IDX[idx];
            const eqId = fam ? this.equippedInForContext(fam, loadoutKey) : null;
            const skin = eqId ? this.skinResolve(eqId) : null;
            if (skin && skin.img) return skin.img;
        } catch (e) {}
        return this.HELPER_DEFAULT_IMG[idx] || '';
    },
    companionShopImg(cpIdx) {
        const def = this.HELPER_DEFAULT_IMG[cpIdx] || '';
        const fam = this.HELPER_FAM_BY_IDX[cpIdx];
        if (fam) {
            const eqId = this.equippedIn(fam);
            const skin = eqId ? this.skinResolve(eqId) : null;
            if (skin && skin.img) {
                return {
                    src: this.srcThumbDisplay(skin) || skin.img,
                    fb: skin.img,
                    def: def || skin.img
                };
            }
        }
        return { src: def, fb: def, def: def };
    },
    // Left companion column (owned helpers): same thumb→PNG fallback chain as shop cards.
    // Full PNG as primary often 404s / stalls on mobile PWA — shop thumbs already work.
    companionColumnImg(cpIdx, loadoutKey) {
        const def = this.HELPER_DEFAULT_IMG[cpIdx] || '';
        const fam = this.HELPER_FAM_BY_IDX[cpIdx];
        if (!fam) return { src: def, fb: def, def: def };
        const eqId = (loadoutKey && this.LOADOUT_KEYS.indexOf(loadoutKey) >= 0)
            ? this.equippedInForContext(fam, loadoutKey)
            : this.equippedIn(fam);
        const skin = eqId ? this.skinResolve(eqId) : null;
        if (skin && skin.img) {
            const thumb = this.srcThumbDisplay(skin) || skin.img;
            return { src: thumb, fb: skin.img, def: def || skin.img };
        }
        return { src: def, fb: def, def: def };
    },
    refreshCompanionShopCards() {
        try {
            if (typeof game === 'undefined' || !game.cp) return;
            for (let i = 0; i < game.cp.length; i++) {
                try { game.patchCompanionPreview(i); } catch (e) {}
            }
        } catch (e) {}
    },
    // After Prix / Skirmish: restore main-game equips captured at minigame open, then redraw.
    restoreSceneAfterMinigame() {
        if (this._sceneLoadoutTimer) { clearTimeout(this._sceneLoadoutTimer); this._sceneLoadoutTimer = null; }
        this._sceneLoadoutKey = null;
        let dirty = false;
        try { dirty = this.restoreMainEquipsSnapshot(); } catch (e0) {}
        try { this.applyEquippedVisual(); } catch (e) {}
        try { this.refreshCompanionShopCards(); } catch (e2) {}
        if (dirty) try { game.save(); } catch (e3) {}
    },
    _playablesBlocksFull() {
        try { return BUILD === 'playables' && typeof ytPlayables !== 'undefined' && ytPlayables && !ytPlayables._gameReadySent; } catch (e) { return false; }
    },
    _setFullImg(el, skin) {
        if (!el || !skin || !skin.img) return;
        if (this._playablesBlocksFull()) return;
        const png = skin.img;
        const webp = this.srcFull(skin);
        el.decoding = 'async';
        el.loading = 'eager';
        el.onerror = function () { try { collection.imgFail(this); } catch (e) {} };
        el.dataset.fallback = png;
        delete el.dataset.fallbackUsed;
        delete el.dataset.phDone;
        el.style.display = '';
        el.style.visibility = '';
        const primary = (webp && webp !== png) ? webp : png;
        el.src = primary;
        this.img(primary, 'full');
        if (webp && webp !== png && primary === webp) this.img(png, 'full');
    },
    prefetchSkin(skin, tier) {
        if (!skin) return;
        const src = tier === 'thumb' ? this.srcThumb(skin) : this.srcFull(skin);
        if (src) this.img(src, tier || 'full');
    },
    preloadEquipped() {
        const self = this;
        function run() {
            try {
                const c = self.normalize();
                const eq = c.equips || {};
                for (let i = 0; i < self.SLOTS.length; i++) {
                    const id = eq[self.SLOTS[i]];
                    if (id) self.prefetchSkin(self.skinById(id), 'full');
                }
            } catch (e) {}
        }
        if (BUILD === 'playables') {
            (function wait() { if (ytPlayables._gameReadySent) run(); else setTimeout(wait, 50); })();
        } else {
            setTimeout(run, 300);
        }
    },
    preload() { this.preloadEquipped(); },
    _onSkinAssetLoaded() {
        if (this._bulkGrant) return;
        // Canvas thumb cache only — grid uses live <img> lazy load; full render() here caused a flicker loop.
        this._cache = {};
    },
    _gridThumbOk(el) {
        try {
            const src = (el && el.dataset && el.dataset.src) || (el && el.src) || '';
            if (src) {
                if (!this._loadedThumbs) this._loadedThumbs = new Set();
                this._loadedThumbs.add(src);
            }
        } catch (e) {}
    },
    _bindGridLazyThumbs(grid) {
        if (this._gridIO) { try { this._gridIO.disconnect(); } catch (e) {} this._gridIO = null; }
        const imgs = grid.querySelectorAll('img[data-src]');
        if (!imgs.length) return;
        if (!('IntersectionObserver' in window)) {
            const self = this;
            imgs.forEach(function (img) {
                const src = img.dataset.src;
                if (src) {
                    self.img(src, 'thumb');
                    img.onload = function () { self._gridThumbOk(img); };
                    img.src = src;
                    img.removeAttribute('data-src');
                }
            });
            return;
        }
        const self = this;
        this._gridIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                const img = entry.target;
                const src = img.dataset.src;
                if (src) {
                    self.img(src, 'thumb');
                    img.onload = function () { self._gridThumbOk(img); };
                    img.src = src;
                    img.removeAttribute('data-src');
                }
                self._gridIO.unobserve(img);
            });
        }, { root: grid, rootMargin: '100px', threshold: 0.01 });
        imgs.forEach(function (img) { self._gridIO.observe(img); });
    },
    itemKey(it) { return String(it.id); },
    normalize() {
        let c = game.coll;
        if (!c || typeof c !== 'object') c = {};
        if (!c.items || typeof c.items !== 'object') c.items = {};
        const clean = {};
        for (const key in c.items) {
            const it = c.items[key];
            if (!it || typeof it !== 'object') continue;
            const id = (typeof it.id === 'string' && it.id) ? it.id : null;
            if (!id) continue;
            const sk = this.skinById(id);
            const rarity = (sk && this.rarRank[sk.rarity] != null) ? sk.rarity : ((this.rarRank[it.rarity] != null) ? it.rarity : 'common');
            let count = Math.floor(Number(it.count));
            if (!Number.isFinite(count) || count < 1) count = 1;
            if (count > 999999) count = 999999;
            let asc = Math.floor(Number(it.ascended));
            if (!Number.isFinite(asc) || asc < 0) asc = 0;
            if (asc > 9) asc = 9;
            const row = { id, rarity, count };
            if (asc > 0) row.ascended = asc;
            if (typeof it.origin === 'string') row.origin = it.origin;
            if (it.marketOk === true || it.marketOk === false) row.marketOk = it.marketOk;
            clean[id] = row;
        }
        c.items = clean;
        c.acc = (Number.isFinite(c.acc) && c.acc >= 0) ? Math.min(c.acc, this.DROP_INTERVAL * 2) : 0;
        c.day = (typeof c.day === 'string') ? c.day : '';
        c.today = (Number.isFinite(c.today) && c.today >= 0) ? Math.min(Math.floor(c.today), 100000) : 0;
        // --- Per-slot equip map (with backward-compatible migration). ---
        // Build a fresh, validated map keyed by slot. A slot keeps a value only if
        // the id is owned AND the skin actually belongs to that slot.
        const prevEquips = (c.equips && typeof c.equips === 'object') ? c.equips : {};
        const equips = {};
        for (const slot of this.SLOTS) {
            const id = prevEquips[slot];
            if (slot === 'spoon' || slot === 'hat') {
                equips[slot] = null;
                continue;
            }
            equips[slot] = this._equipSlotValid(id, slot, c) ? id : null;
        }
        // MIGRATION: old single-equip value (c.equipped) -> place it in its slot if
        // that slot is still empty. Then retire the legacy field.
        if (typeof c.equipped === 'string' && c.items[c.equipped]) {
            const mslot = this.slotOfId(c.equipped);
            if (mslot && !equips[mslot] && this.canEquipSkin(c.equipped)) equips[mslot] = c.equipped;
        }
        delete c.equipped;
        // Spoon/hat never use coll.equips — shop album owns equip state.
        equips.spoon = null;
        equips.hat = null;
        c.equips = equips;
        if (!c.atlasAnnounced || typeof c.atlasAnnounced !== 'object') c.atlasAnnounced = {};
        if (typeof c.atlasPath !== 'string') c.atlasPath = null;
        else if (!atlas.pathDef(c.atlasPath)) c.atlasPath = null;
        if (!c.atlasChapterAnnounced || typeof c.atlasChapterAnnounced !== 'object') c.atlasChapterAnnounced = {};
        if (!c.soupEvAnnounced || typeof c.soupEvAnnounced !== 'object') c.soupEvAnnounced = {};
        if (!c.eventAnnounced || typeof c.eventAnnounced !== 'object') c.eventAnnounced = {};
        if (!c.loadouts || typeof c.loadouts !== 'object') c.loadouts = { farm: null, prestige: null, prix: null, skirmish: null };
        else {
            if (!('farm' in c.loadouts)) c.loadouts.farm = null;
            if (!('prestige' in c.loadouts)) c.loadouts.prestige = null;
            if (!('prix' in c.loadouts)) c.loadouts.prix = null;
            if (!('skirmish' in c.loadouts)) c.loadouts.skirmish = null;
        }
        const loadoutFams = ['coco', 'bunny', 'pio', 'ivan', 'bongo'];
        for (let li = 0; li < this.LOADOUT_KEYS.length; li++) {
            const lk = this.LOADOUT_KEYS[li];
            const snap = c.loadouts[lk];
            if (!snap || typeof snap !== 'object') { c.loadouts[lk] = null; continue; }
            let any = false;
            const clean = {};
            for (let fi = 0; fi < loadoutFams.length; fi++) {
                const fam = loadoutFams[fi];
                const id = snap[fam];
                const ok = this._equipSlotValid(id, fam, c);
                clean[fam] = ok ? id : null;
                if (ok) any = true;
            }
            c.loadouts[lk] = any ? clean : null;
        }
        this._repairEquipsFromLoadouts(c);
        if (!c.museumClaimed || typeof c.museumClaimed !== 'object') c.museumClaimed = {};
        if (!c.prestigeSagaAnnounced || typeof c.prestigeSagaAnnounced !== 'object') c.prestigeSagaAnnounced = {};
        if (!Number.isFinite(c.cauldronLv) || c.cauldronLv < 0) c.cauldronLv = 0;
        else c.cauldronLv = Math.min(5, Math.floor(c.cauldronLv));
        this.syncShopSpoons(c);
        this.syncShopHats(c);
        try { if (typeof collOrigin !== 'undefined') collOrigin.sealPlatform(c); } catch (e) {}
        game.coll = c;
        return c;
    },
    // If a helper slot was cleared, try presets then any still-valid previous equip.
    _repairEquipsFromLoadouts(c) {
        const helperSlots = ['coco', 'bunny', 'pio', 'ivan', 'bongo'];
        for (let hi = 0; hi < helperSlots.length; hi++) {
            const fam = helperSlots[hi];
            if (c.equips[fam]) continue;
            for (let li = 0; li < this.LOADOUT_KEYS.length; li++) {
                const snap = c.loadouts && c.loadouts[this.LOADOUT_KEYS[li]];
                if (!snap) continue;
                const id = snap[fam];
                if (this._equipSlotValid(id, fam, c)) {
                    c.equips[fam] = id;
                    break;
                }
            }
        }
    },
    _reapplyEquipsAfterCatalog() {
        try {
            this.normalize();
            this.applyEquippedVisual();
            this.refreshFab();
            this.renderLoadouts();
            try {
                const m = document.getElementById('collection-modal');
                if (m && m.classList.contains('open')) this.render(true);
            } catch (e) {}
        } catch (e2) {}
    },
    // Sacred-album (EB shop) spoons live in game.spoons; mirror owned ones into coll.items
    // so they appear in the Amuletos grid like every other catalog skin.
    syncShopSpoons(c) {
        if (!c || !c.items) return;
        let spoons;
        try { spoons = game.spoons; } catch (e) { return; }
        if (!Array.isArray(spoons)) return;
        for (let i = 0; i < spoons.length; i++) {
            const s = spoons[i];
            if (!s || !s.owned || !s.skinId || c.items[s.skinId]) continue;
            const sk = this.skinById(s.skinId);
            if (!sk) continue;
            c.items[s.skinId] = { id: s.skinId, rarity: sk.rarity, count: 1 };
        }
    },
    // Sacred-album (EB shop) hats live in game.hats; mirror owned ones into coll.items
    // so they appear in the Amuletos grid like every other catalog skin.
    syncShopHats(c) {
        if (!c || !c.items) return;
        let hats;
        try { hats = game.hats; } catch (e) { return; }
        if (!Array.isArray(hats)) return;
        for (let i = 0; i < hats.length; i++) {
            const h = hats[i];
            if (!h || !h.owned || !h.skinId || c.items[h.skinId]) continue;
            const sk = this.skinById(h.skinId);
            if (!sk) continue;
            c.items[h.skinId] = { id: h.skinId, rarity: sk.rarity, count: 1 };
        }
    },
    clearShopPurchases() {
        const c = this.normalize();
        let ids;
        try { ids = game.shopExclusiveSkinIds(); } catch (e) { return; }
        let changed = false;
        for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            if (c.items[id]) { delete c.items[id]; changed = true; }
            if (c.equips) {
                for (const slot of this.SLOTS) {
                    if (c.equips[slot] === id) { c.equips[slot] = null; changed = true; }
                }
            }
        }
        if (changed) {
            game.coll = c;
            try { this.refreshFab(); } catch (e) {}
        }
    },
    addOwnedCharm(id) {
        const c = this.normalize();
        const sk = this.skinById(id);
        if (!sk) return false;
        let added = false;
        if (!c.items[id]) {
            c.items[id] = (typeof collOrigin !== 'undefined') ? collOrigin.newItem(id, sk.rarity) : { id, rarity: sk.rarity, count: 1 };
            added = true;
        }
        try { game.save(); } catch (e) {}
        this.notifyInventoryChange(true);
        return added || !!c.items[id];
    },
    notifyInventoryChange(forceRender) {
        this.refreshFab();
        try {
            const m = document.getElementById('collection-modal');
            if (m && m.classList.contains('open')) this.render(!!forceRender);
        } catch (e) {}
    },
    catalogCount() { return this.visibleCatalog().length; },
    // Baseline ownership: every player owns the common white chef hat from the
    // very start (new players AND existing saves). Idempotent + silent — no drop
    // reveal overlay, no victory sound, and it is NOT auto-equipped (the chef
    // stays bald until the player chooses). It also does NOT touch the daily drop
    // counter, so it never affects collection drop pacing.
    BASE_SKINS: ['chefhat_common_white'],
    ensureBaseSkins() {
        const c = this.normalize();
        for (let i = 0; i < this.BASE_SKINS.length; i++) {
            const id = this.BASE_SKINS[i];
            if (c.items[id]) continue;
            const sk = this.skinById(id);
            if (!sk) continue;
            c.items[id] = (typeof collOrigin !== 'undefined') ? collOrigin.newItem(id, sk.rarity, collOrigin.ORIGIN.BASE) : { id, rarity: sk.rarity, count: 1 };
        }
        return c;
    },
    // Creator-only helper: add catalog skins (lazy assets). Default = live catalog only.
    grantAllCharms(opts) {
        const o = opts || {};
        const liveOnly = !!o.liveOnly;
        const stagingOnly = !!o.stagingOnly;
        const c = this.normalize();
        const cat = this.catalog();
        let added = 0;
        this._bulkGrant = true;
        clearTimeout(this._grantRenderTimer);
        for (let i = 0; i < cat.length; i++) {
            const sk = cat[i];
            if (!sk || !sk.id) continue;
            if (liveOnly && sk.dropLive === false) continue;
            if (stagingOnly && sk.dropLive !== false) continue;
            if (c.items[sk.id]) continue;
            c.items[sk.id] = (typeof collOrigin !== 'undefined') ? collOrigin.newItem(sk.id, sk.rarity || 'common', collOrigin.ORIGIN.DEV) : { id: sk.id, rarity: sk.rarity || 'common', count: 1 };
            added++;
        }
        try { game.save(); } catch (e) {}
        this.refreshFab();
        const self = this;
        this._grantRenderTimer = setTimeout(function () {
            self._bulkGrant = false;
            try {
                const m = document.getElementById('collection-modal');
                if (m && m.classList.contains('open')) self.render(true);
            } catch (e2) {}
        }, 50);
        return added;
    },
    dayKey() { try { return new Date().toISOString().slice(0, 10); } catch (e) { return 'na'; } },
    ensureDay() { const c = this.normalize(); const today = this.dayKey(); if (c.day !== today) { c.day = today; c.today = 0; } return c; },
    distinctCount() { const c = game.coll; return (c && c.items) ? Object.keys(c.items).length : 0; },
    totalCount() { const c = game.coll; if (!c || !c.items) return 0; let n = 0; for (const k in c.items) n += c.items[k].count; return n; },
    duplicateKindsCount() {
        const c = game.coll;
        if (!c || !c.items) return 0;
        let n = 0;
        for (const k in c.items) if (c.items[k] && c.items[k].count > 1) n++;
        return n;
    },
    SALVAGE_BASE: { common: 800, uncommon: 2500, rare: 8000, epic: 25000, legendary: 80000, superleg: 250000, anomaly: 800000 },
    salvageValue(rarity) {
        const base = this.SALVAGE_BASE[rarity] || 500;
        const era = Number.isFinite(game.s) ? game.s : 0;
        return Math.floor(base * (1 + era * 0.35));
    },
    salvageOne(id) {
        const c = this.normalize();
        const it = c.items[id];
        if (!it || it.count <= 1) return;
        it.count--;
        const eb = this.salvageValue(it.rarity);
        game.e += eb;
        game.te += eb;
        try { sound.play('buy'); } catch (e) {}
        try { gx.toast(t('salvage_toast', { eb: eb.toLocaleString() })); } catch (e2) {}
        try { game.save(); } catch (e3) {}
        this._lastDupsSig = '';
        this._lastGridSig = '';
        this.render(true);
        if (this._previewId === id) this.preview(id);
    },
    salvageAllExtras() {
        const c = this.normalize();
        if (!c.items) return;
        let total = 0, n = 0;
        for (const k in c.items) {
            const it = c.items[k];
            if (!it || it.count <= 1) continue;
            const extras = it.count - 1;
            const val = this.salvageValue(it.rarity);
            total += val * extras;
            n += extras;
            it.count = 1;
        }
        if (n <= 0 || total <= 0) {
            try { gx.toast(t('salvage_none')); } catch (e) {}
            return;
        }
        game.e += total;
        game.te += total;
        try { sound.play('victory'); } catch (e) {}
        try { gx.toast(t('salvage_all_toast', { n: n, eb: total.toLocaleString() })); } catch (e2) {}
        try { game.save(); } catch (e3) {}
        this._lastDupsSig = '';
        this._lastGridSig = '';
        this.render(true);
    },
    salvagePreviewHtml(id, it) {
        if (!it) return '';
        const kk = String(id).replace(/'/g, "\\'");
        let html = '';
        if (it.count >= 3) html += `<button type="button" class="cp-salvage-btn coll-ascend-btn" onclick="collection.ascendCharm('${kk}')">${t('coll_ascend_btn')}</button>`;
        if ((it.ascended || 0) >= 5 && this.canForge(id)) html += `<button type="button" class="cp-salvage-btn coll-ascend-btn" onclick="collection.forgeStarToken('${kk}')">${t('coll_forge_btn')}</button>`;
        if (it.count > 1) {
            const eb = this.salvageValue(it.rarity);
            html += `<button type="button" class="cp-salvage-btn" onclick="collection.salvageOne('${kk}')">${t('salvage_one', { eb: eb.toLocaleString() })}</button>`;
        }
        return html;
    },
    canForge(id) {
        try {
            const c = this.normalize();
            const it = c.items[id];
            if (!it || (it.ascended || 0) < 5) return false;
            const packId = atlas.packFor(id);
            return !!(packId && atlas.packMissingLiveSkins(packId).length);
        } catch (e) { return false; }
    },
    ascendCharm(id) {
        const c = this.normalize();
        const it = c.items[id];
        if (!it || it.count < 3) return;
        it.count -= 2;
        it.ascended = (it.ascended || 0) + 1;
        try { sound.play('buy'); } catch (e) {}
        try { gx.toast(t('coll_ascend_toast', { n: it.ascended })); } catch (e2) {}
        try { game.save(); } catch (e3) {}
        this._lastDupsSig = '';
        this._lastGridSig = '';
        this.render(true);
        if (this._previewId === id) this.preview(id);
    },
    displayName(it) {
        const base = this.nameFor(it);
        if (it && it.ascended) return base + ' ' + t('coll_ascended', { n: it.ascended });
        return base;
    },
    helperEquipLabel(helperId, loadoutKey) {
        const hid = Math.floor(Number(helperId));
        const fam = this.HELPER_FAM_BY_IDX[hid];
        const c = game.cp && game.cp[hid];
        const helperName = c ? t(c.nk) : '?';
        if (!fam) return { helperName, skinName: null, rarity: null };
        const id = this.equippedInForContext(fam, loadoutKey);
        if (!id) return { helperName, skinName: null, rarity: null };
        const sk = this.skinResolve(id);
        const it = game.coll && game.coll.items && game.coll.items[id];
        const rarity = (it && it.rarity) || (sk && sk.rarity) || 'common';
        let skinName = sk ? (LANG === 'es' ? (sk.name_es || sk.name_en) : (sk.name_en || sk.name_es)) : id;
        if (it && it.ascended) skinName += ' ' + t('coll_ascended', { n: it.ascended });
        return { helperName, skinName, rarity };
    },
    helperEquipSubtitle(helperId, loadoutKey) {
        const info = this.helperEquipLabel(helperId, loadoutKey);
        if (!info.skinName) return info.helperName + ' · ' + t('helper_skin_default');
        return info.skinName + ' · ' + t('r_' + info.rarity);
    },
    helperEquipCardHtml(helperId, loadoutKey) {
        const info = this.helperEquipLabel(helperId, loadoutKey);
        if (!info.skinName) {
            return `<p class="p-sel-helper">${info.helperName}</p><p class="p-sel-skin" style="color:#94a3b8;font-weight:400">${t('helper_skin_default')}</p>`;
        }
        return `<p class="p-sel-skin r-${info.rarity}">${info.skinName}</p><p class="p-sel-helper">${info.helperName}</p>`;
    },
    renderMinigameEquipBar(hostId, loadoutKey) {
        const host = document.getElementById(hostId);
        if (!host) return;
        host.innerHTML = '';
        let any = false;
        try {
            (game.cp || []).forEach((c, i) => {
                if (!c || c.lv <= 0) return;
                any = true;
                let lbl = t(c.nk);
                try { lbl = this.helperEquipSubtitle(i, loadoutKey); } catch (e) {}
                const chip = document.createElement('span');
                chip.className = 'minigame-equip-chip';
                chip.title = lbl;
                chip.textContent = lbl;
                host.appendChild(chip);
            });
        } catch (e) {}
        host.style.display = any ? '' : 'none';
    },
    missingCount() {
        const c = this.normalize();
        const cat = this.visibleCatalog();
        let n = 0;
        for (let i = 0; i < cat.length; i++) {
            const s = cat[i];
            if (s && s.id && !(c.items && c.items[s.id])) n++;
        }
        return n;
    },
    setBrowseFilter(val) {
        this._browseFilter = (val === 'missing') ? 'missing' : 'all';
        this._lastGridSig = '';
        this.render(true);
    },
    renderBrowseFilter() {
        const cur = this._browseFilter || 'all';
        const btnAll = document.getElementById('coll-browse-all');
        const btnMiss = document.getElementById('coll-browse-missing');
        if (btnAll) btnAll.classList.toggle('active', cur !== 'missing');
        if (btnMiss) btnMiss.classList.toggle('active', cur === 'missing');
        const hint = document.getElementById('coll-browse-hint');
        const missingN = this.missingCount();
        const totalN = this.visibleCatalog().length;
        if (hint) {
            if (this._packFilter) {
                try {
                    const pr = atlas.packProgress(this._packFilter);
                    const miss = Math.max(0, pr.total - pr.owned);
                    if (cur === 'missing') {
                        hint.textContent = miss > 0 ? t('coll_filter_showing_missing', { n: miss }) : t('coll_filter_pack_complete', { n: pr.total });
                    } else if (miss > 0) {
                        hint.textContent = t('coll_filter_pack_prog', { owned: pr.owned, total: pr.total });
                    } else {
                        hint.textContent = t('coll_filter_pack_complete', { n: pr.total });
                    }
                } catch (ePf) {
                    hint.textContent = '';
                }
            } else if (cur === 'missing') {
                hint.textContent = missingN > 0 ? t('coll_filter_showing_missing', { n: missingN }) : t('coll_filter_none_missing');
            } else if (missingN > 0) {
                hint.textContent = t('coll_filter_missing_n', { n: missingN });
            } else {
                hint.textContent = t('coll_filter_all_complete', { n: totalN });
            }
        }
    },
    rollRarity() {
        let total = 0; this.RARITIES.forEach(r => total += r.weight);
        let x = Math.random() * total;
        for (const r of this.RARITIES) { if (x < r.weight) return r.k; x -= r.weight; }
        return 'common';
    },
    tick(sec) {
        if (game.p) return;
        const c = this.ensureDay();
        if (c.today >= this.DAILY_CAP) return;
        let accSec = sec;
        try { accSec *= game.hatDropLuckMult(); } catch (e) {}
        c.acc += accSec;
        let dropIv = this.DROP_INTERVAL;
        try { dropIv /= this.dropAccelMult(); } catch (e2) {}
        if (c.acc >= dropIv) { c.acc -= dropIv; this.grant(); }
    },
    grant(forcedRarity) {
        const c = this.ensureDay();
        if (c.today >= this.DAILY_CAP && !forcedRarity) return null;
        let rarity = forcedRarity || this.rollRarity();
        let pool = this.dropPool(rarity);
        while (!pool.length && (this.rarRank[rarity] || 0) > 0) {
            rarity = this.RARITIES[(this.rarRank[rarity] || 0) - 1].k;
            pool = this.dropPool(rarity);
        }
        pool = this.applyPathDropBias(pool);
        pool = this.applyEventDropBias(pool);
        if (!pool.length) return null;
        const skin = pool[Math.floor(Math.random() * pool.length)];
        const id = String(skin.id);
        if (c.items[id]) {
            c.items[id].count++;
            try { gx.toast(t('coll_dup_toast', { rarity: t('r_' + rarity), n: c.items[id].count })); } catch (e) {}
            sound.play('bubble');
        }
        else {
            c.items[id] = (typeof collOrigin !== 'undefined') ? collOrigin.newItem(id, rarity) : { id, rarity, count: 1 };
            gx.toast(t('coll_drop_toast', { rarity: t('r_' + rarity) }));
            // NEW skin only: show the full-screen reveal + victory fanfare (same sound as a Grand Prix win).
            try { this.showReveal(skin, rarity); } catch (e) {}
            sound.play('victory');
        }
        c.today++;
        collectionProvider.grantDrop(c.items[id]);
        try { if (atlas.skinInPath(id)) quests.bump('pathCharms', 1); } catch (e) {}
        if (rarity === 'legendary' || rarity === 'superleg') { try { ach.grant('mythicCharm'); } catch (e) {} }
        if (rarity === 'anomaly') { try { ach.grant('anomalyCharm'); } catch (e) {} try { ach.grant('mythicCharm'); } catch (e2) {} }
        try { ach.check(); } catch (e) {}
        try { atlas.checkNewCompletions(); } catch (e) {}
        try { game.save(); } catch (e) {}
        this.refreshFab();
        if (document.getElementById('collection-modal').classList.contains('open')) this.render(true);
        return id;
    },
    equip(key) {
        const c = this.normalize();
        if (!c.items[key]) return;
        const slot = this.slotOfId(key);
        if (!slot) return;
        if (slot === 'spoon' || slot === 'hat') return;
        if (!this.canEquipSkin(key)) return;
        // Toggle within THIS slot only. Equipping to a slot that already holds a
        // different skin swaps it; equipping the same skin again unequips it.
        // Other slots are never touched, so each helper/spoon/hat is independent.
        const prevInSlot = c.equips[slot];
        c.equips[slot] = (c.equips[slot] === key) ? null : key;
        if (c.equips[slot] === key) { try { sound.play('bubble'); } catch (e) {} }
        this._fabId = c.equips[slot] || this._fabId;
        collectionProvider.equip(c.equips);
        try { game.save(); } catch (e) {}
        this.refreshFab();
        const touched = [key];
        if (prevInSlot && prevInSlot !== key) touched.push(prevInSlot);
        if (!this._syncGridEquipState(c, touched)) this.render();
        try { this.applyEquippedVisual({ helperFam: slot }); } catch (e) {}
    },
    _patchGridEquipTile(k) {
        const grid = document.getElementById('collection-grid');
        if (!grid) return false;
        const esc = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(String(k)) : String(k).replace(/"/g, '\\"');
        const tile = grid.querySelector('.charm-tile[data-charm-id="' + esc + '"]');
        if (!tile) return false;
        const canEquip = this.canEquipSkin(k);
        const eqd = canEquip && this.isEquipped(k);
        tile.classList.toggle('equipped', eqd);
        const lbl = tile.querySelector('.charm-equip-lbl');
        if (lbl) {
            lbl.textContent = canEquip ? (eqd ? t('coll_equipped') : t('coll_equip')) : t('coll_collectible');
            lbl.style.color = canEquip ? (eqd ? '#fbbf24' : '#94a3b8') : '#64748b';
        }
        return true;
    },
    _syncGridEquipState(c, ids) {
        const grid = document.getElementById('collection-grid');
        if (!grid || !grid.querySelector('.charm-tile')) return false;
        let ok = true;
        for (let i = 0; i < ids.length; i++) {
            if (!this._patchGridEquipTile(ids[i])) ok = false;
        }
        if (!ok) return false;
        if (this._lastGridKeys && this._lastGridKeys.length) {
            this._lastGridSig = this._gridSig(c, this._lastGridKeys);
        }
        return true;
    },
    // Mapeo familia de ayudante -> índice en game.cp, y su sprite por defecto.
    HELPER_SLOT: { coco: 0, bunny: 1, pio: 2, ivan: 3, bongo: 4 },
    HELPER_FAM_BY_IDX: { 0: 'coco', 1: 'bunny', 2: 'pio', 3: 'ivan', 4: 'bongo' },
    HELPER_DEFAULT_IMG: { 0: 'assets/img/coco.png', 1: 'assets/img/bunny.png', 2: 'assets/img/pio.png', 3: 'assets/img/ivan.png', 4: 'assets/img/bongo.png' },
    // Aplica TODAS las skins equipadas (por slot) a la escena:
    //   spoon  -> #asset-spoon (cuchara en la mano del chef)
    //   coco/bunny/pio/ivan/bongo -> sprite del ayudante correspondiente (cp[])
    //   hat    -> overlay best-effort del gorro sobre la cabeza del chef
    // Cada slot es independiente; un slot vacío restaura su visual por defecto.
    applyEquippedVisual(opts) {
        opts = opts || {};
        // --- CUCHARA: shop album only (never coll.equips.spoon) ---
        try { game.applySpoonVisual(); } catch (e) {}
        // --- AYUDANTES (slots coco/bunny/pio/ivan/bongo) ---
        try { this.applyHelperVisual(opts.helperFam || null); } catch (e) {}
        // --- GORRO: shop album only (never coll.equips.hat) ---
        try {
            const sh = game.getEquippedShopHat();
            const shopHat = (sh && sh.owned && !game.equippedHatHidden()) ? game.hatCatalog(sh) : null;
            this.applyHatVisual(shopHat && shopHat.img ? shopHat : null);
        } catch (e) {}
    },
    // Aplica la skin equipada de CADA slot de ayudante a su sprite (o el sprite por
    // defecto si el slot está vacío) y re-renderiza escena + tienda al instante.
    applyHelperVisual(onlyFam) {
        try {
            const c = this.normalize();
            const eq = c.equips || {};
            const famKeys = onlyFam ? [onlyFam] : Object.keys(this.HELPER_SLOT);
            // 1) Cada slot de ayudante apunta a su skin equipada o, si está vacío, al
            //    sprite por defecto. Fijamos `im` SIEMPRE (independiente de comprado)
            //    para que la tarjeta de TIENDA muestre la skin como preview; la ESCENA
            //    sólo dibuja ayudantes COMPRADOS (lv>0) en el paso 2, así que una skin
            //    de un ayudante no comprado nunca entra en la escena de juego.
            for (let fi = 0; fi < famKeys.length; fi++) {
                const famKey = famKeys[fi];
                const idx = this.HELPER_SLOT[famKey];
                if (idx == null || !game.cp[idx]) continue;
                const skin = eq[famKey] ? this.skinResolve(eq[famKey]) : null;
                game.cp[idx].im = (skin && skin.img) ? skin.img : this.HELPER_DEFAULT_IMG[idx];
                if (onlyFam) {
                    try { game.patchCompanionPreview(idx); } catch (e) {}
                }
            }
            if (!onlyFam) {
                game.rebuild();
                try { game.renderCompanionCards(); } catch (e) {}
            }
            // Pre-decodifica los sprites de invocación recién equipados para que la
            // siguiente invocación no tope con un decode en frío (bug "solo partículas").
            try { game._warmHelperSprites(); } catch (e) {}
        } catch (e) {}
    },
    // Overlay best-effort del gorro: crea/oculta un <img id="asset-chefhat">
    // dentro de #sticky-center. La posición/escala se afinan en CSS.
    applyHatVisual(skin) {
        try {
            let hat = document.getElementById('asset-chefhat');
            if (skin && skin.img) {
                if (!hat) {
                    const center = document.getElementById('sticky-center');
                    if (!center) return;
                    hat = document.createElement('img');
                    hat.id = 'asset-chefhat';
                    hat.decoding = 'async';
                    hat.alt = '';
                    center.appendChild(hat);
                }
                hat.style.display = '';
                hat.style.visibility = '';
                hat.onerror = function () { try { collection.imgFail(this); } catch (e) {} };
                this._setFullImg(hat, skin);
                try { hat.style.transform = this.placementCss(this.placementFor(skin.id)); } catch (e) {}
            } else if (hat) {
                hat.style.display = 'none';
            }
        } catch (e) {}
    },
    hexA(hex, a) { try { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; } catch (e) { return `rgba(148,163,184,${a})`; } },
    // LRU-backed lazy loader (full + thumb tiers). Replaces eager catalog preload.
    img(src, tier) {
        return SkinAssetManager.get(src, tier || 'full');
    },
    fitRect(iw, ih, size, scale) {
        scale = scale || 0.94;
        const box = size * scale;
        const s = Math.min(box / iw, box / ih);
        const dw = iw * s, dh = ih * s;
        return { dx: (size - dw) / 2, dy: (size - dh) / 2, dw, dh };
    },
    roundRect(x, rx, ry, rw, rh, rad) {
        rad = Math.min(rad, rw / 2, rh / 2);
        x.beginPath();
        x.moveTo(rx + rad, ry);
        x.arcTo(rx + rw, ry, rx + rw, ry + rh, rad);
        x.arcTo(rx + rw, ry + rh, rx, ry + rh, rad);
        x.arcTo(rx, ry + rh, rx, ry, rad);
        x.arcTo(rx, ry, rx + rw, ry, rad);
        x.closePath();
    },
    star4(x, cx, cy, r) {
        x.beginPath();
        x.moveTo(cx, cy - r); x.quadraticCurveTo(cx, cy, cx + r, cy);
        x.quadraticCurveTo(cx, cy, cx, cy + r); x.quadraticCurveTo(cx, cy, cx - r, cy);
        x.quadraticCurveTo(cx, cy, cx, cy - r); x.closePath(); x.fill();
    },
    drawAura(x, aura, glow, size) {
        if (aura === 'none') return;
        const cx = size / 2, cy = size / 2;
        const R = size * (aura === 'anomaly' ? 0.58 : aura === 'super' ? 0.54 : aura === 'strong' ? 0.48 : 0.44);
        const a = aura === 'anomaly' ? 0.72 : aura === 'super' ? 0.62 : aura === 'strong' ? 0.45 : 0.26;
        const g = x.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
        g.addColorStop(0, this.hexA(glow, a)); g.addColorStop(1, this.hexA(glow, 0));
        x.save(); x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill(); x.restore();
    },
    drawSparkles(x, size, count) {
        x.save();
        const n = count || 8;
        for (let i = 0; i < n; i++) {
            const px = size * (0.1 + Math.random() * 0.8), py = size * (0.06 + Math.random() * 0.52), s = size * (0.02 + Math.random() * 0.045);
            x.fillStyle = (i % 2) ? '#ffffff' : '#ffe8a3'; x.globalAlpha = 0.9;
            this.star4(x, px, py, s);
        }
        x.restore();
    },
    drawPlaceholder(x, size) {
        const cx = size / 2, cy = size / 2;
        x.save();
        x.fillStyle = 'rgba(255,255,255,0.07)';
        this.roundRect(x, size * 0.16, size * 0.16, size * 0.68, size * 0.68, size * 0.1); x.fill();
        x.fillStyle = 'rgba(148,163,184,0.5)';
        x.beginPath(); x.arc(cx, cy - size * 0.05, size * 0.15, 0, Math.PI * 2); x.fill();
        x.beginPath(); x.ellipse(cx, cy + size * 0.21, size * 0.22, size * 0.15, 0, 0, Math.PI * 2); x.fill();
        x.fillStyle = '#cbd5e1'; x.font = 'bold ' + Math.floor(size * 0.24) + 'px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.fillText('?', cx, cy + size * 0.01);
        x.restore();
    },
    drawFrame(x, rarity, size) {
        const glow = this.RAR_GLOW[rarity] || '#94a3b8';
        const rank = this.rarRank[rarity] || 0;
        const lw = Math.max(2, size * 0.04);
        x.save();
        x.lineWidth = lw; x.strokeStyle = glow;
        if (rank >= 2) { x.shadowColor = glow; x.shadowBlur = size * (rank >= 6 ? 0.22 : rank >= 5 ? 0.16 : rank >= 4 ? 0.12 : 0.08); }
        this.roundRect(x, lw, lw, size - lw * 2, size - lw * 2, size * 0.12);
        x.stroke();
        x.restore();
        if (rank >= 5) {
            x.save();
            this.roundRect(x, lw, lw, size - lw * 2, size - lw * 2, size * 0.12); x.clip();
            this.drawSparkles(x, size, rank >= 6 ? 12 : 8);
            x.restore();
        }
    },
    draw(item, size) {
        const cv = document.createElement('canvas'); cv.width = size; cv.height = size;
        const x = cv.getContext('2d'); if (!x) return '';
        x.clearRect(0, 0, size, size);
        const rarity = item.rarity, rank = this.rarRank[rarity] || 0;
        const glow = this.RAR_GLOW[rarity] || '#94a3b8';
        const aura = rank >= 6 ? 'anomaly' : rank >= 5 ? 'super' : (rank >= 4 ? 'strong' : (rank >= 2 ? 'glow' : 'none'));
        this.drawAura(x, aura, glow, size);
        const skin = this.skinById(item.id);
        const src = skin ? this.srcThumb(skin) : null;
        const o = src ? this.img(src, 'thumb') : null;
        if (o && o.ok) {
            const r = this.fitRect(o.el.naturalWidth || o.el.width || 1, o.el.naturalHeight || o.el.height || 1, size, 0.86);
            x.drawImage(o.el, r.dx, r.dy, r.dw, r.dh);
            this._lastDrawOk = true;
        } else {
            this.drawPlaceholder(x, size);
            this._lastDrawOk = false;
        }
        this.drawFrame(x, rarity, size);
        try { return cv.toDataURL('image/png'); } catch (e) { return ''; }
    },
    thumb(item, size) {
        size = size || 96;
        const ck = this.itemKey(item) + ':' + item.rarity + ':' + size;
        if (this._cache[ck]) return this._cache[ck];
        const url = this.draw(item, size);
        if (url && this._lastDrawOk) this._cache[ck] = url;
        return url;
    },
    // Reemplaza un <img> roto: intenta PNG fallback, default del ayudante, luego "?".
    imgFail(el) {
        try {
            if (!el || !el.isConnected) return;
            if (el.dataset && el.dataset.fallback && !el.dataset.fallbackUsed) {
                el.dataset.fallbackUsed = '1';
                el.src = el.dataset.fallback;
                return;
            }
            if (el.dataset && el.dataset.fallback2 && !el.dataset.fallback2Used) {
                el.dataset.fallback2Used = '1';
                el.src = el.dataset.fallback2;
                return;
            }
        } catch (e) {}
        try {
            if (el.dataset && el.dataset.phDone) return;
            if (el.dataset) el.dataset.phDone = '1';
            const d = document.createElement('div'); d.className = (el.className || 'charm-img') + ' charm-ph'; d.textContent = '?'; el.replaceWith(d);
        } catch (e) { try { el.classList.add('charm-ph'); el.removeAttribute('src'); } catch (e2) {} }
    },
    refreshFab() {
        const thumb = document.getElementById('collection-fab-thumb'); if (!thumb) return;
        const c = game.coll;
        // With independent slots there can be several equipped skins; the FAB shows a
        // single representative thumbnail: the most-recently equipped one if it's
        // still equipped, otherwise the first equipped skin found across the slots.
        let id = null;
        if (c && c.equips) {
            if (this._fabId && this.isEquipped(this._fabId)) id = this._fabId;
            else { for (const slot of this.SLOTS) { if (c.equips[slot]) { id = c.equips[slot]; break; } } }
        }
        const skin = id ? this.skinById(id) : null;
        const thumbSrc = skin ? this.srcThumb(skin) : null;
        const fb = skin ? (skin.img || '') : '';
        thumb.innerHTML = thumbSrc ? `<img class="charm-fab-img" src="${thumbSrc}" data-fallback="${fb}" alt="" loading="lazy" decoding="async" onerror="collection.imgFail(this)">` : '';
    },
    nameFor(it) {
        const skin = this.skinById(it.id);
        if (skin) return (LANG === 'es' ? (skin.name_es || skin.name_en) : (skin.name_en || skin.name_es)) || it.id;
        return t('coll_unknown');
    },
    familyName(it) {
        const skin = this.skinById(it.id);
        const fam = skin ? skin.family : null;
        if (fam === 'spoon') return t('coll_fam_spoon');
        if (fam === 'chefhat') return t('coll_fam_chefhat');
        if (fam === 'helper') return t('coll_fam_helper');
        return '';
    },
    familyGroupOf(skin) {
        if (!skin) return 'other';
        if (skin.family === 'spoon') return 'spoon';
        if (skin.family === 'chefhat') return 'chefhat';
        if (skin.family === 'helper') {
            const token = String(skin.id || '').split('_')[0];
            if (this.FAMILY_GROUPS.indexOf(token) >= 0) return token;
        }
        return 'other';
    },
    familyGroupLabel(group) {
        if (group === 'anomaly') return t('coll_section_anomaly');
        const map = { ivan: 'comp_ivan', pio: 'comp_pio', coco: 'comp_coco', bunny: 'comp_bunny', bongo: 'comp_bongo', spoon: 'coll_fam_spoon', chefhat: 'coll_fam_chefhat' };
        return map[group] ? t(map[group]) : group;
    },
    RARITY_SECTION_ORDER: ['superleg', 'legendary', 'epic', 'rare', 'uncommon', 'common'],
    packOrderIndex() {
        if (this._packOrderCache) return this._packOrderCache;
        const map = { __spoons: 900001, __hats: 900002, __other: 999998, __misc: 999999 };
        let i = 0;
        try {
            const m = atlas.raw();
            if (m && m.packs) {
                for (const k in m.packs) {
                    if (Object.prototype.hasOwnProperty.call(m.packs, k)) map[k] = i++;
                }
            }
        } catch (e) {}
        this._packOrderCache = map;
        return map;
    },
    skinPackGroup(skinId) {
        try {
            const p = atlas.packFor(skinId);
            if (p) return p;
        } catch (e) {}
        const sk = this.skinById(skinId);
        if (!sk) return '__misc';
        if (sk.family === 'spoon') return '__spoons';
        if (sk.family === 'chefhat') return '__hats';
        return '__other';
    },
    packGroupLabel(packId) {
        if (packId === '__spoons') return t('coll_fam_spoon');
        if (packId === '__hats') return t('coll_fam_chefhat');
        if (packId === '__other' || packId === '__misc') return t('coll_pack_other');
        try { return atlas.packDisplayTitle(packId); } catch (e) { return packId; }
    },
    packIsUtensilAlbum(packId) {
        return packId === 'utensils_spoon' || packId === 'utensils_hat' || packId === '__spoons' || packId === '__hats';
    },
    packShowsHelperSynergy(packId) {
        if (!packId || packId.indexOf('__') === 0) return false;
        if (this.packIsUtensilAlbum(packId)) return false;
        return true;
    },
    packHeaderHint(packId) {
        if (this.packShowsHelperSynergy(packId)) return t('coll_pack_synergy_hint');
        if (this.packIsUtensilAlbum(packId)) return t('coll_pack_collectible_hint');
        return '';
    },
    groupKeysByPack(keys) {
        const groups = [];
        const map = {};
        const order = this.packOrderIndex();
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i];
            const pg = this.skinPackGroup(k);
            if (!map[pg]) {
                map[pg] = { pack: pg, keys: [] };
                groups.push(map[pg]);
            }
            map[pg].keys.push(k);
        }
        groups.sort(function (a, b) {
            const ia = order[a.pack] != null ? order[a.pack] : 999999;
            const ib = order[b.pack] != null ? order[b.pack] : 999999;
            if (ia !== ib) return ia - ib;
            return String(a.pack).localeCompare(String(b.pack));
        });
        return groups;
    },
    sortKeysByTier(keys) {
        const famRank = {};
        for (let fi = 0; fi < this.FAMILY_GROUPS.length; fi++) famRank[this.FAMILY_GROUPS[fi]] = fi;
        const packOrder = this.packOrderIndex();
        const self = this;
        keys.sort(function (a, b) {
            const sa = self.skinById(a), sb = self.skinById(b);
            const ra = self.rarRank[(sa || {}).rarity] || 0;
            const rb = self.rarRank[(sb || {}).rarity] || 0;
            if (ra !== rb) return rb - ra;
            const pia = packOrder[self.skinPackGroup(a)] != null ? packOrder[self.skinPackGroup(a)] : 999999;
            const pib = packOrder[self.skinPackGroup(b)] != null ? packOrder[self.skinPackGroup(b)] : 999999;
            if (pia !== pib) return pia - pib;
            const fa = famRank[self.familyGroupOf(sa)] != null ? famRank[self.familyGroupOf(sa)] : 999;
            const fb = famRank[self.familyGroupOf(sb)] != null ? famRank[self.familyGroupOf(sb)] : 999;
            if (fa !== fb) return fa - fb;
            return a < b ? -1 : a > b ? 1 : 0;
        });
        return keys;
    },
    sortKeysWithinTier(keys, ownedMap) {
        const famRank = {};
        for (let fi = 0; fi < this.FAMILY_GROUPS.length; fi++) famRank[this.FAMILY_GROUPS[fi]] = fi;
        const packOrder = this.packOrderIndex();
        const self = this;
        keys.sort(function (a, b) {
            const oa = ownedMap[a] ? 1 : 0;
            const ob = ownedMap[b] ? 1 : 0;
            if (oa !== ob) return ob - oa;
            const pia = packOrder[self.skinPackGroup(a)] != null ? packOrder[self.skinPackGroup(a)] : 999999;
            const pib = packOrder[self.skinPackGroup(b)] != null ? packOrder[self.skinPackGroup(b)] : 999999;
            if (pia !== pib) return pia - pib;
            const sa = self.skinById(a), sb = self.skinById(b);
            const fa = famRank[self.familyGroupOf(sa)] != null ? famRank[self.familyGroupOf(sa)] : 999;
            const fb = famRank[self.familyGroupOf(sb)] != null ? famRank[self.familyGroupOf(sb)] : 999;
            if (fa !== fb) return fa - fb;
            return a < b ? -1 : a > b ? 1 : 0;
        });
        return keys;
    },
    anomalyHelperOrder(skin) {
        const token = String((skin && skin.id) || '').split('_')[0];
        const i = this.FAMILY_GROUPS.indexOf(token);
        return i >= 0 ? i : 999;
    },
    nextDropText() {
        const c = this.ensureDay();
        if (c.today >= this.DAILY_CAP) return t('coll_daily_done');
        let iv = this.DROP_INTERVAL;
        try { iv /= this.dropAccelMult(); } catch (e) {}
        const left = Math.max(0, iv - c.acc);
        const mm = Math.floor(left / 60), ss = Math.floor(left % 60);
        return t('coll_next_drop', { time: mm + ':' + String(ss).padStart(2, '0') });
    },
    LOADOUT_KEYS: ['farm', 'prestige', 'prix', 'skirmish'],
    _sceneLoadoutKey: null,
    _sceneLoadoutTimer: null,
    _mainEquipsSnap: null,
    snapshotMainEquips() {
        try {
            const c = game.coll;
            if (!c || !c.equips) { this._mainEquipsSnap = null; return; }
            const snap = {};
            for (let i = 0; i < 5; i++) {
                const fam = ['coco', 'bunny', 'pio', 'ivan', 'bongo'][i];
                snap[fam] = c.equips[fam] || null;
            }
            this._mainEquipsSnap = snap;
        } catch (e) { this._mainEquipsSnap = null; }
    },
    restoreMainEquipsSnapshot() {
        const snap = this._mainEquipsSnap;
        this._mainEquipsSnap = null;
        if (!snap) return false;
        let changed = false;
        try {
            let c = game.coll;
            if (!c || typeof c !== 'object') return false;
            if (!c.equips || typeof c.equips !== 'object') c.equips = {};
            const fams = ['coco', 'bunny', 'pio', 'ivan', 'bongo'];
            for (let i = 0; i < fams.length; i++) {
                const fam = fams[i];
                const want = snap[fam];
                if (!want) continue;
                if (this._equipSlotValid(want, fam, c) && c.equips[fam] !== want) {
                    c.equips[fam] = want;
                    changed = true;
                }
            }
            if (changed) game.coll = c;
        } catch (e) {}
        return changed;
    },
    loadoutLabel(key) {
        if (key === 'farm') return t('loadout_farm');
        if (key === 'prestige') return t('loadout_prestige');
        if (key === 'prix') return t('loadout_prix');
        if (key === 'skirmish') return t('loadout_skirmish');
        return key;
    },
    snapshotEquips() {
        const eq = (game.coll && game.coll.equips && typeof game.coll.equips === 'object') ? game.coll.equips : {};
        const snap = {};
        for (const fam of ['coco', 'bunny', 'pio', 'ivan', 'bongo']) {
            const id = eq[fam];
            snap[fam] = (typeof id === 'string' && id) ? id : null;
        }
        return snap;
    },
    loadoutSnapValid(snap) {
        if (!snap || typeof snap !== 'object') return false;
        const c = game.coll || {};
        for (const fam of ['coco', 'bunny', 'pio', 'ivan', 'bongo']) {
            const id = snap[fam];
            if (this._equipSlotValid(id, fam, c)) return true;
        }
        return false;
    },
    saveLoadout(key) {
        if (this.LOADOUT_KEYS.indexOf(key) < 0) return;
        let c = game.coll;
        if (!c || typeof c !== 'object') c = {};
        if (!c.loadouts || typeof c.loadouts !== 'object') c.loadouts = { farm: null, prestige: null, prix: null, skirmish: null };
        c.loadouts[key] = this.snapshotEquips();
        game.coll = c;
        try { game.save(); } catch (e) {}
        try { gx.toast(t('loadout_saved', { name: this.loadoutLabel(key) })); } catch (e2) {}
        this.renderLoadouts();
        try {
            const m = document.getElementById('collection-modal');
            if (m && m.classList.contains('open')) this.render(true);
        } catch (e3) {}
    },
    applyLoadout(key, silent) {
        if (this.LOADOUT_KEYS.indexOf(key) < 0) return;
        const c = this.normalize();
        const snap = c.loadouts[key];
        if (!this.loadoutSnapValid(snap)) { if (!silent) try { gx.toast(t('loadout_empty')); } catch (e) {} return; }
        for (const fam of ['coco', 'bunny', 'pio', 'ivan', 'bongo']) {
            const id = snap[fam];
            if (this._equipSlotValid(id, fam, c)) c.equips[fam] = id;
            else c.equips[fam] = null;
        }
        try { collectionProvider.equip(c.equips); } catch (e) {}
        try { game.save(); } catch (e2) {}
        if (!silent) try { gx.toast(t('loadout_applied', { name: this.loadoutLabel(key) })); } catch (e3) {}
        try { this.applyEquippedVisual(); } catch (e4) {}
        this.refreshFab();
        if (!silent) this.render(true);
    },
    tryAutoLoadout(key) {
        /* Presets no longer overwrite main-game equips — use applyLoadout() manually or loadoutKey in UI. */
    },
    flashSceneLoadout(key, ms) {
        if (this.LOADOUT_KEYS.indexOf(key) < 0) return;
        const c = this.normalize();
        if (!this.loadoutSnapValid(c.loadouts && c.loadouts[key])) return;
        if (this._sceneLoadoutTimer) { clearTimeout(this._sceneLoadoutTimer); this._sceneLoadoutTimer = null; }
        this._sceneLoadoutKey = key;
        try { game.rebuild(); } catch (e) {}
        const dur = Math.max(1000, Number(ms) || 8000);
        const self = this;
        this._sceneLoadoutTimer = setTimeout(function () {
            self._sceneLoadoutKey = null;
            self._sceneLoadoutTimer = null;
            try { game.rebuild(); } catch (e2) {}
        }, dur);
    },
    renderLoadouts() {
        const host = document.getElementById('coll-loadouts');
        if (!host) return;
        const self = this;
        const c = game.coll || {};
        host.innerHTML = this.LOADOUT_KEYS.map(key => {
            const lbl = self.loadoutLabel(key);
            const saved = self.loadoutSnapValid(c.loadouts && c.loadouts[key]);
            return `<div class="coll-loadout${saved ? ' saved' : ''}"><span class="coll-loadout-lbl">${lbl}</span><div class="coll-loadout-btns"><button type="button" class="gx-btn sm" onclick="collection.applyLoadout('${key}')">${t('loadout_apply')}</button><button type="button" class="gx-btn sm" onclick="collection.saveLoadout('${key}')">${t('loadout_save')}</button></div></div>`;
        }).join('');
    },
    claimMuseumPlaque(packId) {
        const pr = atlas.packProgress(packId);
        if (!pr.complete) return;
        const c = this.normalize();
        if (c.museumClaimed[packId]) return;
        c.museumClaimed[packId] = 1;
        game.as += 2;
        try { sound.play('buy'); } catch (e) {}
        try { gx.toast(t('museum_claim') + ' (+2 ⬨)'); } catch (e2) {}
        try { game.save(); } catch (e3) {}
        try { objective.sync(); } catch (e4) {}
        this.render(true);
    },
    open() {
        try { if (typeof mobileUI !== 'undefined') mobileUI.closeAll(); } catch (e0) {}
        this._view = 'grid';
        this._packFilter = null;
        this._browseFilter = 'all';
        this._lastGridSig = '';
        this._lastDupsSig = '';
        const md = document.getElementById('collection-modal');
        if (md) md.classList.add('open');
        const self = this;
        const finish = function () {
            try { scGrantOwnerCatalog(); } catch (e) {}
            try { self.render(true); } catch (err) {
                console.error('collection.render', err);
                self._showRenderError();
            }
            try { tutorial.notify('collection_open'); } catch (e2) {}
        };
        if (this.catalog().length) { finish(); return; }
        const grid = document.getElementById('collection-grid');
        if (grid) grid.innerHTML = `<div style="grid-column:1/-1;color:#94a3b8;font-size:0.82rem;padding:14px">${t('coll_catalog_loading')}</div>`;
        this.ensureCatalog(function (ok) {
            if (!ok) { self._showCatalogMissing(); return; }
            finish();
        });
    },
    _showRenderError() {
        const grid = document.getElementById('collection-grid');
        if (grid && !grid.querySelector('.charm-tile')) {
            grid.innerHTML = `<div style="grid-column:1/-1;color:#fca5a5;font-size:0.82rem;padding:14px">${t('coll_render_err')}</div>`;
        }
    },
    _showCatalogMissing() {
        const grid = document.getElementById('collection-grid');
        if (!grid) return;
        grid.innerHTML = `<div style="grid-column:1/-1;color:#94a3b8;font-size:0.82rem;padding:14px">${t('coll_catalog_missing')}</div>`;
    },
    close() { document.getElementById('collection-modal').classList.remove('open'); },
    setView(view) {
        this._view = (view === 'atlas') ? 'atlas' : ((view === 'dups') ? 'dups' : ((view === 'museum') ? 'museum' : 'grid'));
        if (this._view === 'atlas' || this._view === 'museum') this._packFilter = null;
        this._lastGridSig = '';
        this._lastDupsSig = '';
        const tabAll = document.getElementById('coll-tab-all');
        const tabAtlas = document.getElementById('coll-tab-atlas');
        const tabDups = document.getElementById('coll-tab-dups');
        const tabMuseum = document.getElementById('coll-tab-museum');
        if (tabAll) tabAll.classList.toggle('active', this._view === 'grid');
        if (tabAtlas) tabAtlas.classList.toggle('active', this._view === 'atlas');
        if (tabDups) tabDups.classList.toggle('active', this._view === 'dups');
        if (tabMuseum) tabMuseum.classList.toggle('active', this._view === 'museum');
        this.render(true);
        if (this._view === 'atlas' && !atlas.path()) {
            try { atlas.openPathModal(); } catch (e) {}
        }
    },
    openPack(packId) {
        this._packFilter = packId || null;
        this._view = 'grid';
        const tabAll = document.getElementById('coll-tab-all');
        const tabAtlas = document.getElementById('coll-tab-atlas');
        const tabDups = document.getElementById('coll-tab-dups');
        const tabMuseum = document.getElementById('coll-tab-museum');
        if (tabAll) tabAll.classList.add('active');
        if (tabAtlas) tabAtlas.classList.remove('active');
        if (tabDups) tabDups.classList.remove('active');
        if (tabMuseum) tabMuseum.classList.remove('active');
        this.render(true);
    },
    clearPackFilter() {
        this._packFilter = null;
        this.render(true);
    },
    preview(id) {
        this._previewId = id;
        const ov = document.getElementById('charm-preview'); if (!ov) return;
        const c = game.coll;
        const it = (c && c.items && c.items[id]) ? c.items[id] : null;
        const skin = this.skinById(id);
        const rarity = skin ? skin.rarity : (it ? it.rarity : 'common');
        const glow = this.RAR_GLOW[rarity] || '#94a3b8';
        const stage = document.getElementById('charm-preview-stage');
        if (stage) {
            stage.className = 'cp-stage r-' + rarity;
            const full = skin ? this.srcFull(skin) : null;
            const fb = skin ? (skin.img || '') : '';
            stage.innerHTML = full
                ? `<img class="cp-img" src="${full}" data-fallback="${fb}" alt="" loading="lazy" decoding="async" onerror="collection.imgFail(this)">`
                : `<div class="cp-img charm-ph">?</div>`;
            if (full) this.prefetchSkin(skin, 'full');
        }
        const nameEl = document.getElementById('charm-preview-name');
        if (nameEl) nameEl.textContent = it ? this.displayName(it) : (skin ? ((LANG === 'es' ? (skin.name_es || skin.name_en) : (skin.name_en || skin.name_es)) || id) : t('coll_unknown'));
        const rarEl = document.getElementById('charm-preview-rar');
        if (rarEl) {
            const fam = it ? this.familyName(it) : '';
            rarEl.textContent = (fam ? fam + ' · ' : '') + t('r_' + rarity);
            rarEl.style.color = glow;
            rarEl.style.textShadow = '0 0 12px ' + this.hexA(glow, 0.55);
        }
        const bonusEl = document.getElementById('charm-preview-bonus');
        if (bonusEl) {
            let bl = '';
            try {
                if (this.canEquipSkin(id)) bl = itemBonus.skinBonusLine(id, it);
            } catch (eB) {}
            bonusEl.textContent = bl || '';
            bonusEl.style.display = bl ? '' : 'none';
        }
        const qtyEl = document.getElementById('charm-preview-qty');
        if (qtyEl) {
            if (it && it.count > 0) {
                qtyEl.textContent = t('coll_qty', { n: it.count });
                qtyEl.style.display = '';
            } else {
                qtyEl.textContent = '';
                qtyEl.style.display = 'none';
            }
        }
        const actEl = document.getElementById('charm-preview-actions');
        if (actEl) {
            actEl.innerHTML = it ? this.salvagePreviewHtml(id, it) : '';
        }
        ov.classList.add('open');
    },
    closePreview() { this._previewId = null; const ov = document.getElementById('charm-preview'); if (ov) ov.classList.remove('open'); },
    // TUNABLE: auto-dismiss delay (ms) for the drop reveal. Set to 0 to disable
    // auto-dismiss and require the button/backdrop. Number of sparkles below too.
    REVEAL_AUTODISMISS_MS: 0,
    REVEAL_SPARKLES: 18,
    // Full-screen reveal shown ONLY when a brand-new skin is obtained (see grant()).
    // The skin is already in c.items by the time this runs; this is purely cosmetic
    // and never blocks the game loop.
    showReveal(skin, rarity) {
        try {
            this.prefetchSkin(skin, 'full');
            const ov = document.getElementById('skin-reveal'); if (!ov || !skin) return;
            const rar = rarity || skin.rarity || 'common';
            const glow = this.RAR_GLOW[rar] || '#94a3b8';
            const box = ov.querySelector('.sr-box');
            if (box) box.classList.toggle('sr-anomaly', rar === 'anomaly');
            const stage = document.getElementById('skin-reveal-stage');
            if (stage) {
                stage.className = 'sr-stage r-' + rar;
                const full = this.srcFull(skin);
                const fb = skin.img || '';
                stage.innerHTML = full
                    ? `<img id="skin-reveal-img" class="sr-img" src="${full}" data-fallback="${fb}" alt="" loading="eager" decoding="async" onerror="collection.imgFail(this)">`
                    : `<div class="sr-img charm-ph" style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:5rem;color:#cbd5e1;">?</div>`;
            }
            const nameEl = document.getElementById('skin-reveal-name');
            if (nameEl) nameEl.textContent = (LANG === 'es' ? (skin.name_es || skin.name_en) : (skin.name_en || skin.name_es)) || skin.id;
            const rarEl = document.getElementById('skin-reveal-rar');
            if (rarEl) {
                const fam = t('coll_fam_' + skin.family);
                rarEl.textContent = (fam ? fam + ' · ' : '') + t('r_' + rar);
                rarEl.style.color = glow;
                rarEl.style.textShadow = '0 0 12px ' + this.hexA(glow, 0.55);
            }
            this.buildRevealSparkles(glow, rar === 'anomaly' ? 28 : (this.REVEAL_SPARKLES || 0));
            ov.classList.add('open');
            if (this._revealTimer) { clearTimeout(this._revealTimer); this._revealTimer = null; }
            if (this.REVEAL_AUTODISMISS_MS > 0) {
                this._revealTimer = setTimeout(() => this.closeReveal(), this.REVEAL_AUTODISMISS_MS);
            }
        } catch (e) {}
    },
    buildRevealSparkles(glow, count) {
        try {
            const wrap = document.getElementById('skin-reveal-sparkles'); if (!wrap) return;
            let html = '';
            const n = count != null ? count : (this.REVEAL_SPARKLES || 0);
            for (let i = 0; i < n; i++) {
                const ang = Math.random() * Math.PI * 2;
                const dist = 120 + Math.random() * 220;
                const sx = Math.cos(ang) * dist, sy = Math.sin(ang) * dist;
                const delay = (Math.random() * 0.6).toFixed(2);
                const size = (6 + Math.random() * 10).toFixed(1);
                html += `<span class="sr-spark" style="left:50%;top:46%;width:${size}px;height:${size}px;--sx:${sx.toFixed(0)}px;--sy:${sy.toFixed(0)}px;animation-delay:${delay}s;background:radial-gradient(circle, #fff 0%, ${glow} 45%, rgba(255,255,255,0) 70%);"></span>`;
            }
            wrap.innerHTML = html;
        } catch (e) {}
    },
    closeReveal() {
        try { if (this._revealTimer) { clearTimeout(this._revealTimer); this._revealTimer = null; } } catch (e) {}
        const ov = document.getElementById('skin-reveal'); if (ov) ov.classList.remove('open');
    },
    _gridSig(c, keys) {
        let s = '';
        for (let i = 0; i < keys.length; i++) {
            const k = keys[i], it = c.items[k];
            s += k + ':' + (it ? it.count : 0) + ':' + (it && it.ascended ? it.ascended : 0) + ':' + (this.isEquipped(k) ? 1 : 0) + '|';
        }
        return s;
    },
    render(force) {
        const c = this.normalize();
        const showCharmTools = (this._view === 'grid' || this._view === 'dups');
        const browseBar = document.getElementById('coll-browse-bar');
        const loadoutsWrap = document.getElementById('coll-loadouts-wrap');
        if (browseBar) browseBar.style.display = showCharmTools ? 'flex' : 'none';
        if (loadoutsWrap) loadoutsWrap.style.display = showCharmTools ? '' : 'none';
        if (showCharmTools) this.renderBrowseFilter();
        let cat = this._packFilter ? this.packCatalog(this._packFilter) : this.visibleCatalog();
        if (this._browseFilter === 'missing') {
            cat = cat.filter(s => s && s.id && !(c.items && c.items[s.id]));
        }
        const stats = document.getElementById('collection-stats');
        if (stats) {
            let bonusLine = '';
            try {
                const sets = atlas.completedPackCount();
                if (sets > 0) bonusLine = `<br>${t('coll_set_bonus', { n: sets, pct: atlas.setBonusPctDisplay() })}`;
            } catch (e) {}
            let pathLine = '';
            try {
                const pp = atlas.path();
                if (pp) {
                    const pd = atlas.pathDef(pp);
                    const pico = (typeof scCauldronIcon !== 'undefined' ? scCauldronIcon.pathIcon(pd) : (pd.emoji || '🧭'));
                    pathLine = `<br>${pico} ${t('path_current', { name: atlas.pathTitle(pp) })}`;
                }
            } catch (e2) {}
            const dupExtra = this.totalCount() - this.distinctCount();
            const dupLine = dupExtra > 0 ? `<br><button type="button" class="coll-dups-link" onclick="collection.setView('dups')">${t('coll_duplicates_extra', { n: dupExtra })} — ${t('coll_tap_dups')}</button>` : '';
            const pubTotal = this.publishedCount();
            const ownedN = this.distinctCount();
            let pubLine = '';
            if (pubTotal > 0) {
                pubLine = (ownedN >= pubTotal)
                    ? `<br>${t('coll_published_complete', { n: pubTotal })}`
                    : `<br>${t('coll_published_goal', { n: ownedN, total: pubTotal })}`;
            }
            try {
                if (typeof scIsOwnerDevice === 'function' && scIsOwnerDevice()) {
                    const stN = this.stagingCount();
                    if (stN > 0) pubLine += `<br><span style="font-size:0.68rem;color:#94a3b8">${t('coll_staging_hidden', { n: stN })}</span>`;
                }
            } catch (eSt) {}
            try {
                if (typeof scIsPlayerPreview === 'function' && scIsPlayerPreview()) {
                    pubLine += `<br><span style="font-size:0.68rem;color:#7dd3fc">${t('player_preview_on')}</span>`;
                }
            } catch (ePv) {}
            stats.innerHTML = `${t('coll_owned', { n: ownedN, total: this.catalogCount() })} · ${t('coll_total_label', { n: this.totalCount() })}${dupLine}${pubLine}${pathLine}${bonusLine}<br>${this.nextDropText()} · ${t('coll_daily_left', { n: this.DAILY_CAP - c.today, max: this.DAILY_CAP })}`;
        }
        const tabDups = document.getElementById('coll-tab-dups');
        if (tabDups) {
            const dk = this.duplicateKindsCount();
            tabDups.textContent = dk > 0 ? t('coll_tab_dups_n', { n: dk }) : t('coll_tab_dups');
            tabDups.classList.toggle('has-dups', dk > 0);
        }
        const filterBar = document.getElementById('coll-filter-bar');
        const filterLabel = document.getElementById('coll-filter-label');
        if (filterBar && filterLabel) {
            if (this._packFilter) {
                filterBar.style.display = 'flex';
                let pr = { owned: 0, total: 0 };
                try { pr = atlas.packProgress(this._packFilter); } catch (ePf) {}
                filterLabel.textContent = t('coll_filter_pack', { name: atlas.packTitle(this._packFilter), owned: pr.owned, total: pr.total });
            } else {
                filterBar.style.display = 'none';
                filterLabel.textContent = '';
            }
        }
        const atlasHost = document.getElementById('collection-atlas');
        const museumHost = document.getElementById('collection-museum');
        const grid = document.getElementById('collection-grid');
        if (showCharmTools) this.renderLoadouts();
        if (this._view === 'museum') {
            if (museumHost) { museumHost.style.display = 'block'; try { atlas.renderMuseumPanel(); } catch (e) {} }
            if (atlasHost) atlasHost.style.display = 'none';
            if (grid) grid.style.display = 'none';
            return;
        }
        if (museumHost) museumHost.style.display = 'none';
        if (this._view === 'atlas') {
            if (atlasHost) { atlasHost.style.display = 'block'; try { atlas.renderPanel(); } catch (e) {} }
            if (grid) grid.style.display = 'none';
            return;
        }
        if (atlasHost) atlasHost.style.display = 'none';
        if (grid) grid.style.display = '';
        if (!grid) return;
        if (this._view === 'dups') {
            const dupKeys = [];
            for (const k in c.items) {
                if (c.items[k] && c.items[k].count > 1) dupKeys.push(k);
            }
            dupKeys.sort((a, b) => (c.items[b].count - c.items[a].count) || a.localeCompare(b));
            const dupSig = dupKeys.map(k => k + ':' + c.items[k].count + ':' + (this.isEquipped(k) ? 1 : 0)).join('|');
            if (!force && dupSig === this._lastDupsSig && grid.querySelector('.charm-tile')) return;
            this._lastDupsSig = dupSig;
            this._lastGridSig = '';
            this._lastGridKeys = dupKeys.slice();
            if (!dupKeys.length) {
                grid.innerHTML = `<div style="grid-column:1/-1; color:#94a3b8; font-size:0.85rem; padding:14px">${t('coll_dups_empty')}</div>`;
                this._lastGridSig = '';
                this._lastDupsSig = '';
                return;
            }
            const self = this;
            function dupArt(skin, rarity) {
                const thumbSrc = skin ? self.srcThumbDisplay(skin) : null;
                const fb = skin ? (skin.img || '') : '';
                if (!thumbSrc) return `<div class="charm-img charm-ph r-${rarity}">?</div>`;
                return `<img class="charm-img r-${rarity}" src="${thumbSrc}" data-fallback="${fb}" alt="" loading="eager" decoding="async" onerror="collection.imgFail(this)">`;
            }
            function dupTileHtml(k) {
                const skin = self.skinById(k);
                const it = c.items[k];
                if (!it) return '';
                const kk = String(k).replace(/'/g, "\\'");
                const qtyN = Math.max(2, it.count || 2);
                const fam = self.familyName(it);
                const art = dupArt(skin, it.rarity);
                const insp = `<button class="charm-inspect" type="button" title="${t('coll_inspect')}" aria-label="${t('coll_inspect_aria')}" onclick="event.stopPropagation();collection.preview('${kk}')">🔍</button>`;
                const eqd = self.isEquipped(k);
                const canEquip = self.canEquipSkin(k);
                const tileCls = `charm-tile charm-tile-dup r-${it.rarity}${eqd && canEquip ? ' equipped' : ''}${!canEquip ? ' collectible' : ''}`;
                const actionLbl = canEquip ? (eqd ? t('coll_equipped') : t('coll_equip')) : t('coll_collectible');
                const actionClr = canEquip ? (eqd ? '#fbbf24' : '#94a3b8') : '#64748b';
                const tileClick = canEquip ? ` onclick="collection.equip('${kk}')"` : '';
                const qtySuffix = `<span class="charm-rar-qty"> · ×${qtyN}</span>`;
                const ascBtn = qtyN >= 3 ? `<button class="coll-ascend-btn" type="button" onclick="event.stopPropagation();collection.ascendCharm('${kk}')">${t('coll_ascend_btn')}</button>` : '';
                const forgeBtn = self.canForge(k) ? `<button class="coll-ascend-btn" type="button" onclick="event.stopPropagation();collection.forgeStarToken('${kk}')">${t('coll_forge_btn')}</button>` : '';
                let bonusHtml = '';
                if (self.canEquipSkin(k)) {
                    try { const bs = itemBonus.skinBonusShort(k, it); if (bs) bonusHtml = `<span class="charm-bonus">${bs}</span>`; } catch (eB) {}
                }
                return `<div class="${tileCls}" data-charm-id="${kk}"${tileClick}>${insp}${art}<span class="charm-name">${self.displayName(it)}</span><span class="charm-rar r-${it.rarity}">${fam ? fam + ' · ' : ''}${t('r_' + it.rarity)}${qtySuffix}</span>${bonusHtml}<span class="charm-equip-lbl" style="font-size:0.58rem;color:${actionClr}">${actionLbl}</span>${ascBtn}${forgeBtn}</div>`;
            }
            let dhtml = `<div class="coll-section"><h3 class="coll-section-hd">${t('coll_dups_section')}</h3><p class="coll-section-sub">${t('coll_dups_hint')}</p><button type="button" class="coll-salvage-all" onclick="collection.salvageAllExtras()">${t('salvage_all_btn')}</button><div class="coll-grid">`;
            for (let di = 0; di < dupKeys.length; di++) dhtml += dupTileHtml(dupKeys[di]);
            dhtml += '</div></div>';
            grid.innerHTML = dhtml;
            this._bindGridLazyThumbs(grid);
            return;
        }
        if (!cat.length) {
            const emptyMsg = this._packFilter ? t('coll_filter_pack_empty')
                : (this._browseFilter === 'missing') ? t('coll_filter_none_missing') : t('coll_empty');
            grid.innerHTML = `<div style="grid-column:1/-1; color:#94a3b8; font-size:0.85rem; padding:14px;text-align:center">${emptyMsg}</div>`;
            this._lastGridSig = '';
            return;
        }
        const keys = cat.map(s => s.id).filter(Boolean);
        const anomalyKeys = [];
        const normalKeys = [];
        for (let ki = 0; ki < keys.length; ki++) {
            const sk = this.skinById(keys[ki]);
            if (sk && sk.rarity === 'anomaly') anomalyKeys.push(keys[ki]);
            else normalKeys.push(keys[ki]);
        }
        this.sortKeysByTier(normalKeys);
        const ownedMap = {};
        for (let oi = 0; oi < keys.length; oi++) ownedMap[keys[oi]] = !!(c.items && c.items[keys[oi]]);
        anomalyKeys.sort((a, b) => {
            const oa = ownedMap[a] ? 1 : 0, ob = ownedMap[b] ? 1 : 0;
            if (oa !== ob) return ob - oa;
            const sa = this.skinById(a), sb = this.skinById(b);
            const ha = this.anomalyHelperOrder(sa), hb = this.anomalyHelperOrder(sb);
            if (ha !== hb) return ha - hb;
            return a < b ? -1 : a > b ? 1 : 0;
        });
        const sig = this._gridSig(c, keys);
        if (!force && sig === this._lastGridSig && grid.querySelector('.charm-tile')) return;
        this._lastGridSig = sig;
        this._lastGridKeys = keys.slice();
        this._lastDupsSig = '';
        if (keys.length > 80) { try { SkinAssetManager.bumpThumbLimit(Math.min(400, keys.length + 40)); } catch (e) {} }
        if (!this._loadedThumbs) this._loadedThumbs = new Set();
        const loaded = this._loadedThumbs;
        const self = this;
        function charmArt(skin, rarity, eager) {
            const thumbSrc = skin ? self.srcThumbDisplay(skin) : null;
            const fb = skin ? (skin.img || '') : '';
            const load = eager ? 'eager' : 'lazy';
            if (!thumbSrc) return `<div class="charm-img charm-ph r-${rarity}">?</div>`;
            if (eager || loaded.has(thumbSrc)) {
                return `<img class="charm-img r-${rarity}" src="${thumbSrc}" data-fallback="${fb}" alt="" loading="${load}" decoding="async" onload="collection._gridThumbOk(this)" onerror="collection.imgFail(this)">`;
            }
            return `<img class="charm-img r-${rarity}" data-src="${thumbSrc}" data-fallback="${fb}" alt="" loading="${load}" decoding="async" onerror="collection.imgFail(this)">`;
        }
        function tileHtml(k) {
            const skin = self.skinById(k);
            const rarity = skin ? skin.rarity : 'common';
            const it = c.items[k];
            const owned = !!it;
            const kk = String(k).replace(/'/g, "\\'");
            const isAnomaly = rarity === 'anomaly';
            if (!owned && !isAnomaly) {
                const fam = skin ? (skin.family === 'spoon' ? t('coll_fam_spoon') : skin.family === 'chefhat' ? t('coll_fam_chefhat') : skin.family === 'helper' ? t('coll_fam_helper') : '') : '';
                return `<div class="charm-tile locked r-${rarity}" onclick="collection.lockedTap()"><span class="charm-lock" aria-hidden="true">🔒</span><div class="charm-img charm-ph r-${rarity}">?</div><span class="charm-name">${t('coll_locked')}</span><span class="charm-rar r-${rarity}">${fam ? fam + ' · ' : ''}${t('r_' + rarity)}</span><span style="font-size:0.58rem;color:#64748b">${t('coll_locked')}</span></div>`;
            }
            if (!owned && isAnomaly) {
                const token = String(k).split('_')[0];
                const hMap = { ivan: 'comp_ivan', pio: 'comp_pio', coco: 'comp_coco', bunny: 'comp_bunny', bongo: 'comp_bongo' };
                const fam = hMap[token] ? t(hMap[token]) : t('coll_fam_helper');
                const dispName = skin ? (LANG === 'es' ? (skin.name_es || skin.name_en) : (skin.name_en || skin.name_es)) : t('coll_locked');
                const insp = `<button class="charm-inspect" type="button" title="${t('coll_inspect')}" aria-label="${t('coll_inspect_aria')}" onclick="event.stopPropagation();collection.preview('${kk}')">🔍</button>`;
                return `<div class="charm-tile locked-preview r-${rarity}" onclick="collection.lockedTap()"><span class="charm-lock" aria-hidden="true">🔒</span>${insp}${charmArt(skin, rarity, true)}<span class="charm-name">${dispName || t('coll_locked')}</span><span class="charm-rar r-${rarity}">${fam ? fam + ' · ' : ''}${t('r_' + rarity)}</span><span style="font-size:0.58rem;color:#64748b">${t('coll_locked')}</span></div>`;
            }
            const eqd = self.isEquipped(k);
            const qtyN = Math.max(1, it.count || 1);
            const isDup = qtyN > 1;
            const qtySuffix = isDup ? `<span class="charm-rar-qty"> · ×${qtyN}</span>` : '';
            const fam = self.familyName(it);
            const art = charmArt(skin, it.rarity, isAnomaly);
            const insp = `<button class="charm-inspect" type="button" title="${t('coll_inspect')}" aria-label="${t('coll_inspect_aria')}" onclick="event.stopPropagation();collection.preview('${kk}')">🔍</button>`;
            const canEquip = self.canEquipSkin(k);
            const tileCls = `charm-tile r-${it.rarity}${isDup ? ' charm-tile-dup' : ''}${eqd && canEquip ? ' equipped' : ''}${!canEquip ? ' collectible' : ''}`;
            const actionLbl = canEquip ? (eqd ? t('coll_equipped') : t('coll_equip')) : t('coll_collectible');
            const actionClr = canEquip ? (eqd ? '#fbbf24' : '#94a3b8') : '#64748b';
            const tileClick = canEquip ? ` onclick="collection.equip('${kk}')"` : '';
            const ascBtn = (isDup && qtyN >= 3) ? `<button class="coll-ascend-btn" type="button" onclick="event.stopPropagation();collection.ascendCharm('${kk}')">${t('coll_ascend_btn')}</button>` : '';
            const forgeBtn = self.canForge(k) ? `<button class="coll-ascend-btn" type="button" onclick="event.stopPropagation();collection.forgeStarToken('${kk}')">${t('coll_forge_btn')}</button>` : '';
            let bonusHtml = '';
            if (self.canEquipSkin(k)) {
                try { const bs = itemBonus.skinBonusShort(k, it); if (bs) bonusHtml = `<span class="charm-bonus">${bs}</span>`; } catch (eB2) {}
            }
            return `<div class="${tileCls}" data-charm-id="${kk}"${tileClick}>${insp}${art}<span class="charm-name">${self.displayName(it)}</span><span class="charm-rar r-${it.rarity}">${fam ? fam + ' · ' : ''}${t('r_' + it.rarity)}${qtySuffix}</span>${bonusHtml}<span class="charm-equip-lbl" style="font-size:0.58rem;color:${actionClr}">${actionLbl}</span>${ascBtn}${forgeBtn}</div>`;
        }
        let html = '';
        const usePackGroups = !this._packFilter;
        const packHd = function (packId) {
            const lbl = self.packGroupLabel(packId);
            const hint = self.packHeaderHint(packId);
            const syn = hint ? `<span class="coll-pack-synergy">${hint}</span>` : '';
            return `<h4 class="coll-pack-hd">${lbl}${syn}</h4>`;
        };
        if (anomalyKeys.length) {
            this.sortKeysWithinTier(anomalyKeys, ownedMap);
            html += `<div class="coll-section coll-section-anomaly"><h3 class="coll-section-hd">${t('coll_section_anomaly')}</h3><p class="coll-section-sub">${t('coll_section_anomaly_sub')}</p>`;
            if (usePackGroups) {
                const aGroups = this.groupKeysByPack(anomalyKeys);
                for (let ag = 0; ag < aGroups.length; ag++) {
                    html += packHd(aGroups[ag].pack) + `<div class="coll-grid coll-grid-anomaly">`;
                    for (let ai = 0; ai < aGroups[ag].keys.length; ai++) html += tileHtml(aGroups[ag].keys[ai]);
                    html += '</div>';
                }
            } else {
                html += `<div class="coll-grid coll-grid-anomaly">`;
                for (let ai = 0; ai < anomalyKeys.length; ai++) html += tileHtml(anomalyKeys[ai]);
                html += '</div>';
            }
            html += '</div>';
        }
        const tierOrder = this.RARITY_SECTION_ORDER;
        for (let ti = 0; ti < tierOrder.length; ti++) {
            const rar = tierOrder[ti];
            const tierKeys = [];
            for (let ni = 0; ni < normalKeys.length; ni++) {
                const sk = this.skinById(normalKeys[ni]);
                if (sk && sk.rarity === rar) tierKeys.push(normalKeys[ni]);
            }
            if (!tierKeys.length) continue;
            this.sortKeysWithinTier(tierKeys, ownedMap);
            html += `<div class="coll-section coll-section-tier"><h3 class="coll-section-hd r-${rar}">${t('r_' + rar)}</h3>`;
            if (usePackGroups) {
                const packGroups = this.groupKeysByPack(tierKeys);
                for (let gi = 0; gi < packGroups.length; gi++) {
                    html += packHd(packGroups[gi].pack) + `<div class="coll-grid">`;
                    for (let ji = 0; ji < packGroups[gi].keys.length; ji++) html += tileHtml(packGroups[gi].keys[ji]);
                    html += '</div>';
                }
            } else {
                html += `<div class="coll-grid">`;
                for (let ji = 0; ji < tierKeys.length; ji++) html += tileHtml(tierKeys[ji]);
                html += '</div>';
            }
            html += '</div>';
        }
        grid.innerHTML = html;
        this._bindGridLazyThumbs(grid);
    },
    lockedTap() { try { gx.toast(t('coll_locked_toast')); } catch (e) {} }
};
try { window.collection = collection; } catch (e) {}
try {
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        const ov = document.getElementById('charm-preview');
        if (ov && ov.classList.contains('open')) { e.stopPropagation(); collection.closePreview(); }
    });
} catch (e) {}
    global.collectionProvider = collectionProvider;
    global.SkinAssetManager = SkinAssetManager;
    global.collection = collection;
    try { balanceApplyCharmRarities(collection); } catch (e) {}
})(typeof window !== 'undefined' ? window : this);
