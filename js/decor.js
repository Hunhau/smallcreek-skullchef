/* Seasonal decor — global decor. */
(function (global) {
    'use strict';

const DECOR_CHEF_SLOTS = ['chefHat', 'chefFace'];
        const DECOR_PLACE_IDS = ['summer_straw_hat', 'summer_shades'];
        const DECOR_ITEMS = [
            { id: 'summer_beach', kind: 'background', pack: 'summer', preview: '🏖️', nameKey: 'decor_summer_beach', bgPath: DECOR_BG_SUMMER },
            { id: 'summer_straw_hat', kind: 'chefHat', pack: 'summer', glyph: '👒', img: 'assets/img/decor/chef_straw_hat.png', nameKey: 'decor_summer_straw_hat' },
            { id: 'summer_shades', kind: 'chefFace', pack: 'summer', glyph: '🕶️', img: 'assets/img/decor/chef_sunglasses.png', nameKey: 'decor_summer_shades' }
        ];
        const decor = {
            _bgSummerOk: null,
            _transformsMigrated: false,
            itemById(id) { return DECOR_ITEMS.find(x => x.id === id) || null; },
            isSummerLive() {
                try { return typeof softEvents !== 'undefined' && softEvents.hasDecorPack('summer'); } catch (e) { return false; }
            },
            ensure() {
                if (!game.decor || typeof game.decor !== 'object') game.decor = { slots: {}, owned: [] };
                if (!game.decor.slots || typeof game.decor.slots !== 'object') game.decor.slots = {};
                if (!Array.isArray(game.decor.owned)) game.decor.owned = [];
                DECOR_CHEF_SLOTS.forEach(k => { if (game.decor.slots[k] == null) game.decor.slots[k] = null; });
                if (game.decor.slots.background == null && game.decor.equippedBg === 'summer_beach') {
                    game.decor.slots.background = 'summer_beach';
                    delete game.decor.equippedBg;
                }
                if (this.isSummerLive() || creator.isDev()) {
                    DECOR_ITEMS.forEach(it => {
                        if (it.pack === 'summer' && game.decor.owned.indexOf(it.id) < 0) game.decor.owned.push(it.id);
                    });
                }
                this._migrateChefTransforms();
            },
            _migrateChefTransforms() {
                if (this._transformsMigrated) return;
                this._transformsMigrated = true;
                const ct = game.decor && game.decor.chefTransforms;
                if (!ct || typeof ct !== 'object') return;
                DECOR_PLACE_IDS.forEach(id => {
                    const tr = ct[id];
                    if (!tr || typeof tr !== 'object') return;
                    collection.setPlacement(id, {
                        x: Number.isFinite(tr.x) ? tr.x : 0,
                        y: Number.isFinite(tr.y) ? tr.y : 0,
                        scale: Number.isFinite(tr.scale) ? tr.scale : 1,
                        rot: Number.isFinite(tr.rot) ? tr.rot : 0
                    });
                });
                delete game.decor.chefTransforms;
                try { game.save(); } catch (e) {}
            },
            equippedChefIds() {
                this.ensure();
                return DECOR_CHEF_SLOTS.map(k => game.decor.slots[k]).filter(Boolean);
            },
            hasEquippedChefDecor() { return this.equippedChefIds().length > 0; },
            _applyDecorOverlay(elId, decId) {
                let el = document.getElementById(elId);
                if (!decId) {
                    if (el) el.style.display = 'none';
                    return;
                }
                const it = this.itemById(decId);
                if (!it || !it.img) {
                    if (el) el.style.display = 'none';
                    return;
                }
                const center = document.getElementById('sticky-center');
                if (!center) return;
                if (!el) {
                    el = document.createElement('img');
                    el.id = elId;
                    el.decoding = 'async';
                    el.alt = '';
                    el.onerror = function () { this.style.display = 'none'; };
                    center.appendChild(el);
                }
                el.style.display = '';
                el.src = it.img;
                try { el.style.transform = collection.placementCss(collection.placementFor(decId)); } catch (e) {}
            },
            isUnlocked(id) {
                this.ensure();
                if (creator.isDev()) return true;
                const it = this.itemById(id);
                if (!it) return false;
                if (it.pack === 'summer' && this.isSummerLive()) return true;
                return game.decor.owned.indexOf(id) >= 0;
            },
            probeSummerBg() {
                if (this._bgSummerOk != null) return Promise.resolve(this._bgSummerOk);
                return new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => { this._bgSummerOk = true; resolve(true); };
                    img.onerror = () => { this._bgSummerOk = false; resolve(false); };
                    img.src = DECOR_BG_SUMMER;
                });
            },
            open() {
                try { if (typeof mobileUI !== 'undefined') mobileUI.closeAll(); } catch (e) {}
                const md = document.getElementById('decor-modal');
                if (md) md.classList.add('open');
                try { this.render(); } catch (err) { console.error('decor.render', err); }
            },
            close() {
                const md = document.getElementById('decor-modal');
                if (md) md.classList.remove('open');
            },
            setBackground(id) {
                this.ensure();
                if (id && !this.isUnlocked(id)) { try { gx.toast(t('decor_locked')); } catch (e) {} return; }
                game.decor.slots.background = id || null;
                game.save(); this.applyVisual(); this.render();
            },
            toggleChefSlot(slotKey, itemId) {
                if (!DECOR_CHEF_SLOTS.includes(slotKey)) return;
                if (!this.isUnlocked(itemId)) { try { gx.toast(t('decor_locked')); } catch (e) {} return; }
                this.ensure();
                const cur = game.decor.slots[slotKey];
                game.decor.slots[slotKey] = (cur === itemId) ? null : itemId;
                game.save(); this.applyVisual(); this.render();
            },
            applyBackground() {
                this.ensure();
                const bgId = game.decor.slots.background;
                const useSummer = bgId === 'summer_beach';
                document.body.classList.remove('decor-bg-summer-fallback');
                const bgUrl = visualTheme.resolveBackground(bgId);
                if (!useSummer) {
                    document.body.style.setProperty('background', `url('${bgUrl}') center/cover no-repeat`, 'important');
                    try { if (typeof mobileUI !== 'undefined') mobileUI.fitScene(); } catch (e) {}
                    return;
                }
                visualTheme.probe(bgUrl).then(ok => {
                    if (game.decor.slots.background !== 'summer_beach') return;
                    if (ok) {
                        document.body.classList.remove('decor-bg-summer-fallback');
                        document.body.style.setProperty('background', `url('${bgUrl}') center/cover no-repeat`, 'important');
                    } else {
                        document.body.style.removeProperty('background');
                        document.body.classList.add('decor-bg-summer-fallback');
                    }
                    try { if (typeof mobileUI !== 'undefined') mobileUI.fitScene(); } catch (e) {}
                });
            },
            applyChefDecor() {
                this.ensure();
                this._applyDecorOverlay('asset-chefdecor-hat', game.decor.slots.chefHat);
                this._applyDecorOverlay('asset-chefdecor-face', game.decor.slots.chefFace);
            },
            updatePlaceSection() {
                const sec = document.getElementById('decor-place-section');
                const eq = this.hasEquippedChefDecor();
                if (sec) sec.style.display = eq ? '' : 'none';
                const btn = document.getElementById('decor-place-btn');
                if (btn) {
                    const on = (typeof placeTool !== 'undefined') && placeTool.active && placeTool.decorOnly;
                    btn.textContent = on ? t('decor_place_off') : t('decor_place_btn');
                }
            },
            applyVisual() {
                this.applyBackground();
                this.applyChefDecor();
            },
            previewGlyph(it) {
                if (it.img) return `<img src="${it.img}" alt="" decoding="async">`;
                return it.glyph || it.preview || '✨';
            },
            renderToggleRow(glyph, label, equipped, locked, btnLabel, onclick) {
                const lockCls = locked ? ' locked' : '';
                const eqCls = equipped ? ' equipped' : '';
                const dis = locked ? ' disabled' : '';
                return `<div class="decor-toggle-row${eqCls}${lockCls}"><span class="decor-glyph">${glyph}</span><span class="decor-label">${label}</span><button class="gx-btn sm" type="button"${dis} onclick="${onclick}">${btnLabel}</button></div>`;
            },
            render() {
                this.ensure();
                const bgEl = document.getElementById('decor-bg-options');
                const chefEl = document.getElementById('decor-chef-options');
                if (bgEl) {
                    const curBg = game.decor.slots.background;
                    const beachEq = curBg === 'summer_beach';
                    const beachOk = this.isUnlocked('summer_beach');
                    bgEl.innerHTML = this.renderToggleRow('🏠', t('decor_bg_default'), !curBg, false, !curBg ? t('decor_equipped') : t('decor_equip'), 'decor.setBackground(null)')
                        + this.renderToggleRow('🏖️', t('decor_summer_beach'), beachEq, !beachOk, beachEq ? t('decor_unequip') : t('decor_equip'), beachEq ? 'decor.setBackground(null)' : "decor.setBackground('summer_beach')");
                }
                if (chefEl) {
                    chefEl.innerHTML = DECOR_ITEMS.filter(it => DECOR_CHEF_SLOTS.includes(it.kind)).map(it => {
                        const eq = game.decor.slots[it.kind] === it.id;
                        const ok = this.isUnlocked(it.id);
                        const btn = eq ? t('decor_unequip') : t('decor_equip');
                        const action = `decor.toggleChefSlot('${it.kind}','${it.id}')`;
                        return this.renderToggleRow(this.previewGlyph(it), t(it.nameKey), eq, !ok, btn, action);
                    }).join('');
                }
                this.updatePlaceSection();
                this.applyVisual();
            },
            devUnlockAll() {
                if (!creator.isDev()) return;
                this.ensure();
                DECOR_ITEMS.forEach(it => { if (game.decor.owned.indexOf(it.id) < 0) game.decor.owned.push(it.id); });
                game.save(); this.render();
                try { gx.toast(t('decor_dev_unlock')); } catch (e) {}
            }
        };

    global.decor = decor;
})(typeof window !== 'undefined' ? window : this);
