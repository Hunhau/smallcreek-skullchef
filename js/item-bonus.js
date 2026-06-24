/* Item / card bonus copy — global itemBonus. Runtime deps: t, collection, atlas, helperBond, helperDuos, game. */
(function (global) {
    'use strict';

    global.itemBonus = {
        _fmtPct(n) {
            const s = Number(n).toFixed(1);
            return s.replace(/\.0$/, '');
        },
        _helperIdForSkin(id) {
            try {
                const slot = collection.slotOfId(id);
                if (!slot) return null;
                return collection.HELPER_SLOT[slot];
            } catch (e) { return null; }
        },
        /** Stat / equip bonuses in Amuletos UI — helper skins only. */
        showsCollectionBonus(id) {
            try { return !!collection.canEquipSkin(id); } catch (e) { return false; }
        },
        skinBonusLine(id, it) {
            try {
                if (!this.showsCollectionBonus(id)) return '';
                const skin = collection.skinById(id);
                if (!skin || skin.family !== 'helper') return '';
                const parts = [t('bonus_skin_helper_look')];
                const asc = (it && it.ascended) || 0;
                if (asc > 0) parts.push(t('bonus_skin_asc', { pct: this._fmtPct(asc * 1.5) }));
                let pack = null;
                try { pack = atlas.packFor(id); } catch (e) {}
                if (pack) {
                    const packName = atlas.packDisplayTitle(pack);
                    const info = collection.packSynergyInfo();
                    if (info.pack === pack && info.n >= 2) {
                        parts.push(t('bonus_skin_synergy_active', { pct: info.pct, pack: packName }));
                    } else {
                        parts.push(t('bonus_skin_synergy_potential', { pack: packName }));
                    }
                }
                const hid = this._helperIdForSkin(id);
                if (hid != null && collection.isEquipped(id)) {
                    const hb = helperBond.ensure();
                    const lv = helperBond.level(hb[hid] || 0);
                    if (lv > 0) {
                        parts.push(t('bonus_skin_bond_active', { cps: this._fmtPct(lv * 0.8) }));
                    }
                }
                return parts.join(' · ');
            } catch (e) { return ''; }
        },
        skinBonusShort(id, it) {
            try {
                if (!this.showsCollectionBonus(id)) return '';
                const skin = collection.skinById(id);
                if (!skin || skin.family !== 'helper') return '';
                const asc = (it && it.ascended) || 0;
                if (asc > 0) return t('bonus_skin_asc_short', { pct: this._fmtPct(asc * 1.5) });
                let pack = null;
                try { pack = atlas.packFor(id); } catch (e) {}
                if (pack) return t('bonus_skin_pack_short', { pack: atlas.packDisplayTitle(pack) });
                return t('bonus_skin_helper_short');
            } catch (e) { return ''; }
        },
        helperDuoLine(helperId) {
            try {
                const duos = helperDuos.active();
                for (let i = 0; i < duos.length; i++) {
                    const d = duos[i];
                    if (d.key === 'duo_coco_bunny' && (helperId === 0 || helperId === 1)) {
                        return t('helper_card_duo', { label: t(d.key), bonus: '+4% ' + t('chip_axis_click_short') });
                    }
                    if (d.key === 'duo_pio_ivan' && (helperId === 2 || helperId === 3)) {
                        return t('helper_card_duo', { label: t(d.key), bonus: '+4% CPS' });
                    }
                    if (d.key === 'duo_bongo_champ' && helperId === 4) {
                        return t('helper_card_duo', { label: helperDuos.bongoDuoLabel(), bonus: '+5% ' + t('chip_axis_click_short') + ' · +5% CPS' });
                    }
                    if (d.key === 'duo_bongo_champ' && helperId !== 4) {
                        const c = game.cp[helperId];
                        if (c && (c.ch || 0) > 0) {
                            return t('helper_card_duo', { label: helperDuos.bongoDuoLabel(), bonus: '+5% ' + t('chip_axis_click_short') + ' · +5% CPS' });
                        }
                    }
                }
            } catch (e) {}
            return '';
        },
        helperCardHtml(helperId, c) {
            const lines = [];
            try {
                if (c && c.lv > 0) {
                    const role = helperBond.role(helperId);
                    if (role) lines.push(t('helper_card_role', { role: role }));
                    const hb = helperBond.ensure();
                    const lv = helperBond.level(hb[helperId] || 0);
                    if (lv > 0) {
                        lines.push(t('helper_card_bond', {
                            n: lv,
                            cps: this._fmtPct(lv * 0.8),
                            prix: this._fmtPct(lv * 2.5)
                        }));
                    }
                    const duo = this.helperDuoLine(helperId);
                    if (duo) lines.push(duo);
                } else if (c) {
                    lines.push(t('helper_card_unlock', { role: helperBond.role(helperId) }));
                }
            } catch (e) {}
            if (!lines.length) return '';
            return '<br><span class="card-bonus-hint">' + lines.join('<br>') + '</span>';
        },
        helpersPanelLine(helperId) {
            try {
                const hb = helperBond.ensure();
                const lv = helperBond.level(hb[helperId] || 0);
                if (lv <= 0) return t('helpers_panel_bond_idle', { role: helperBond.role(helperId) });
                return t('helpers_panel_bond', {
                    n: lv,
                    cps: this._fmtPct(lv * 0.8),
                    prix: this._fmtPct(lv * 2.5),
                    role: helperBond.role(helperId)
                });
            } catch (e) { return ''; }
        },
        shopTip(kind, id) {
            try {
                if (kind === 'spoon') {
                    const s = game.spoons.find(x => x.id === id);
                    if (!s) return;
                    gx.toast(t(s.cardKey) + '\n' + t(s.bonusKey));
                    return;
                }
                if (kind === 'hat') {
                    const h = game.hats.find(x => x.id === id);
                    if (!h) return;
                    gx.toast(t(h.cardKey) + '\n' + t(h.bonusKey));
                }
            } catch (e) {}
        }
    };
})(typeof window !== 'undefined' ? window : this);
