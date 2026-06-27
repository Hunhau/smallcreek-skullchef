/* Collapsible on-scene owned-helpers box (mobile). */
(function (global) {
    'use strict';

    global.helpersBox = {
        KEY: 'soup_helpers_box_collapsed',
        isCollapsed() { try { return localStorage.getItem(this.KEY) === '1'; } catch (e) { return false; } },
        apply() {
            try {
                const collapsed = this.isCollapsed();
                document.body.classList.toggle('helpers-collapsed', collapsed);
                const btn = document.getElementById('helpers-toggle');
                if (btn) {
                    btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
                    const chev = btn.querySelector('.helpers-chevron');
                    if (chev) chev.textContent = collapsed ? '▸' : '▾';
                }
                this.updateCount();
                try { if (typeof mobileUI !== 'undefined') { mobileUI.syncLandscapeLeftHud(); mobileUI.syncPortraitHelperColumn(); mobileUI.syncAltarBelowHud(); } } catch (e) {}
            } catch (e) {}
        },
        updateCount() {
            try {
                const btn = document.getElementById('helpers-toggle'); if (!btn) return;
                let n = 0;
                try { if (typeof game !== 'undefined' && game.cp) n = game.cp.filter(c => c.lv > 0).length; } catch (e) {}
                let badge = btn.querySelector('.helpers-count');
                if (!badge) { badge = document.createElement('span'); badge.className = 'helpers-count'; btn.appendChild(badge); }
                const txt = n > 0 ? String(n) : '';
                if (badge.textContent !== txt) badge.textContent = txt;
            } catch (e) {}
        },
        toggle() {
            try {
                const next = !this.isCollapsed();
                try { localStorage.setItem(this.KEY, next ? '1' : '0'); } catch (e) {}
                this.apply();
            } catch (e) {}
        },
        init() { try { this.apply(); } catch (e) {} }
    };
})(typeof window !== 'undefined' ? window : this);
