/* HUD goal chip — global objective. Runtime deps: game, farm, quests, atlas, collection, prix, soupMenu, soupBoss, t. */
(function (global) {
    'use strict';

    global.objective = {
        _current: null,
        _sig: '',
        _closestPack() {
            const packIds = [];
            const pid = atlas.path();
            if (pid) {
                const p = atlas.pathDef(pid);
                if (p) packIds.push.apply(packIds, atlas.regionPacks(p.region));
            }
            if (!packIds.length) {
                const m = atlas.raw();
                if (m && m.packs) packIds.push.apply(packIds, Object.keys(m.packs));
            }
            let best = null, bestScore = -1;
            for (let i = 0; i < packIds.length; i++) {
                const packId = packIds[i];
                const pr = atlas.packProgress(packId);
                if (pr.complete || pr.total <= 0) continue;
                const score = pr.owned / pr.total;
                if (score > bestScore && score < 1) { bestScore = score; best = { packId: packId, owned: pr.owned, total: pr.total }; }
            }
            if (!best && pid) {
                for (let j = 0; j < packIds.length; j++) {
                    const pr2 = atlas.packProgress(packIds[j]);
                    if (!pr2.complete && pr2.total > 0) return { packId: packIds[j], owned: pr2.owned, total: pr2.total };
                }
            }
            return best;
        },
        _openShop() {
            try { if (typeof mobileUI !== 'undefined' && mobileUI.isPhone && mobileUI.isPhone()) { mobileUI.toggleShop(); return; } } catch (e) {}
            try { const el = document.getElementById('side-shop'); if (el) el.classList.add('m-open'); } catch (e2) {}
        },
        compute() {
            try {
                farm.ensure();
                if (game.farm.plots.some(p => farm.plotState(p) === 'ready')) {
                    return { kind: 'farm', icon: '🌱', text: t('goal_farm_harvest'), action: () => farm.open() };
                }
                quests.ensureDaily();
                try { quests.ensureWeekly(); soupMenu.ensure(); } catch (e0) {}
                if (game.weekly && game.weekly.menu && Array.isArray(game.weekly.menu.dishes)) {
                    const menuClaim = game.weekly.menu.dishes.filter(d => d && d.done && !d.claimed).length;
                    if (menuClaim > 0) {
                        return { kind: 'menu', icon: '🍲', text: t('goal_menu_claim', { n: menuClaim }), action: () => quests.open() };
                    }
                }
                if (game.daily && game.daily.missions.some(m => m.done && !m.claimed)) {
                    return { kind: 'quest_claim', icon: '📜', text: t('goal_quest_claim'), action: () => quests.open() };
                }
                if (game.weekly && game.weekly.missions && game.weekly.missions.some(m => m.done && !m.claimed)) {
                    return { kind: 'quest_claim', icon: '📜', text: t('goal_week_claim'), action: () => quests.open() };
                }
                try {
                    soupBoss.ensure();
                    if (game.boss && game.boss.hp <= 0 && !game.boss.claimed) {
                        return { kind: 'boss', icon: '👹', text: t('goal_boss_claim'), action: () => quests.open() };
                    }
                    if (game.boss && game.boss.hp > 0 && game.boss.maxHp > 0) {
                        const pct = Math.floor((1 - game.boss.hp / game.boss.maxHp) * 100);
                        return { kind: 'boss', icon: '👹', text: t('goal_boss', { pct: pct }), action: () => quests.open() };
                    }
                } catch (eB) {}
                try {
                    const c = collection.normalize();
                    const claimed = c.museumClaimed || {};
                    const m = atlas.raw();
                    if (m && m.packs) {
                        for (const packId in m.packs) {
                            if (!Object.prototype.hasOwnProperty.call(m.packs, packId)) continue;
                            const pr = atlas.packProgress(packId);
                            if (pr.complete && !claimed[packId]) {
                                return { kind: 'museum', icon: '🏛️', text: t('goal_museum_claim'), action: () => { collection.open(); collection.setView('museum'); } };
                            }
                        }
                    }
                } catch (eM) {}
                const presGoal = balancePrestigeGoal(game.s);
                if (game.e >= presGoal) {
                    return { kind: 'prestige', icon: '👼', text: t('goal_prestige', { n: game.presShards() }), action: () => {
                        try { const ap = document.getElementById('altar-panel'); if (ap) { ap.classList.add('goal-pulse'); setTimeout(() => { try { ap.classList.remove('goal-pulse'); } catch (e) {} }, 1400); } } catch (e) {}
                    } };
                }
                if (!atlas.path()) {
                    return { kind: 'path', icon: '🗺️', text: t('goal_choose_path'), action: () => { collection.open(); collection.setView('atlas'); } };
                }
                const pack = this._closestPack();
                if (pack) {
                    return { kind: 'set', icon: '🎴', text: t('goal_complete_set', { name: atlas.packTitle(pack.packId), owned: pack.owned, total: pack.total }), action: () => { collection.open(); collection.openPack(pack.packId); } };
                }
                for (let i = 0; i < game.cp.length; i++) {
                    const c = game.cp[i];
                    if (c.lv === 0) {
                        const pd = game.cardPriceDisplay(c);
                        return { kind: 'buy', icon: '👥', text: t('goal_buy_helper', { name: t(c.nk), price: pd.text }), action: () => this._openShop() };
                    }
                }
                const m = game.daily && game.daily.missions ? game.daily.missions.find(x => !x.done && !x.claimed) : null;
                if (m) {
                    const prog = Math.floor(Math.min(m.prog, m.goal));
                    const goalStr = m.type === 'eb' ? m.goal.toLocaleString() : String(m.goal);
                    return { kind: 'daily', icon: '📜', text: t('goal_daily_quest', { label: quests.label(m), prog: prog, goal: goalStr }), action: () => quests.open() };
                }
                const wm = game.weekly && game.weekly.missions ? game.weekly.missions.find(x => !x.done && !x.claimed) : null;
                if (wm) {
                    const prog = Math.floor(Math.min(wm.prog, wm.goal));
                    const goalStr = (wm.type === 'eb' || wm.type === 'boss_damage') ? wm.goal.toLocaleString() : String(wm.goal);
                    return { kind: 'weekly', icon: '📜', text: t('goal_weekly_quest', { label: quests.weeklyLabel(wm), prog: prog, goal: goalStr }), action: () => quests.open() };
                }
                if (game.minigameUnlocked && game.minigameUnlocked() && game.cd <= 0) {
                    return { kind: 'prix', icon: '👑', text: t('goal_prix'), action: () => prix.open() };
                }
                if (game.minigameUnlocked && game.minigameUnlocked() && game.cd > 0 && game.scd <= 0) {
                    return { kind: 'skirmish', icon: '🥊', text: t('goal_skirmish'), action: () => skirmish.open() };
                }
            } catch (e) {}
            return { kind: 'stir', icon: '🥄', text: t('goal_stir'), action: null };
        },
        sync() {
            try {
                const chip = document.getElementById('goal-chip');
                const iconEl = document.getElementById('goal-chip-icon');
                const textEl = document.getElementById('goal-chip-text');
                const ls = document.getElementById('lore-scroll');
                if (!chip || !textEl) return;
                const g = this.compute();
                this._current = g;
                const sig = (g.kind || '') + '|' + (g.text || '');
                const hasAction = !!g.action;
                const isPriority = hasAction && (g.kind === 'farm' || g.kind === 'prix' || g.kind === 'skirmish' || g.kind === 'quest_claim' || g.kind === 'prestige' || g.kind === 'boss');
                if (ls) {
                    ls.classList.toggle('lore-has-action', hasAction);
                    ls.classList.toggle('lore-goal-priority', isPriority);
                    ls.classList.toggle('lore-kind-farm', g.kind === 'farm');
                    ls.classList.toggle('lore-kind-prix', g.kind === 'prix' || g.kind === 'skirmish');
                    ls.classList.toggle('lore-kind-prestige', g.kind === 'prestige');
                    ls.classList.toggle('lore-kind-quest', g.kind === 'quest_claim');
                }
                chip.classList.toggle('goal-chip-action', hasAction);
                if (sig !== this._sig) {
                    this._sig = sig;
                    if (iconEl) scCauldronIcon.setGoalIcon(iconEl, g.icon || '🎯');
                    textEl.textContent = g.text || '';
                }
                chip.style.display = 'flex';
            } catch (e) {}
        },
        onTap() {
            try {
                if (!this._current || !this._current.action) return;
                this._current.action();
            } catch (e) {}
        }
    };
})(typeof window !== 'undefined' ? window : this);
