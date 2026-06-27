/* Soup path evolution tiers (visual + click/cps bonus). */
(function (global) {
    'use strict';

const soupEvolution = {
    CLICK_BONUS_PER_TIER: 0.02,
    CPS_BONUS_PER_TIER: 0.015,
    RECIPES: {
        cauldron: [
            { en: 'Golden Broth', es: 'Caldo Dorado' },
            { en: "Helper's Stew", es: 'Guiso de Ayudantes' },
            { en: 'Sacred Simmer', es: 'Remolino Sagrado' },
            { en: 'Esqueletia Essence', es: 'Esencia Esqueletia' },
            { en: "Master's Cauldron", es: 'Caldero del Maestro' }
        ],
        cosmic: [
            { en: 'Nebula Noodle', es: 'Fideo Nebulosa' },
            { en: 'Orbital Broth', es: 'Caldo Orbital' },
            { en: 'Galaxy Garnish', es: 'Guarnición Galáctica' },
            { en: 'Zero-G Bisque', es: 'Bisque sin Gravedad' },
            { en: 'Cosmic Chef Soup', es: 'Sopa del Chef Cósmico' }
        ],
        chaos: [
            { en: 'Meme Stock', es: 'Existencias Meme' },
            { en: 'Disguise Broth', es: 'Caldo Disfraz' },
            { en: 'Chaos Cute Stew', es: 'Guiso Cute Caos' },
            { en: 'Cursed Kawaii', es: 'Kawaii Maldito' },
            { en: 'Sovereign Soup', es: 'Sopa Soberana' }
        ],
        realms: [
            { en: "Wanderer's Broth", es: 'Caldo del Caminante' },
            { en: 'First Realm Stock', es: 'Existencias del Primer Reino' },
            { en: 'Border Crossing Stew', es: 'Guiso Cruzador' },
            { en: 'Expedition Bisque', es: 'Bisque de Expedición' },
            { en: 'Realm Walker Soup', es: 'Sopa del Caminante de Reinos' }
        ]
    },
    tierFromSets(sets) {
        const n = Math.max(0, Math.floor(Number(sets) || 0));
        return Math.min(4, n);
    },
    currentTier() {
        const pid = atlas.path();
        if (!pid) return -1;
        return this.tierFromSets(atlas.pathCompleteSets(pid));
    },
    recipeName(pathId, tier) {
        const list = this.RECIPES[pathId];
        if (!list || !list.length) return '';
        const idx = Math.min(Math.max(Math.floor(tier), 0), list.length - 1);
        const rec = list[idx];
        return (LANG === 'es') ? (rec.es || rec.en) : (rec.en || rec.es);
    },
    clickMult() {
        const tier = this.currentTier();
        if (tier < 0) return 1;
        const p = (typeof balanceGet === 'function' ? balanceGet('soupEvolutionClickPctPerTier', 0.022) : 0.022);
        return 1 + tier * p;
    },
    cpsMult() {
        const tier = this.currentTier();
        if (tier < 0) return 1;
        const p = (typeof balanceGet === 'function' ? balanceGet('soupEvolutionCpsPctPerTier', 0.018) : 0.018);
        return 1 + tier * p;
    },
    bonusPctDisplay() {
        const tier = this.currentTier();
        if (tier < 0) return { click: 0, cps: 0 };
        return {
            click: Math.round(tier * this.CLICK_BONUS_PER_TIER * 100),
            cps: Math.round(tier * this.CPS_BONUS_PER_TIER * 100)
        };
    },
    ensureAnnounced() {
        const c = collection.normalize();
        if (!c.soupEvAnnounced || typeof c.soupEvAnnounced !== 'object') c.soupEvAnnounced = {};
        return c.soupEvAnnounced;
    },
    applyVisual() {
        const pid = atlas.path();
        const center = document.getElementById('sticky-center');
        if (!center) return;
        center.classList.remove('soup-ev', 'soup-ev-cauldron', 'soup-ev-cosmic', 'soup-ev-chaos', 'soup-ev-realms');
        for (let i = 0; i <= 4; i++) center.classList.remove('soup-ev-tier-' + i);
        if (!pid) return;
        const tier = this.currentTier();
        center.classList.add('soup-ev', 'soup-ev-' + pid, 'soup-ev-tier-' + tier);
    },
    updateRecipe() {
        const el = document.getElementById('soup-recipe-inline');
        if (!el) return;
        const pid = atlas.path();
        if (!pid) { el.style.display = 'none'; el.textContent = ''; return; }
        const tier = this.currentTier();
        const name = this.recipeName(pid, tier);
        if (!name) { el.style.display = 'none'; el.textContent = ''; return; }
        el.style.display = '';
        const bonus = this.bonusPctDisplay();
        if (bonus.click > 0 || bonus.cps > 0) {
            el.textContent = t('soup_recipe_bonus', { name: name, tier: tier + 1, click: bonus.click, cps: bonus.cps });
        } else {
            el.textContent = t('soup_recipe_label', { name: name, tier: tier + 1 });
        }
    },
    sync() {
        this.applyVisual();
        this.updateRecipe();
    },
    markUpTo(pathId, tier, silent) {
        const ann = this.ensureAnnounced();
        let toasted = false;
        for (let t = 0; t <= tier; t++) {
            const key = pathId + ':t' + t;
            if (ann[key]) continue;
            ann[key] = 1;
            if (!silent && t > 0 && !toasted) {
                toasted = true;
                try { gx.toast(t('soup_evolved_toast', { name: this.recipeName(pathId, t), tier: t + 1 })); } catch (e) {}
            }
        }
        if (toasted) try { game.save(); } catch (e2) {}
    },
    onPathSet() {
        const pid = atlas.path();
        if (!pid) { this.sync(); return; }
        this.markUpTo(pid, this.currentTier(), true);
        try { game.save(); } catch (e) {}
        this.sync();
    },
    onProgress() {
        const pid = atlas.path();
        if (!pid) { this.sync(); return; }
        const tier = this.currentTier();
        const ann = this.ensureAnnounced();
        const key = pid + ':t' + tier;
        if (!ann[key]) this.markUpTo(pid, tier, false);
        this.sync();
    },
    catchUpSilent() {
        const pid = atlas.path();
        if (!pid) return;
        const ann = this.ensureAnnounced();
        const tier = this.currentTier();
        let dirty = false;
        for (let t = 0; t <= tier; t++) {
            const key = pid + ':t' + t;
            if (!ann[key]) { ann[key] = 1; dirty = true; }
        }
        if (dirty) try { game.save(); } catch (e) {}
    }
};
    global.soupEvolution = soupEvolution;
})(typeof window !== 'undefined' ? window : this);
