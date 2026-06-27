/* Weekly cauldron menu (3 dishes) — global soupMenu. */
(function (global) {
    'use strict';

    global.soupMenu = {
        PACK_BONUS: 0.12,
        DISH_SUFFIX: {
            pirate_plunder: { en: 'Pirate Chowder', es: 'Caldo Pirata' },
            winter_wonderland: { en: 'Winter Bisque', es: 'Bisque Invernal' },
            desert_dunes: { en: 'Desert Stew', es: 'Guiso del Desierto' },
            ninja_noodle: { en: 'Ninja Broth', es: 'Caldo Ninja' },
            vampire_vogue: { en: 'Midnight Soup', es: 'Sopa de Medianoche' },
            fairy_glade: { en: 'Fairy Fizz', es: 'Burbuja Hada' },
            wave3_aliens: { en: 'Orbital Broth', es: 'Caldo Orbital' },
            crazy_disguises: { en: 'Disguise Stew', es: 'Guiso Disfraz' }
        },
        eligiblePacks() {
            const m = atlas.raw();
            if (!m || !m.packs) return [];
            const owned = [], all = [];
            for (const pid in m.packs) {
                if (!Object.prototype.hasOwnProperty.call(m.packs, pid)) continue;
                all.push(pid);
                const pr = atlas.packProgress(pid);
                if (pr.owned > 0) owned.push(pid);
            }
            return owned.length >= 3 ? owned : all;
        },
        pickPacks(n) {
            const pool = this.eligiblePacks().slice();
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
            }
            return pool.slice(0, n);
        },
        dishLabel(packId) {
            const suf = this.DISH_SUFFIX[packId];
            if (suf) return (LANG === 'es') ? (suf.es || suf.en) : (suf.en || suf.es);
            return atlas.packDisplayTitle(packId);
        },
        gen() {
            const packs = this.pickPacks(3);
            let cps = 100;
            try { cps = Math.max(100, game.getCps()); } catch (e) {}
            const wk = quests.weekKey();
            return {
                week: wk,
                dishes: packs.map((packId, i) => ({
                    packId,
                    prog: 0,
                    goal: Math.max(30000, Math.floor(cps * (4000 + i * 1500))),
                    done: false,
                    claimed: false
                }))
            };
        },
        ensure() {
            const wk = quests.weekKey();
            if (!wk) return;
            if (!game.weekly || game.weekly.week !== wk) return;
            if (!game.weekly.menu || game.weekly.menu.week !== wk) {
                game.weekly.menu = this.gen();
                try { game.save(); } catch (e) {}
            }
        },
        activeBonus() {
            if (!game.weekly || !game.weekly.menu || !Array.isArray(game.weekly.menu.dishes)) return { mult: 1, pack: null, pct: 0, dish: '' };
            const dishes = game.weekly.menu.dishes.filter(d => d && !d.done);
            if (!dishes.length) return { mult: 1, pack: null, pct: 0, dish: '' };
            const featured = dishes[0];
            let info = { pack: null, n: 0 };
            try { info = collection.packSynergyInfo(); } catch (e) {}
            const dish = this.dishLabel(featured.packId);
            if (info.pack === featured.packId && info.n >= 2) {
                return { mult: 1 + this.PACK_BONUS, pack: featured.packId, pct: Math.round(this.PACK_BONUS * 100), dish: dish };
            }
            return { mult: 1, pack: featured.packId, pct: 0, dish: dish };
        },
        cpsMult() { return this.activeBonus().mult; },
        clickMult() { return this.activeBonus().mult; },
        bumpEb(amt) {
            if (!game.weekly || !game.weekly.menu || !Array.isArray(game.weekly.menu.dishes)) return;
            let n = Number(amt);
            if (!Number.isFinite(n) || n <= 0) return;
            try { n *= farm.brothMult(); } catch (e) {}
            let changed = false;
            game.weekly.menu.dishes.forEach(d => {
                if (!d || d.done) return;
                d.prog = (d.prog || 0) + n;
                if (d.prog >= d.goal) { d.prog = d.goal; d.done = true; changed = true; try { gx.toast(t('menu_dish_done')); } catch (e) {} }
            });
            if (changed) try { quests.updateBadge(); } catch (e2) {}
        },
        claim(i) {
            const d = game.weekly && game.weekly.menu && game.weekly.menu.dishes && game.weekly.menu.dishes[i];
            if (!d || !d.done || d.claimed) return;
            d.claimed = true;
            let cps = 100;
            try { cps = Math.max(100, game.getCps()); } catch (e) {}
            const reward = Math.max(8000, Math.floor(cps * 120));
            game.e += reward;
            game.te += reward;
            try { game.floatNum(window.innerWidth / 2, 200, reward); } catch (e2) {}
            try { sound.play('buy'); } catch (e3) {}
            try { game.save(); } catch (e4) {}
            try { quests.render(); quests.updateBadge(); } catch (e5) {}
            try { objective.sync(); } catch (e6) {}
        },
        syncUi() {
            const el = document.getElementById('menu-chip');
            if (!el) return;
            const b = this.activeBonus();
            if (b.pct > 0 && b.dish) {
                const txt = t('menu_chip', { dish: b.dish, pct: b.pct });
                const html = (typeof scCauldronIcon !== 'undefined' ? scCauldronIcon.prefixText(txt) : txt);
                if (el.innerHTML !== html) el.innerHTML = html;
                if (el.style.display !== 'block') el.style.display = 'block';
            } else if (el.style.display !== 'none') el.style.display = 'none';
        },
        questHtml() {
            if (!game.weekly || !game.weekly.menu || !Array.isArray(game.weekly.menu.dishes) || !game.weekly.menu.dishes.length) return '';
            let html = `<div style="font-size:0.7rem; color:var(--go); margin:14px 0 6px; letter-spacing:0.06em; text-transform:uppercase">${t('menu_weekly_title')}</div>`;
            html += `<div style="font-size:0.62rem; color:#94a3b8; margin-bottom:8px">${t('menu_bonus_hint', { pct: Math.round(this.PACK_BONUS * 100) })}</div>`;
            html += game.weekly.menu.dishes.map((d, i) => {
                if (!d) return '';
                const packName = atlas.packDisplayTitle(d.packId);
                const dish = this.dishLabel(d.packId);
                const pct = Math.min(100, Math.floor((d.prog || 0) / d.goal * 100));
                const reward = Math.max(8000, Math.floor((game.getCps ? game.getCps() : 100) * 120));
                let btn;
                if (d.claimed) btn = `<span style="color:#4ade80; font-size:0.75rem; font-weight:bold">${t('claimed')}</span>`;
                else if (d.done) btn = `<button class="gx-btn sm" onclick="soupMenu.claim(${i})">${t('menu_dish_claim', { eb: reward.toLocaleString() })}</button>`;
                else btn = `<span style="font-size:0.72rem; color:#cbd5e1">${t('reward_label', { r: '+' + reward.toLocaleString() + ' EB' })}</span>`;
                return `<div class="quest-row ${d.done ? 'done2' : ''}"><div style="font-weight:bold; font-size:0.85rem">${t('menu_dish_row', { dish: dish, pack: packName })}</div><div class="q-bar"><div class="q-fill" style="width:${pct}%"></div></div><div style="display:flex; justify-content:space-between; align-items:center"><span style="font-size:0.7rem; color:#94a3b8">${Math.floor(Math.min(d.prog || 0, d.goal)).toLocaleString()} / ${d.goal.toLocaleString()} EB</span>${btn}</div></div>`;
            }).join('');
            return html;
        }
    };
})(typeof window !== 'undefined' ? window : this);
