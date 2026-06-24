/* Seasonal event bridge (reads events.js) — global softEvents. */
(function (global) {
    'use strict';

    global.softEvents = {
        active() {
            try {
                if (typeof events === 'undefined') return null;
                if (events.getPrimary) return events.getPrimary();
                const list = events.getActive();
                return (list && list.length) ? list[0] : null;
            } catch (e) { return null; }
        },
        activeId() { const ev = this.active(); return ev ? ev.id : null; },
        label(ev) {
            if (!ev) return '';
            return (LANG === 'es') ? (ev.label_es || ev.label || ev.id) : (ev.label || ev.label_es || ev.id);
        },
        loreLine(ev) {
            if (!ev) return '';
            return (LANG === 'es') ? (ev.lore_es || ev.lore_en || '') : (ev.lore_en || ev.lore_es || '');
        },
        hasDecorPack(packId) {
            const ev = this.active();
            return !!(ev && ev.decorPack === packId);
        },
        cpsMult() {
            const ev = this.active();
            const b = ev && Number.isFinite(ev.cpsBonus) ? ev.cpsBonus : 0;
            return 1 + Math.max(0, b);
        },
        clickMult() {
            const ev = this.active();
            const b = ev && Number.isFinite(ev.clickBonus) ? ev.clickBonus : 0;
            return 1 + Math.max(0, b);
        },
        bonusPctDisplay(bonus) {
            return Math.round(Math.max(0, Number(bonus) || 0) * 100);
        },
        ensureAnnounced() {
            const c = collection.normalize();
            if (!c.eventAnnounced || typeof c.eventAnnounced !== 'object') c.eventAnnounced = {};
            return c.eventAnnounced;
        },
        updateLoreLine() {
            const el = document.getElementById('event-lore-inline');
            if (!el) return;
            const ev = this.active();
            if (!ev) { el.style.display = 'none'; el.textContent = ''; return; }
            const line = this.loreLine(ev);
            if (!line) { el.style.display = 'none'; el.textContent = ''; return; }
            el.style.display = '';
            el.textContent = '🎉 ' + line;
        },
        sync() {
            const ev = this.active();
            const pill = document.getElementById('event-pill');
            if (pill) {
                if (ev) {
                    const cps = this.bonusPctDisplay(ev.cpsBonus);
                    const clk = this.bonusPctDisplay(ev.clickBonus);
                    let extra = '';
                    if (ev.dropPack) {
                        try { extra = ' · ' + t('event_drop_pack'); } catch (e) {}
                    }
                    pill.style.display = 'block';
                    pill.setAttribute('aria-hidden', 'false');
                    pill.textContent = '🎉 ' + this.label(ev) + ' · +' + cps + '% CPS · +' + clk + '%' + extra;
                } else {
                    pill.style.display = 'none';
                    pill.setAttribute('aria-hidden', 'true');
                    pill.textContent = '';
                }
            }
            this.updateLoreLine();
            this.checkWelcomeToast(ev);
            try { decor.ensure(); decor.applyVisual(); } catch (e) {}
        },
        checkWelcomeToast(ev) {
            if (!ev) return;
            const ann = this.ensureAnnounced();
            const day = new Date().toDateString();
            const key = ev.id + ':' + day;
            if (ann[key]) return;
            ann[key] = 1;
            try { game.save(); } catch (e) {}
            try {
                gx.toast(t('event_welcome_toast', {
                    name: this.label(ev),
                    cps: this.bonusPctDisplay(ev.cpsBonus),
                    click: this.bonusPctDisplay(ev.clickBonus)
                }));
            } catch (e2) {}
        }
    };
})(typeof window !== 'undefined' ? window : this);
