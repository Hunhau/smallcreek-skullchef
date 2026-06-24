/* First-session onboarding — global tutorial. */
(function (global) {
    'use strict';

    global.tutorial = {
            KEY: 'soup_tutorial_done_v2',
            LEGACY_KEY: 'soup_tutorial_done_v1',
            REWARD: 25, // TUNABLE: pequeño empujón de EB al terminar la guía (no al saltarla).
            active: false,
            step: 0,
            _root: null, _spot: null, _tip: null, _title: null, _body: null, _stepLbl: null, _nextBtn: null, _skipBtn: null, _onResize: null,
            steps: [
                { target: '#sticky-center', titleKey: 'tut_s1_title', bodyKey: 'tut_s1_body', advance: 'stir', pad: 24, round: '50%' },
                { target: '#companion-list .companion-card', fallback: '#side-shop', titleKey: 'tut_s2_title', bodyKey: 'tut_s2_body', advance: 'buy', pad: 10, round: '14px' },
                { target: '#altar-panel', titleKey: 'tut_s3_title', bodyKey: 'tut_s3_body', advance: 'next', pad: 12, round: '18px' },
                { target: '#farm-fab', titleKey: 'tut_s4_title', bodyKey: 'tut_s4_body', advance: 'farm_open', pad: 10, round: '14px' },
                { target: '#collection-fab', titleKey: 'tut_s5_title', bodyKey: 'tut_s5_body', advance: 'collection_open', pad: 10, round: '14px' },
                { target: '#collection-fab', titleKey: 'tut_s6_title', bodyKey: 'tut_s6_body', advance: 'path_set', pad: 10, round: '14px' },
                { target: '#quests-fab', fallback: '#side-buttons', titleKey: 'tut_s7_title', bodyKey: 'tut_s7_body', advance: 'quest_open', pad: 10, round: '14px' }
            ],
            isDone() { try { return localStorage.getItem(this.KEY) === '1'; } catch (e) { return true; } },
            markDone() { try { localStorage.setItem(this.KEY, '1'); } catch (e) {} },
            maybeStart() {
                try {
                    if (this.active || this.isDone()) return;
                    const fresh = game._inited && game.s === 0 && game.te < 50 && game.cp.every(c => c.lv === 0);
                    if (fresh) { this.start(0); return; }
                    try {
                        if (localStorage.getItem(this.LEGACY_KEY) === '1' && localStorage.getItem(this.KEY) !== '1') {
                            if (game.te < 500000 && game.cp.some(c => c.lv > 0)) { this.start(3); return; }
                        }
                    } catch (e) {}
                    this.markDone();
                } catch (e) {}
            },
            start(atStep) {
                try {
                    if (this.active) return;
                    this.build();
                    this.active = true;
                    this.step = Math.max(0, Math.min(this.steps.length - 1, atStep || 0));
                    this._onResize = () => { if (this.active) this.render(); };
                    window.addEventListener('resize', this._onResize);
                    this.render();
                } catch (e) { this.cleanup(); }
            },
            build() {
                if (this._root) return;
                const root = document.createElement('div');
                root.id = 'tut-root';
                root.style.cssText = 'position:fixed; inset:0; z-index:70000; pointer-events:none;';
                const spot = document.createElement('div');
                spot.id = 'tut-spot';
                spot.style.cssText = 'position:fixed; pointer-events:none; border:2px solid var(--go); border-radius:16px; box-shadow:0 0 0 9999px rgba(2,6,23,0.78), 0 0 24px var(--go); transition:all 0.35s ease; display:none;';
                const tip = document.createElement('div');
                tip.id = 'tut-tip';
                tip.style.cssText = 'position:fixed; pointer-events:auto; max-width:90vw; background:var(--glass-strong); border:1px solid var(--glass-bd); border-radius:16px; padding:16px 18px; box-shadow:0 10px 40px rgba(0,0,0,0.6); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); color:#fff; transition:left 0.3s ease, top 0.3s ease;';
                const stepLbl = document.createElement('div');
                stepLbl.style.cssText = 'font-size:0.62rem; letter-spacing:2px; text-transform:uppercase; color:var(--go); font-weight:bold; margin-bottom:6px;';
                const title = document.createElement('div');
                title.style.cssText = 'font-size:1.05rem; font-weight:bold; color:var(--go); margin-bottom:6px; text-shadow:0 1px 3px rgba(0,0,0,0.7);';
                const body = document.createElement('div');
                body.style.cssText = 'font-size:0.85rem; line-height:1.45; color:#e2e8f0; margin-bottom:14px;';
                const row = document.createElement('div');
                row.style.cssText = 'display:flex; gap:10px; justify-content:space-between; align-items:center;';
                const skipBtn = document.createElement('button');
                skipBtn.type = 'button';
                skipBtn.style.cssText = 'background:none; border:none; color:#94a3b8; font-size:0.78rem; cursor:pointer; padding:10px 4px; min-height:44px; text-decoration:underline;';
                skipBtn.onclick = () => this.skip();
                const nextBtn = document.createElement('button');
                nextBtn.type = 'button';
                nextBtn.className = 'gx-btn sm';
                nextBtn.style.cssText = 'min-height:44px; padding:0 22px;';
                nextBtn.onclick = () => this.next();
                row.appendChild(skipBtn); row.appendChild(nextBtn);
                tip.appendChild(stepLbl); tip.appendChild(title); tip.appendChild(body); tip.appendChild(row);
                root.appendChild(spot); root.appendChild(tip);
                document.body.appendChild(root);
                this._root = root; this._spot = spot; this._tip = tip; this._title = title; this._body = body; this._stepLbl = stepLbl; this._nextBtn = nextBtn; this._skipBtn = skipBtn;
            },
            render() {
                try {
                    const s = this.steps[this.step]; if (!s || !this._tip) return;
                    const vw = window.innerWidth, vh = window.innerHeight;
                    let el = document.querySelector(s.target);
                    if ((!el || el.getBoundingClientRect().width <= 0) && s.fallback) el = document.querySelector(s.fallback);
                    const r = el ? el.getBoundingClientRect() : null;
                    const spot = this._spot;
                    if (r && r.width > 0 && r.height > 0) {
                        const pad = s.pad || 12;
                        const x = Math.max(2, r.left - pad), y = Math.max(2, r.top - pad);
                        const w = Math.min(vw - 4, r.width + pad * 2), h = Math.min(vh - 4, r.height + pad * 2);
                        spot.style.display = 'block';
                        spot.style.left = x + 'px'; spot.style.top = y + 'px';
                        spot.style.width = w + 'px'; spot.style.height = h + 'px';
                        spot.style.borderRadius = s.round || '16px';
                    } else { spot.style.display = 'none'; }
                    this._stepLbl.textContent = (this.step + 1) + ' / ' + this.steps.length;
                    this._title.textContent = t(s.titleKey);
                    this._body.textContent = t(s.bodyKey);
                    const last = this.step === this.steps.length - 1;
                    this._nextBtn.textContent = last ? t('tut_finish') : t('tut_next');
                    this._skipBtn.textContent = t('tut_skip');
                    const tipW = Math.min(340, vw - 24);
                    this._tip.style.width = tipW + 'px';
                    const th = this._tip.offsetHeight || 170;
                    let tx, ty;
                    if (r && r.width > 0 && (r.bottom + 18 + th < vh || r.top - 18 - th > 0 || r.height < vh * 0.7)) {
                        tx = r.left + r.width / 2 - tipW / 2;
                        if (r.bottom + 18 + th < vh) ty = r.bottom + 18;
                        else if (r.top - 18 - th > 0) ty = r.top - 18 - th;
                        else ty = (vh - th) / 2;
                    } else { tx = (vw - tipW) / 2; ty = (vh - th) / 2; }
                    tx = Math.max(12, Math.min(tx, vw - tipW - 12));
                    ty = Math.max(12, Math.min(ty, vh - th - 12));
                    this._tip.style.left = tx + 'px';
                    this._tip.style.top = ty + 'px';
                } catch (e) { this.cleanup(); }
            },
            // Llamado por game.click ('stir') y game.buy ('buy') para avanzar al actuar.
            notify(kind) {
                try {
                    if (!this.active) return;
                    const s = this.steps[this.step];
                    if (s && s.advance === kind) this.next();
                } catch (e) {}
            },
            next() {
                try {
                    if (!this.active) return;
                    if (this.step >= this.steps.length - 1) { this.finish(true); return; }
                    this.step++;
                    this.render();
                } catch (e) { this.cleanup(); }
            },
            skip() { this.finish(false); },
            finish(reward) {
                try {
                    if (reward && this.REWARD > 0 && typeof game !== 'undefined') {
                        game.e += this.REWARD; game.te += this.REWARD;
                        try { gx.toast(t('tut_reward_toast', {eb: this.REWARD.toLocaleString()})); } catch (e) {}
                        try { game.save(); } catch (e) {}
                    }
                } catch (e) {}
                this.markDone();
                this.cleanup();
            },
            cleanup() {
                this.active = false;
                try { if (this._onResize) window.removeEventListener('resize', this._onResize); } catch (e) {}
                this._onResize = null;
                try { if (this._root && this._root.parentNode) this._root.parentNode.removeChild(this._root); } catch (e) {}
                this._root = this._spot = this._tip = this._title = this._body = this._stepLbl = this._nextBtn = this._skipBtn = null;
            }
        };
        // === AJUSTE DE CALIDAD (Tarea 2) ===
        // Controla, en caliente, el coste visual: tope de partículas, cap por frame, tope de
        // vapor, nº de wisps (vía clase q-low) e intensidad de las olas del líquido.;
})(typeof window !== 'undefined' ? window : this);
