/* Golden bubble random bonus spawn on main stage. */
(function (global) {
    'use strict';

    global.bubble = {
        timer: 60 + Math.floor(Math.random() * 120),
        node: null,
        hideTimer: null,
        reset() {
            let base = 60 + Math.floor(Math.random() * 120);
            try { if (typeof softEvents !== 'undefined' && softEvents.active()) base = Math.max(35, Math.floor(base * 0.72)); } catch (e) {}
            this.timer = base;
        },
        tick() {
            if (game.p || this.node) return;
            if (this.timer <= 0) { this.spawn(); return; }
            this.timer--;
        },
        spawn() {
            if (game.p) { this.reset(); return; }
            const stage = document.getElementById('main-stage');
            if (!stage) { this.reset(); return; }
            const r = stage.getBoundingClientRect();
            const topPad = Math.max(150, Math.floor(r.height * 0.2));
            const el = document.createElement('div');
            el.className = 'golden-bubble';
            el.textContent = '🫧';
            el.style.left = (40 + Math.random() * Math.max(40, r.width - 150)) + 'px';
            el.style.top = (topPad + Math.random() * Math.max(50, r.height - topPad - 110)) + 'px';
            el.onpointerdown = (e) => { e.stopPropagation(); this.collect(); };
            stage.appendChild(el);
            this.node = el;
            sound.play('bubble');
            this.hideTimer = setTimeout(() => this.despawn(), 8000 + Math.random() * 4000);
        },
        despawn() {
            if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
            if (this.node && this.node.parentNode) this.node.remove();
            this.node = null;
            this.reset();
        },
        collect() {
            if (!this.node) return;
            const rect = this.node.getBoundingClientRect();
            const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
            game.part(cx, cy, 'magic');
            sound.play('bubble');
            const roll = Math.floor(Math.random() * 3);
            if (roll === 0) { game.addBuff('click', 7, 15, 'buff_frenzy'); gx.toast(t('buff_frenzy_toast')); }
            else if (roll === 1) { game.addBuff('cps', 3, 30, 'buff_boil'); gx.toast(t('buff_boil_toast')); }
            else { const g = game.getCps() * 30; game.e += g; game.te += g; game.floatNum(cx, cy, g); gx.toast(t('buff_rain_toast', { eb: Math.floor(g).toLocaleString() })); }
            this.despawn();
        }
    };
})(typeof window !== 'undefined' ? window : this);
