/* Helper trust (bond), team panel, and duo synergies — globals used by main game script. */
(function (global) {
    'use strict';

    global.helperBond = {
        THRESHOLDS: [12, 30, 55, 85, 120],
        ensure() {
            if (!game.hb || typeof game.hb !== 'object') game.hb = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
            for (let i = 0; i < 5; i++) {
                if (!Number.isFinite(game.hb[i])) game.hb[i] = 0;
                game.hb[i] = Math.max(0, Math.min(9999, Math.floor(game.hb[i])));
            }
            return game.hb;
        },
        level(xp) {
            const n = Number(xp) || 0;
            let lv = 0;
            for (let i = 0; i < this.THRESHOLDS.length; i++) if (n >= this.THRESHOLDS[i]) lv = i + 1;
            return lv;
        },
        role(helperId) {
            const key = 'bond_role_' + helperId;
            try { return t(key); } catch (e) { return ''; }
        },
        line(helperId, lv) {
            const key = 'bond_line_' + helperId + '_' + lv;
            try { return t(key); } catch (e) { return ''; }
        },
        add(helperId, amt, silent) {
            if (!Number.isFinite(helperId) || helperId < 0 || helperId > 4 || !amt) return;
            const hb = this.ensure();
            const prev = this.level(hb[helperId]);
            hb[helperId] += Math.max(0, Math.floor(amt));
            const next = this.level(hb[helperId]);
            if (!silent && next > prev) {
                const c = game.cp[helperId];
                const name = c ? t(c.nk) : '?';
                try { gx.toast(t('bond_level_toast', { name: name, n: next, line: this.line(helperId, next) })); } catch (e) {}
            }
            try { game.save(); } catch (e2) {}
        },
        topChampion() {
            const cp = game.cp;
            if (!cp) return null;
            let best = null, bestCh = -1;
            for (let i = 0; i < cp.length; i++) {
                const ch = cp[i].ch || 0;
                if (ch > bestCh) { bestCh = ch; best = i; }
            }
            if (bestCh <= 0) return null;
            return best;
        },
        chipHelperId() {
            try {
                if (game.p && prix.ch) return prix.ch.id;
            } catch (e) {}
            const top = this.topChampion();
            if (top != null) return top;
            return null;
        },
        chipText() {
            const id = this.chipHelperId();
            if (id == null) return '';
            const hb = this.ensure();
            const lv = this.level(hb[id]);
            if (lv <= 0) return '';
            const c = game.cp[id];
            if (!c) return '';
            const cpsPct = (lv * 0.8).toFixed(1).replace(/\.0$/, '');
            return t('bond_chip', { name: t(c.nk), n: lv, role: this.role(id), cps: cpsPct });
        },
        tipParams() {
            const id = this.chipHelperId();
            if (id == null) return null;
            const hb = this.ensure();
            const lv = this.level(hb[id]);
            if (lv <= 0) return null;
            const c = game.cp[id];
            if (!c) return null;
            const cpsPct = (lv * 0.8).toFixed(1).replace(/\.0$/, '');
            const prixPct = (lv * 2.5).toFixed(1).replace(/\.0$/, '');
            return { name: t(c.nk), n: lv, role: this.role(id), cps: cpsPct, prix: prixPct };
        },
        progressPct(xp) {
            const n = Number(xp) || 0;
            const lv = this.level(n);
            if (lv >= this.THRESHOLDS.length) return 100;
            const prev = lv > 0 ? this.THRESHOLDS[lv - 1] : 0;
            const next = this.THRESHOLDS[lv];
            return Math.min(100, Math.floor(((n - prev) / (next - prev)) * 100));
        },
        nextThreshold(xp) {
            const lv = this.level(Number(xp) || 0);
            if (lv >= this.THRESHOLDS.length) return null;
            return this.THRESHOLDS[lv];
        },
        prixStirMult(helperId) {
            const hb = this.ensure();
            return 1 + this.level(hb[helperId]) * 0.025;
        },
        equippedCpsMult() {
            let bonus = 0;
            try {
                const slots = ['coco', 'bunny', 'pio', 'ivan', 'bongo'];
                const map = { coco: 0, bunny: 1, pio: 2, ivan: 3, bongo: 4 };
                const hb = this.ensure();
                for (let i = 0; i < slots.length; i++) {
                    const id = collection.equippedIn(slots[i]);
                    if (!id) continue;
                    const sk = collection.skinById(id);
                    if (!sk) continue;
                    const token = String(sk.id || '').split('_')[0];
                    const hid = map[token];
                    if (hid == null) continue;
                    bonus += this.level(hb[hid]) * 0.008;
                }
            } catch (e) {}
            return 1 + bonus;
        },
        syncUi() {
            const el = document.getElementById('bond-chip');
            if (!el) return;
            const txt = this.chipText();
            if (txt) {
                if (el.textContent !== txt) el.textContent = txt;
                if (el.style.display !== 'block') el.style.display = 'block';
            } else if (el.style.display !== 'none') el.style.display = 'none';
        },
        tap(helperId) {
            const c = game.cp[helperId];
            if (!c || c.lv <= 0) return;
            const hb = this.ensure();
            const lv = this.level(hb[helperId]);
            const name = t(c.nk);
            const line = lv > 0 ? this.line(helperId, lv) : t('bond_tap_idle', { name: name, role: this.role(helperId) });
            try { gx.toast(name + ': ' + line); } catch (e) {}
            this.add(helperId, 1, true);
        }
    };

    global.helpersPanel = {
        open() { this.render(); const md = document.getElementById('helpers-modal'); if (md) md.classList.add('open'); },
        close() { const md = document.getElementById('helpers-modal'); if (md) md.classList.remove('open'); },
        render() {
            const host = document.getElementById('helpers-panel-list');
            if (!host) return;
            helperBond.ensure();
            farm.ensure();
            const hb = game.hb;
            let html = '';
            for (let i = 0; i < game.cp.length; i++) {
                const c = game.cp[i];
                if (c.lv <= 0) continue;
                const xp = hb[i] || 0;
                const lv = helperBond.level(xp);
                const pct = helperBond.progressPct(xp);
                const nextXp = helperBond.nextThreshold(xp);
                const xpLine = nextXp != null ? `${xp}/${nextXp}` : `${xp} ✓`;
                const wagon = game.farm.wagon === i;
                const equipLine = (function () { try { return collection.helperEquipSubtitle(i); } catch (e) { return t(c.nk); } })();
                const wagonBtn = wagon
                    ? `<button class="gx-btn sm" type="button" onclick="farm.setWagon(null); helpersPanel.render();">${t('farm_wagon_clear')}</button>`
                    : `<button class="gx-btn sm" type="button" onclick="farm.setWagon(${i}); helpersPanel.render();">${t('farm_wagon_send')}</button>`;
                html += `<div class="helpers-panel-row"><div style="font-weight:bold;color:#e2e8f0">${t(c.nk)} · ${helperBond.role(i)}</div>`
                    + `<div style="font-size:0.68rem;color:#94a3b8;margin:4px 0">${equipLine}</div>`
                    + `<div style="font-size:0.68rem;color:#94a3b8;margin:0 0 4px">${t('helpers_trust', { n: lv })}${wagon ? ' · 🌱' : ''} · ${xpLine}</div>`
                    + `<div style="font-size:0.62rem;color:#cbd5e1;margin:0 0 6px;line-height:1.35">${itemBonus.helpersPanelLine(i)}</div>`
                    + `<div class="bond-xp-bar" aria-hidden="true"><div class="bond-xp-fill" style="width:${pct}%"></div></div>${wagonBtn}</div>`;
            }
            host.innerHTML = html || `<p style="color:#94a3b8;font-size:0.82rem">${t('coll_empty')}</p>`;
        }
    };

    global.helperDuos = {
        active() {
            const cp = game.cp;
            if (!cp || cp.length < 5) return [];
            const out = [];
            if (cp[0].lv > 0 && cp[1].lv > 0) out.push({ key: 'duo_coco_bunny', clickPct: 4 });
            if (cp[2].lv > 0 && cp[3].lv > 0) out.push({ key: 'duo_pio_ivan', cpsPct: 4 });
            if (cp[4].lv > 0 && cp.some(c => (c.ch || 0) > 0)) out.push({ key: 'duo_bongo_champ', cpsPct: 5, clickPct: 5 });
            return out;
        },
        clickMult() {
            let m = 1;
            this.active().forEach(d => { if (d.clickPct) m *= 1 + d.clickPct / 100; });
            return m;
        },
        cpsMult() {
            let m = 1;
            this.active().forEach(d => { if (d.cpsPct) m *= 1 + d.cpsPct / 100; });
            return m;
        },
        bongoDuoLabel() {
            const cp = game.cp;
            if (!cp) return t('duo_bongo_champ');
            const crowned = cp.filter(c => (c.ch || 0) > 0);
            if (!crowned.length) return t('duo_bongo_champ');
            crowned.sort((a, b) => (b.ch || 0) - (a.ch || 0));
            const pick = crowned.find(c => c.id !== 4) || crowned[0];
            return t('duo_bongo_with', { name: t(pick.nk) });
        },
        chipText() {
            const a = this.active();
            if (!a.length) return '';
            const clickPct = Math.round((this.clickMult() - 1) * 100);
            const cpsPct = Math.round((this.cpsMult() - 1) * 100);
            const parts = [];
            if (clickPct > 0) parts.push('+' + clickPct + '% ' + t('chip_axis_click_short'));
            if (cpsPct > 0) parts.push('+' + cpsPct + '% CPS');
            const bonus = parts.join(' · ');
            return t('duo_chip', { n: a.length, bonus: bonus });
        },
        tipParams() {
            const a = this.active();
            if (!a.length) return null;
            const names = a.map(d => d.key === 'duo_bongo_champ' ? this.bongoDuoLabel() : t(d.key)).join(' · ');
            const lines = a.map(d => {
                const label = d.key === 'duo_bongo_champ' ? this.bongoDuoLabel() : t(d.key);
                const bits = [];
                if (d.clickPct) bits.push('+' + d.clickPct + '% ' + t('chip_axis_click_short'));
                if (d.cpsPct) bits.push('+' + d.cpsPct + '% CPS');
                return label + ': ' + (bits.join(', ') || '—');
            }).join(' · ');
            return { n: a.length, names: names, detail: lines };
        },
        syncUi() {
            const el = document.getElementById('duo-chip');
            if (!el) return;
            const txt = this.chipText();
            if (txt) {
                if (el.textContent !== txt) el.textContent = txt;
                if (el.style.display !== 'block') el.style.display = 'block';
            } else if (el.style.display !== 'none') el.style.display = 'none';
        }
    };
})(typeof window !== 'undefined' ? window : this);
