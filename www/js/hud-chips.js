/* HUD status chips — tap for bonus details. global hudChips. */
(function (global) {
    'use strict';

    global.hudChips = {
        init() {
            const stack = document.getElementById('hud-status-stack');
            if (!stack || stack.__hudChipTap) return;
            stack.__hudChipTap = true;
            stack.addEventListener('click', (e) => {
                const el = e.target.closest('.hud-chip-tap');
                if (!el) return;
                e.stopPropagation();
                this.explain(el);
            });
        },
        _toast(key, params) {
            try { gx.toast(t(key, params || {})); } catch (e) {}
        },
        explain(el) {
            const id = el.id || '';
            if (el.dataset.chip === 'buff') {
                const kind = el.dataset.buffKind || '';
                const mult = Number(el.dataset.buffMult) || 1;
                const pct = Math.round((mult - 1) * 100);
                const axis = kind === 'click' ? t('chip_axis_click') : t('chip_axis_cps');
                this._toast('chip_tip_buff', { label: t(el.dataset.buffLabel || 'buff_frenzy'), pct: pct, axis: axis });
                return;
            }
            switch (id) {
                case 'bonus-chip': {
                    let sets = 0, pct = 0;
                    try { sets = atlas.completedPackCount(); pct = atlas.setBonusPctDisplay(); } catch (e) {}
                    this._toast('chip_tip_bonus', { n: sets, pct: pct });
                    break;
                }
                case 'synergy-chip': {
                    const info = collection.packSynergyInfo();
                    let packName = info.pack || '';
                    try { if (info.pack) packName = atlas.packDisplayTitle(info.pack); } catch (e) {}
                    this._toast('chip_tip_synergy', { pack: packName, n: info.n, pct: info.pct });
                    break;
                }
                case 'menu-chip': {
                    const b = soupMenu.activeBonus();
                    this._toast('chip_tip_menu', { dish: b.dish || '', pct: b.pct || Math.round(soupMenu.PACK_BONUS * 100) });
                    break;
                }
                case 'bond-chip': {
                    const p = helperBond.tipParams();
                    if (p) this._toast('chip_tip_bond', p);
                    break;
                }
                case 'duo-chip': {
                    const p = helperDuos.tipParams();
                    if (p) this._toast('chip_tip_duo', p);
                    break;
                }
                case 'comm-chip': {
                    const time = commChallenge.buffTimeLeft();
                    const active = !!(game.comm && game.comm.buffUntil > Date.now());
                    this._toast(active ? 'chip_tip_comm_active' : 'chip_tip_comm', { time: time, pct: commChallenge.pct() });
                    break;
                }
                case 'drop-chip': {
                    let pct = 0;
                    try { pct = Math.round((collection.dropAccelMult() - 1) * 100); } catch (e) {}
                    this._toast('chip_tip_drop', { pct: pct });
                    break;
                }
                case 'boss-chip': {
                    let reward = 0;
                    try { reward = soupBoss.rewardPreview(); } catch (e) {}
                    this._toast('chip_tip_boss', { pct: soupBoss.pct(), eb: reward.toLocaleString() });
                    break;
                }
                case 'stir-combo': {
                    const combo = game._stirCombo || 0;
                    const pct = game.stirComboPct ? game.stirComboPct() : 0;
                    this._toast('chip_tip_stir', { combo: combo, pct: pct });
                    break;
                }
                case 'event-pill': {
                    const ev = softEvents.active();
                    if (!ev) break;
                    this._toast('chip_tip_event', {
                        name: softEvents.label(ev),
                        cps: softEvents.bonusPctDisplay(ev.cpsBonus),
                        click: softEvents.bonusPctDisplay(ev.clickBonus)
                    });
                    break;
                }
                default:
                    break;
            }
        }
    };
})(typeof window !== 'undefined' ? window : this);
