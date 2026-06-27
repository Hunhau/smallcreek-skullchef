/* Creator-only skin placement calibration tool (build-306). */
(function (global) {
    'use strict';

/* ===== CREATOR PLACEMENT TOOL — KEEP (PERMANENT, CREATOR-ONLY, HIDDEN AT LAUNCH) =====
   DO NOT DELETE. Permanent creator-only calibration tool, reused across future
   updates to position NEW cosmetics (hats, rapper caps, spoons, other stirring
   utensils) without code changes. Gated by creator.isDev() so normal players
   never see or trigger it; it simply stays dormant/hidden in the launch build.
   (Requires the creator-unlock mechanism to also stay so the owner can re-enable
   creator mode post-launch.)
   Live calibration for the per-skin placement model (collection.PLACE_*). Two
   input paths share the same mutation helpers (move/scaleBy/rotateBy/nextTarget):
   a KEYBOARD handler (arrows move, +/- size, [ ] rotate, Shift = x10, Tab swaps
   target) and an ON-SCREEN, touch-friendly PANEL (#place-tool-panel, styled by
   #place-tool-style) docked bottom-right with a d-pad, size/rotate, target-cycle,
   x1/x10 toggle, copy, reset and close buttons plus a live readout. Writes to the
   localStorage override (collection.setPlacement), applies live, and "Copy values"
   exports the full override map as JSON so the owner can paste it back to be baked
   into PLACE_DEFAULTS. */
const placeTool = {
    active: false,
    decorOnly: false,
    target: 'spoon',   // spoon | hat | decor_hat | decor_face
    big: false,
    _key: null,
    _targetList() {
        if (this.decorOnly) {
            const list = [];
            try {
                decor.ensure();
                if (game.decor.slots.chefHat) list.push('decor_hat');
                if (game.decor.slots.chefFace) list.push('decor_face');
            } catch (e) {}
            return list.length ? list : ['decor_hat', 'decor_face'];
        }
        return ['spoon', 'hat', 'decor_hat', 'decor_face'];
    },
    _targetLabel() {
        if (this.target === 'hat') return t('place_hud_hat');
        if (this.target === 'spoon') return t('place_hud_spoon');
        if (this.target === 'decor_hat') return t('decor_edit_hat');
        if (this.target === 'decor_face') return t('decor_edit_shades');
        return '';
    },
    activeId() {
        if (this.target === 'hat') {
            try {
                const sh = game.getEquippedShopHat();
                return (sh && sh.owned && sh.skinId) ? sh.skinId : null;
            } catch (e) { return null; }
        }
        if (this.target === 'spoon') {
            try {
                const ss = game.getEquippedSpoon();
                return (ss && ss.owned && ss.skinId) ? ss.skinId : null;
            } catch (e) { return null; }
        }
        if (this.target === 'decor_hat') return (game.decor && game.decor.slots) ? game.decor.slots.chefHat : null;
        if (this.target === 'decor_face') return (game.decor && game.decor.slots) ? game.decor.slots.chefFace : null;
        return null;
    },
    _applyVisuals() {
        try { collection.applyEquippedVisual(); } catch (err) {}
        try { decor.applyChefDecor(); } catch (err) {}
    },
    toggle() { this.decorOnly = false; this.active ? this.exit() : this.enter(); },
    toggleFromDecor() {
        if (this.active && this.decorOnly) { this.exit(); return; }
        if (!decor.hasEquippedChefDecor()) { try { gx.toast(t('decor_edit_none')); } catch (e) {} return; }
        this.decorOnly = true;
        try {
            decor.ensure();
            this.target = game.decor.slots.chefHat ? 'decor_hat' : 'decor_face';
        } catch (e) { this.target = 'decor_hat'; }
        this.enter(true);
        // Same UX as Creator placement: dismiss the modal so the chef and bottom-right panel are usable.
        try { decor.close(); } catch (e) {}
    },
    enter(allowNonDev) {
        if (!allowNonDev && !creator.isDev()) return;
        this.active = true;
        if (!this._key) { this._key = (e) => this.onKey(e); window.addEventListener('keydown', this._key, true); }
        this.showPanel();
        try { creator.render(); } catch (e) {}
        try { gx.toast(this.decorOnly ? t('decor_place_on') : t('place_tool_on')); } catch (e) {}
    },
    exit() {
        const wasDecor = this.decorOnly;
        this.active = false;
        this.decorOnly = false;
        if (this._key) { window.removeEventListener('keydown', this._key, true); this._key = null; }
        this.hidePanel();
        try { creator.render(); } catch (e) {}
        try { decor.updatePlaceSection(); } catch (e) {}
        try { gx.toast(wasDecor ? t('decor_place_off') : t('place_tool_off')); } catch (e) {}
    },
    // ── Shared mutation helpers: BOTH the keyboard handler and the on-screen
    //    buttons funnel through these so behaviour stays identical. ──
    _apply(mutate) {
        const id = this.activeId();
        if (!id) { try { gx.toast(t('place_tool_none')); } catch (e) {} return false; }
        const p = Object.assign({ x: 0, y: 0, scale: 1, rot: 0 }, collection.placementFor(id));
        mutate(p);
        collection.setPlacement(id, p);
        this._applyVisuals();
        this.updateHud();
        return true;
    },
    step()  { return this.big ? 10 : 1; },
    rstep() { return this.big ? 5 : 1; },
    move(dx, dy) { return this._apply(p => { p.x += dx; p.y += dy; }); },
    scaleBy(delta) { return this._apply(p => { p.scale = Math.max(0.05, Math.round((p.scale + delta) * 100) / 100); }); },
    rotateBy(deg) { return this._apply(p => { p.rot += deg; }); },
    nextTarget() {
        const list = this._targetList();
        const i = list.indexOf(this.target);
        this.target = list[(i + 1) % list.length];
        this.updateHud();
    },
    // Toggle fine/coarse step size (the on-screen "x10" button).
    toggleBig() { this.big = !this.big; this.updateHud(); },
    onKey(e) {
        if (!this.active) return;
        if (e.key === 'Tab') { e.preventDefault(); e.stopPropagation(); this.nextTarget(); return; }
        const step = e.shiftKey ? 10 : 1;
        const rstep = e.shiftKey ? 5 : 1;
        let handled = true;
        switch (e.key) {
            case 'ArrowLeft':  this.move(-step, 0); break;
            case 'ArrowRight': this.move(step, 0); break;
            case 'ArrowUp':    this.move(0, -step); break;
            case 'ArrowDown':  this.move(0, step); break;
            case '+': case '=': this.scaleBy(0.02); break;
            case '-': case '_': this.scaleBy(-0.02); break;
            case '[': this.rotateBy(-rstep); break;
            case ']': this.rotateBy(rstep); break;
            default: handled = false;
        }
        if (!handled) return;
        e.preventDefault(); e.stopPropagation();
    },
    copyValues() {
        let json = '{}';
        try { json = JSON.stringify(collection.placeOverrides(), null, 2); } catch (e) {}
        const ok = () => { try { gx.toast(t('place_tool_copied')); } catch (e) {} };
        const manual = () => { try { window.prompt(t('place_tool_copy_manual'), json); } catch (e) {} };
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(json).then(ok, manual);
            else manual();
        } catch (e) { manual(); }
    },
    resetActive() {
        const id = this.activeId();
        if (!id) { try { gx.toast(t('place_tool_none')); } catch (e) {} return; }
        collection.resetPlacement(id);
        this._applyVisuals();
        this.updateHud();
        try { gx.toast(t('place_tool_reset')); } catch (e) {}
    },
    // ── On-screen control panel (touch-friendly). Built once, then shown/hidden. ──
    showPanel() {
        this._injectStyle();
        let panel = document.getElementById('place-tool-panel');
        if (!panel) { panel = this._buildPanel(); document.body.appendChild(panel); }
        panel.style.display = 'block';
        this.updateHud();
    },
    hidePanel() { const panel = document.getElementById('place-tool-panel'); if (panel) panel.style.display = 'none'; },
    _injectStyle() {
        if (document.getElementById('place-tool-style')) return;
        const st = document.createElement('style');
        st.id = 'place-tool-style';
        st.textContent =
            '#place-tool-panel{position:fixed;right:12px;bottom:12px;z-index:30000;width:248px;color:#fff7e6;'
            + 'background:linear-gradient(160deg,rgba(30,22,8,0.92),rgba(12,10,18,0.92));'
            + 'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);'
            + 'border:1px solid rgba(251,191,36,0.55);border-radius:16px;padding:12px;'
            + 'font:600 12px/1.35 system-ui,sans-serif;box-shadow:0 10px 34px rgba(0,0,0,0.55);user-select:none;}'
            + '#place-tool-panel .ptp-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;color:#fbbf24;font-size:13px;}'
            + '#place-tool-panel .ptp-readout{background:rgba(0,0,0,0.35);border:1px solid rgba(251,191,36,0.25);border-radius:10px;padding:6px 8px;margin-bottom:8px;font-size:11.5px;min-height:34px;}'
            + '#place-tool-panel .ptp-row{display:flex;gap:6px;margin-bottom:6px;}'
            + '#place-tool-panel .ptp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:6px;}'
            + '#place-tool-panel button{appearance:none;cursor:pointer;color:#fff7e6;background:linear-gradient(135deg,rgba(120,90,20,0.65),rgba(60,45,15,0.65));'
            + 'border:1px solid rgba(251,191,36,0.45);border-radius:10px;min-height:44px;min-width:44px;flex:1;'
            + 'font:700 15px/1 system-ui,sans-serif;touch-action:manipulation;transition:transform .05s,filter .12s;}'
            + '#place-tool-panel button:hover{filter:brightness(1.15);}'
            + '#place-tool-panel button:active{transform:scale(0.94);}'
            + '#place-tool-panel button:disabled{opacity:0.35;cursor:not-allowed;}'
            + '#place-tool-panel button.ptp-on{background:linear-gradient(135deg,#065f46,#10b981);border-color:#a7f3d0;}'
            + '#place-tool-panel button.ptp-wide{font-size:12px;}'
            + '#place-tool-panel .ptp-close{flex:0 0 auto;min-width:30px;min-height:30px;font-size:14px;padding:0 8px;'
            + 'background:linear-gradient(135deg,#7f1d1d,#ef4444);border-color:#fecaca;}'
            + '#place-tool-panel .ptp-spacer{flex:0 0 auto;min-width:0;min-height:0;background:none;border:none;pointer-events:none;}';
        document.head.appendChild(st);
    },
    _buildPanel() {
        const panel = document.createElement('div');
        panel.id = 'place-tool-panel';
        const b = (attrs, label) => `<button type="button" ${attrs}>${label}</button>`;
        panel.innerHTML =
            `<div class="ptp-head"><span>⚙ ${t('place_hud_title')}</span>`
            + b('class="ptp-close" id="ptp-close" title="' + t('place_tt_close') + '" onclick="placeTool.exit()"', '✕') + '</div>'
            + `<div class="ptp-readout" id="ptp-readout"></div>`
            + `<div class="ptp-row">`
                + b('id="ptp-target" class="ptp-wide" title="' + t('place_tt_target') + '" onclick="placeTool.nextTarget()"', '⇄')
                + b('id="ptp-step" class="ptp-wide" title="' + t('place_tool_step') + '" onclick="placeTool.toggleBig()"', 'x1')
            + `</div>`
            + `<div class="ptp-grid">`
                + b('class="ptp-spacer" tabindex="-1"', '')
                + b('class="ptp-move" title="' + t('place_tt_move') + '" onclick="placeTool.move(0,-placeTool.step())"', '▲')
                + b('class="ptp-spacer" tabindex="-1"', '')
                + b('class="ptp-move" title="' + t('place_tt_move') + '" onclick="placeTool.move(-placeTool.step(),0)"', '◀')
                + b('class="ptp-move" title="' + t('place_tt_move') + '" onclick="placeTool.move(0,placeTool.step())"', '▼')
                + b('class="ptp-move" title="' + t('place_tt_move') + '" onclick="placeTool.move(placeTool.step(),0)"', '▶')
            + `</div>`
            + `<div class="ptp-row">`
                + b('class="ptp-move" title="' + t('place_tt_smaller') + '" onclick="placeTool.scaleBy(-0.02)"', '－')
                + b('class="ptp-move" title="' + t('place_tt_bigger') + '" onclick="placeTool.scaleBy(0.02)"', '＋')
                + b('class="ptp-move" title="' + t('place_tt_rotate_l') + '" onclick="placeTool.rotateBy(-placeTool.rstep())"', '⟲')
                + b('class="ptp-move" title="' + t('place_tt_rotate_r') + '" onclick="placeTool.rotateBy(placeTool.rstep())"', '⟳')
            + `</div>`
            + `<div class="ptp-row">`
                + b('class="ptp-wide" onclick="placeTool.copyValues()"', t('place_tool_copy'))
                + b('class="ptp-wide" onclick="placeTool.resetActive()"', t('place_tool_reset_btn'))
            + `</div>`;
        return panel;
    },
    // Live readout + button states. Named updateHud() to match existing callers.
    updateHud() {
        const panel = document.getElementById('place-tool-panel');
        if (!panel || !this.active) return;
        const tgtLabel = this._targetLabel();
        const id = this.activeId();
        const readout = panel.querySelector('#ptp-readout');
        if (readout) {
            let line;
            if (id) {
                const p = collection.placementFor(id);
                line = `<span style="color:#fbbf24">${id}</span><br>x ${p.x} · y ${p.y} · scale ${p.scale} · rot ${p.rot}°`;
            } else {
                line = `<span style="color:#94a3b8">${t('place_hud_none')}</span>`;
            }
            readout.innerHTML = `<div>${t('place_hud_target')}: <b>${tgtLabel}</b></div><div style="margin-top:2px">${line}</div>`;
        }
        const tgtBtn = panel.querySelector('#ptp-target');
        if (tgtBtn) tgtBtn.innerHTML = '⇄ ' + tgtLabel;
        const stepBtn = panel.querySelector('#ptp-step');
        if (stepBtn) { stepBtn.textContent = this.big ? 'x10' : 'x1'; stepBtn.classList.toggle('ptp-on', this.big); }
        // Disable move/size/rotate when nothing is equipped in this slot.
        panel.querySelectorAll('button.ptp-move').forEach(btn => { btn.disabled = !id; });
    }
};
/* ===== END CREATOR PLACEMENT TOOL (KEEP) ===== */
    global.placeTool = placeTool;
})(typeof window !== 'undefined' ? window : this);
