/* Farm — globals farm, FARM_TYPE_IDS, FARM_GLYPHS, FARM_GROW_SEC, FARM_WATER_BOOST. */
(function (global) {
    'use strict';

const FARM_TYPE_IDS = ['ink','shrimp','carrot','lettuce','corn','yolk','honey','berries','banana','coconut'];
        const FARM_GLYPHS = { ink:'🦑', shrimp:'🦐', carrot:'🥕', lettuce:'🥬', corn:'🌽', yolk:'💛', honey:'🍯', berries:'🫐', banana:'🍌', coconut:'🥥' };
        const FARM_GROW_SEC = { ink:35, shrimp:35, carrot:40, lettuce:40, corn:50, yolk:50, honey:70, berries:70, banana:90, coconut:90 };
        const FARM_WATER_BOOST = 0.2;

    global.FARM_TYPE_IDS = FARM_TYPE_IDS;
    global.FARM_GLYPHS = FARM_GLYPHS;
    global.FARM_GROW_SEC = FARM_GROW_SEC;
    global.FARM_WATER_BOOST = FARM_WATER_BOOST;

    global.farm = {
            _bgSuppressed: false,
            _plotClickBound: false,
            _plotRenderSig: null,
            _bindPlotClicks() {
                const plotsEl = document.getElementById('farm-plots');
                if (!plotsEl || this._plotClickBound) return;
                this._plotClickBound = true;
                plotsEl.addEventListener('pointerdown', (e) => {
                    if (e.pointerType === 'mouse' && e.button !== 0) return;
                    const plotEl = e.target.closest('.farm-plot');
                    if (!plotEl || !plotsEl.contains(plotEl)) return;
                    const idx = parseInt(plotEl.dataset.idx, 10);
                    if (!Number.isFinite(idx)) return;
                    this.ensure();
                    const plot = game.farm.plots[idx];
                    if (!plot) return;
                    if (e.target.closest('.farm-water-btn')) {
                        e.preventDefault();
                        e.stopPropagation();
                        this.water(idx);
                        return;
                    }
                    const st = this.plotState(plot);
                    if (st === 'ready') { e.preventDefault(); this.harvest(idx); }
                    else if (st === 'empty') { e.preventDefault(); this.plant(idx); }
                });
            },
            _setBgSuppressed(on) {
                this._bgSuppressed = !!on;
                try { if (typeof ambient !== 'undefined' && ambient._inited) ambient.syncPlayback(); } catch (e) {}
                try { if (typeof music !== 'undefined' && music._inited) music.syncPlayback(); } catch (e) {}
            },
            starterAmount() { return game.FARM_STARTER_STOCK || 30; },
            totalStock() {
                this.ensure();
                let n = 0;
                for (let i = 0; i < FARM_TYPE_IDS.length; i++) n += game.farm.stock[FARM_TYPE_IDS[i]] || 0;
                return n;
            },
            brothPct() {
                return Math.min(8, Math.floor(this.totalStock() / 8));
            },
            brothMult() { return 1 + this.brothPct() / 100; },
            syncBrothLine() {
                const el = document.getElementById('farm-broth-line');
                if (!el) return;
                const pct = this.brothPct();
                if (pct > 0) {
                    el.textContent = t('farm_broth_boost', { pct: pct });
                    el.style.display = 'block';
                } else el.style.display = 'none';
            },
            freshSave() {
                const n = this.starterAmount();
                const stock = {};
                FARM_TYPE_IDS.forEach(id => { stock[id] = n; });
                return { stock, plots: FARM_TYPE_IDS.map(id => ({ type: id, readyAt: 0 })), autoReplant: true };
            },
            ensure() {
                if (!game.farm || typeof game.farm !== 'object') game.farm = this.freshSave();
                if (!game.farm.stock || typeof game.farm.stock !== 'object') game.farm.stock = {};
                FARM_TYPE_IDS.forEach(id => {
                    if (!Number.isFinite(game.farm.stock[id])) game.farm.stock[id] = this.starterAmount();
                    game.farm.stock[id] = Math.max(0, Math.floor(game.farm.stock[id]));
                });
                if (!Array.isArray(game.farm.plots) || game.farm.plots.length !== FARM_TYPE_IDS.length) {
                    game.farm.plots = FARM_TYPE_IDS.map((id, i) => {
                        const old = game.farm.plots && game.farm.plots[i];
                        return old && old.type === id ? old : { type: id, readyAt: 0 };
                    });
                }
                if (game.farm.autoReplant == null) game.farm.autoReplant = true;
                if (!('wagon' in game.farm)) game.farm.wagon = null;
                game.farm.plots.forEach(plot => {
                    if (plot._farmSt == null) plot._farmSt = this.plotState(plot);
                });
            },
            syncPlotStates() {
                this.ensure();
                game.farm.plots.forEach(plot => { plot._farmSt = this.plotState(plot); });
            },
            floatHarvestGain(type) {
                try {
                    const stockEl = document.getElementById('farm-stock');
                    if (!stockEl) return;
                    const idx = FARM_TYPE_IDS.indexOf(type);
                    if (idx < 0) return;
                    const chip = stockEl.children[idx];
                    if (!chip) return;
                    const r = chip.getBoundingClientRect();
                    const el = document.createElement('div');
                    el.className = 'farm-harvest-float';
                    el.textContent = '+1 ' + (FARM_GLYPHS[type] || '');
                    el.style.left = (r.left + r.width / 2) + 'px';
                    el.style.top = (r.top + 2) + 'px';
                    document.body.appendChild(el);
                    el.addEventListener('animationend', () => { try { el.remove(); } catch (e) {} }, { once: true });
                    chip.classList.remove('bump');
                    void chip.offsetWidth;
                    chip.classList.add('bump');
                } catch (e) {}
            },
            resetForPrestige() {
                game.farm = this.freshSave();
                try { gx.toast(t('farm_prestige_reset')); } catch (e) {}
                try { sound.playFarm('farmPrestigio', 'prestige'); } catch (e2) {}
                this.updateBadge();
                try { const fm = document.getElementById('farm-modal'); if (fm && fm.classList.contains('open')) this.render(); } catch (e3) {}
            },
            ingredientKey(helperId, level) {
                const cfg = game.pickSummonIngredient(helperId, level);
                return cfg && cfg.fx ? cfg.fx : null;
            },
            throwCost(helperId, level, feedMode) {
                return 1 + (feedMode ? (game.FEED_INGREDIENT_EXTRA || 4) : 0);
            },
            consumeThrow(helperId, level, feedMode) {
                this.ensure();
                const key = this.ingredientKey(helperId, level);
                if (!key) return true;
                const need = this.throwCost(helperId, level, feedMode);
                if ((game.farm.stock[key] || 0) < need) return false;
                game.farm.stock[key] -= need;
                try { game.save(); } catch (e) {}
                this.updateBadge();
                return true;
            },
            toastEmpty(helperId, level) {
                const key = this.ingredientKey(helperId, level);
                const glyph = FARM_GLYPHS[key] || '🌱';
                try { gx.toast(t('farm_empty_throw', { glyph })); } catch (e) {}
                try { sound.playFarm('farmSinStock', 'buy'); } catch (e2) {}
            },
            growMs(type) {
                let ms = (FARM_GROW_SEC[type] || 45) * 1000;
                try { if (game.farm && game.farm.wagon != null) ms = Math.floor(ms / 1.35); } catch (e) {}
                return ms;
            },
            wagonCpsMult() {
                try { if (game.farm && game.farm.wagon != null) return 0.92; } catch (e) {}
                return 1;
            },
            setWagon(helperId) {
                this.ensure();
                if (helperId == null) game.farm.wagon = null;
                else game.farm.wagon = Math.max(0, Math.min(4, Math.floor(Number(helperId) || 0)));
                try { game.save(); } catch (e) {}
                try { game.rebuild(); } catch (e2) {}
                this.renderWagonBar();
            },
            _mobileFarmLandscape() {
                try {
                    return window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 600px)').matches;
                } catch (e) { return false; }
            },
            _bindFarmLayoutRefresh() {
                if (this._farmLayoutBound) return;
                this._farmLayoutBound = true;
                const reflow = () => {
                    try {
                        const fm = document.getElementById('farm-modal');
                        if (fm && fm.classList.contains('open')) this.renderWagonBar();
                    } catch (e) {}
                };
                try { window.addEventListener('orientationchange', reflow, { passive: true }); } catch (e) {}
                try { window.addEventListener('resize', reflow, { passive: true }); } catch (e2) {}
            },
            _wagonGridLayout() {
                try {
                    if (window.matchMedia('(pointer: fine)').matches) return true;
                } catch (e) {}
                return this._mobileFarmLandscape();
            },
            renderWagonBar() {
                const bar = document.getElementById('farm-wagon-bar');
                if (!bar) return;
                this.ensure();
                if (this._wagonGridLayout()) {
                    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
                    const chips = [];
                    for (let i = 0; i < game.cp.length; i++) {
                        const c = game.cp[i];
                        if (!c || c.lv <= 0) continue;
                        const on = game.farm.wagon === i;
                        let name = t(c.nk);
                        let skin = '';
                        let rare = '';
                        let full = name;
                        try {
                            const info = collection.helperEquipLabel(i, 'farm');
                            name = info.helperName || name;
                            skin = info.skinName || '';
                            rare = skin && info.rarity ? t('r_' + info.rarity) : '';
                            full = collection.helperEquipSubtitle(i, 'farm');
                        } catch (e) {}
                        chips.push(
                            `<button class="gx-btn sm farm-wagon-chip${on ? ' on' : ''}" type="button" title="${esc(full)}" onclick="farm.setWagon(${on ? 'null' : i})">`
                            + `<span class="fwc-name">${on ? '✓ ' : ''}${esc(name)}</span>`
                            + (skin ? `<span class="fwc-skin">${esc(skin)}</span>` : '')
                            + (rare ? `<span class="fwc-rare">${esc(rare)}</span>` : '')
                            + `</button>`
                        );
                    }
                    bar.innerHTML = chips.length ? `<div class="farm-wagon-grid">${chips.join('')}</div>` : '';
                    return;
                }
                let html = '';
                if (game.farm.wagon != null && game.cp[game.farm.wagon]) {
                    html += `<span style="font-size:0.68rem;color:#bbf7d0;width:100%;text-align:center">${t('farm_wagon_active', { name: collection.helperEquipSubtitle(game.farm.wagon, 'farm') })}</span>`;
                }
                for (let i = 0; i < game.cp.length; i++) {
                    if (game.cp[i].lv <= 0) continue;
                    const on = game.farm.wagon === i;
                    const lbl = collection.helperEquipSubtitle(i, 'farm');
                    html += `<button class="gx-btn sm" type="button" title="${lbl}" onclick="farm.setWagon(${on ? 'null' : i})">${on ? '✓ ' : ''}${lbl}</button>`;
                }
                bar.innerHTML = html;
            },
            plotState(plot) {
                if (!plot || !plot.readyAt || plot.readyAt <= 0) return 'empty';
                return Date.now() >= plot.readyAt ? 'ready' : 'growing';
            },
            plotUiSig(plot) {
                const st = this.plotState(plot);
                return st + (plot.watered ? 'w' : '');
            },
            plant(idx) {
                this.ensure();
                const plot = game.farm.plots[idx];
                if (!plot || this.plotState(plot) !== 'empty') return;
                plot.readyAt = Date.now() + this.growMs(plot.type);
                plot.watered = false;
                plot._farmSt = 'growing';
                try { sound.playFarm('farmPlantar', 'bubble'); } catch (e) {}
                game.save(); this.render();
            },
            water(idx) {
                this.ensure();
                const plot = game.farm.plots[idx];
                if (!plot || this.plotState(plot) !== 'growing' || plot.watered) return;
                const remain = plot.readyAt - Date.now();
                if (remain <= 0) return;
                plot.readyAt = Date.now() + Math.max(1000, Math.floor(remain * (1 - FARM_WATER_BOOST)));
                plot.watered = true;
                try { sound.playFarm('farmRegar', 'bubble'); } catch (e) {}
                game.save();
                this.render();
                try {
                    const plotsEl = document.getElementById('farm-plots');
                    const el = plotsEl && plotsEl.querySelector(`.farm-plot[data-idx="${idx}"]`);
                    if (el) { el.classList.add('wet-flash'); setTimeout(() => { try { el.classList.remove('wet-flash'); } catch (e2) {} }, 560); }
                } catch (e3) {}
            },
            harvest(idx) {
                this.ensure();
                const plot = game.farm.plots[idx];
                if (!plot || this.plotState(plot) !== 'ready') return;
                const type = plot.type;
                let amt = 1;
                try { if (game.hatFarmBonusRoll()) amt++; } catch (e) {}
                game.farm.stock[type] = (game.farm.stock[type] || 0) + amt;
                const replant = !!game.farm.autoReplant;
                if (replant) { plot.readyAt = Date.now() + this.growMs(type); plot.watered = false; }
                else plot.readyAt = 0;
                plot._farmSt = replant ? 'growing' : 'empty';
                try { sound.playFarm('farmCosechar', 'bubble'); } catch (e) {}
                if (replant) { try { setTimeout(() => { try { sound.playFarm('farmPlantar', 'bubble'); } catch (e2) {} }, 180); } catch (e3) {} }
                game.save(); this.render(); this.updateBadge();
                this.floatHarvestGain(type);
            },
            allPlantedReady() {
                let hasPlanted = false;
                for (const plot of game.farm.plots) {
                    const st = this.plotState(plot);
                    if (st === 'empty') continue;
                    hasPlanted = true;
                    if (st !== 'ready') return false;
                }
                return hasPlanted;
            },
            tickWagonBond() {
                this.ensure();
                const hid = game.farm.wagon;
                if (hid == null || !game.cp[hid] || game.cp[hid].lv <= 0) {
                    game.farm._wagonBondAcc = 0;
                    return;
                }
                game.farm._wagonBondAcc = (game.farm._wagonBondAcc || 0) + 1;
                if (game.farm._wagonBondAcc >= 45) {
                    game.farm._wagonBondAcc = 0;
                    try { helperBond.add(hid, 1, true); } catch (e) {}
                }
            },
            tickReady() {
                this.ensure();
                let changed = false;
                let anyJustReady = false;
                game.farm.plots.forEach(plot => {
                    const st = this.plotState(plot);
                    if (plot._farmSt === 'growing' && st === 'ready') {
                        anyJustReady = true;
                        changed = true;
                    }
                    if (plot._farmSt !== st) plot._farmSt = st;
                });
                if (anyJustReady && this.allPlantedReady()) {
                    try { sound.playFarm('farmListo', 'bubble'); } catch (e) {}
                }
                if (changed) {
                    this.updateBadge();
                    try { if (typeof objective !== 'undefined') objective.sync(); } catch (e) {}
                    try { const fm = document.getElementById('farm-modal'); if (fm && fm.classList.contains('open')) this.render(); } catch (e) {}
                }
            },
            setAutoReplant(v) { this.ensure(); game.farm.autoReplant = !!v; game.save(); },
            formatTime(sec) {
                sec = Math.max(0, Math.ceil(sec));
                const m = Math.floor(sec / 60), s = sec % 60;
                return m > 0 ? (m + ':' + String(s).padStart(2, '0')) : (sec + 's');
            },
            updateBadge() {
                const b = document.getElementById('farm-badge'); if (!b) return;
                this.ensure();
                const low = FARM_TYPE_IDS.some(id => (game.farm.stock[id] || 0) <= 3);
                const ready = game.farm.plots.some(p => this.plotState(p) === 'ready');
                b.style.display = (low || ready) ? 'inline-block' : 'none';
            },
            open() {
                this._bindFarmLayoutRefresh();
                this.render();
                const md = document.getElementById('farm-modal');
                if (md) md.classList.add('open');
                try { tutorial.notify('farm_open'); } catch (e) {}
                try { this._setBgSuppressed(true); sound.playFarm('farmAbrir', 'bubble'); sound.farmAmbStart(); } catch (e2) {}
            },
            close() {
                const md = document.getElementById('farm-modal');
                if (md) md.classList.remove('open');
                try { sound.farmAmbStop(); this._setBgSuppressed(false); } catch (e) {}
            },
            render() {
                this.ensure();
                try { if (typeof collection !== 'undefined' && collection.normalize) collection.normalize(); } catch (e) {}
                this.syncBrothLine();
                this.renderWagonBar();
                try { collection.renderCauldronUpgrade(); } catch (e) {}
                const stockEl = document.getElementById('farm-stock');
                const plotsEl = document.getElementById('farm-plots');
                const autoEl = document.getElementById('farm-auto-replant');
                if (autoEl) autoEl.checked = !!game.farm.autoReplant;
                if (stockEl) {
                    stockEl.innerHTML = FARM_TYPE_IDS.map(id => {
                        const n = game.farm.stock[id] || 0;
                        return `<div class="farm-stock-chip${n <= 3 ? ' low' : ''}">${FARM_GLYPHS[id] || '?'}<br>${n}</div>`;
                    }).join('');
                }
                if (plotsEl) {
                    this._bindPlotClicks();
                    const now = Date.now();
                    const sig = game.farm.plots.map(p => this.plotUiSig(p));
                    const full = !this._plotRenderSig || sig.length !== this._plotRenderSig.length || sig.some((s, i) => s !== this._plotRenderSig[i]);
                    if (full) {
                        this._plotRenderSig = sig.slice();
                        plotsEl.innerHTML = game.farm.plots.map((plot, i) => {
                            const st = this.plotState(plot);
                            const glyph = FARM_GLYPHS[plot.type] || '🌱';
                            let body;
                            if (st === 'empty') body = `<span class="farm-plot-btn">${t('farm_plant')}</span>`;
                            else if (st === 'growing') {
                                const waterBtn = plot.watered
                                    ? `<span class="farm-watered-mark" title="${t('farm_watered')}">💧✓</span>`
                                    : `<button type="button" class="farm-water-btn" title="${t('farm_water')}">💧</button>`;
                                body = `<div class="farm-timer">${this.formatTime((plot.readyAt - now) / 1000)}</div>${waterBtn}`;
                            }
                            else body = `<span class="farm-plot-label">${t('farm_harvest')}</span>`;
                            return `<div class="farm-plot ${st}" data-idx="${i}"><div class="farm-glyph">${glyph}</div>${body}</div>`;
                        }).join('');
                    } else {
                        game.farm.plots.forEach((plot, i) => {
                            if (sig[i] !== 'growing' && sig[i] !== 'growingw') return;
                            const el = plotsEl.querySelector(`.farm-plot[data-idx="${i}"] .farm-timer`);
                            if (el) el.textContent = this.formatTime((plot.readyAt - now) / 1000);
                        });
                    }
                }
            },
            devFillStock() {
                if (!creator.isDev()) return;
                this.ensure();
                FARM_TYPE_IDS.forEach(id => { game.farm.stock[id] = 999; });
                game.save(); this.render(); this.updateBadge();
                try { gx.toast(t('farm_dev_fill')); } catch (e) {}
            }
        };
})(typeof window !== 'undefined' ? window : this);
