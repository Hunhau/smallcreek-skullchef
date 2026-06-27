/* Ambient sound loops — global ambient. */

(function (global) {

    'use strict';



    global.ambient = {

            manifest: [

                { id: 'rain',  src: 'assets/audio/ambient/rain.mp3',  icon: '🌧️' },

                { id: 'fire',  src: 'assets/audio/ambient/fire.mp3',  icon: '🔥' },

                { id: 'waves', src: 'assets/audio/ambient/waves.mp3', icon: '🌊' },

                { id: 'soup',  src: 'assets/audio/ambient/soup.mp3',  icon: '🍲' }

            ],

            tracks: {}, master: 0.6, _inited: false, _saved: null,

            _c(v) { v = Number(v); return isFinite(v) ? Math.min(1, Math.max(0, v)) : 0; },

            _gameVol() {

                try {

                    if (typeof sound !== 'undefined') {

                        if (sound.muted || sound.volume <= 0) return 0;

                        return this._c(sound.volume);

                    }

                } catch (e) {}

                return 1;

            },

            _waCtx() {

                try {

                    if (typeof sound !== 'undefined' && sound._waEnsure) return sound._waEnsure();

                } catch (e) {}

                return null;

            },

            load() {

                try {

                    const raw = localStorage.getItem('soup_ambient');

                    if (raw) {

                        const d = JSON.parse(raw);

                        if (d && typeof d === 'object') {

                            if (typeof d.master === 'number' && isFinite(d.master)) this.master = this._c(d.master);

                            this._saved = (d.tracks && typeof d.tracks === 'object') ? d.tracks : {};

                        }

                    }

                } catch (e) {}

                if (!this._saved) this._saved = {};

            },

            save() {

                try {

                    const tracks = {};

                    for (const id in this.tracks) { const tr = this.tracks[id]; tracks[id] = { on: !!tr.on, vol: tr.vol }; }

                    localStorage.setItem('soup_ambient', JSON.stringify({ master: this.master, tracks }));

                } catch (e) {}

            },

            init() {

                if (this._inited) return; this._inited = true;

                this.load();

                this.manifest.forEach(def => {

                    const saved = this._saved[def.id] || {};

                    const vol = (typeof saved.vol === 'number' && isFinite(saved.vol)) ? this._c(saved.vol) : 0.6;

                    this.tracks[def.id] = { def, audio: null, on: !!saved.on, vol, avail: true, _gain: null };

                });

                try { document.addEventListener('visibilitychange', () => this.syncPlayback()); } catch (e) {}

                const evs = ['pointerdown', 'touchstart', 'keydown'];

                const h = () => { try { this.syncPlayback(); } catch (e) {} evs.forEach(ev => document.removeEventListener(ev, h)); };

                evs.forEach(ev => document.addEventListener(ev, h, { once: true, passive: true }));

            },

            _effVol(tr) { return this._c(this.master * tr.vol * this._gameVol()); },

            _wireGain(tr, a) {

                if (tr._gain || tr._waRouted === false) return;

                const ctx = this._waCtx();

                if (!ctx) return;

                try {

                    const src = ctx.createMediaElementSource(a);

                    const g = ctx.createGain();

                    g.gain.value = this._effVol(tr);

                    src.connect(g);

                    g.connect(ctx.destination);

                    tr._gain = g;

                    tr._waRouted = true;

                    try { a.volume = 1; } catch (e) {}

                } catch (e) { tr._waRouted = false; }

            },

            _applyVol(tr) {

                if (!tr) return;

                const v = this._effVol(tr);

                if (tr._gain) {

                    try { tr._gain.gain.value = v; } catch (e) {}

                } else if (tr.audio) {

                    try { tr.audio.volume = v; } catch (e) {}

                }

            },

            _applyAllVols() {

                for (const id in this.tracks) this._applyVol(this.tracks[id]);

            },

            ensureAudio(tr) {

                if (tr.audio) {

                    this._wireGain(tr, tr.audio);

                    return tr.audio;

                }

                const a = (typeof sound !== 'undefined' && sound._makeAudio) ? sound._makeAudio(tr.def.src) : new Audio(tr.def.src);

                a.loop = true;

                try { a.preload = 'none'; } catch (e) {}

                a.addEventListener('error', () => {

                    tr.avail = false; tr.on = false;

                    try { a.pause(); } catch (e) {}

                    this._render(); this.save();

                }, { passive: true });

                a.addEventListener('playing', () => { this._applyVol(tr); }, { passive: true });

                tr.audio = a;

                this._wireGain(tr, a);

                return a;

            },

            syncPlayback() {
                try {
                    if (typeof sound !== 'undefined' && sound._unlocked && sound.resumeAudioIfNeeded) {
                        sound.resumeAudioIfNeeded();
                    }
                } catch (e) {}
                const muted = (typeof sound !== 'undefined' && sound.muted);
                const hidden = (typeof document !== 'undefined' && document.hidden);
                const farmBg = (typeof farm !== 'undefined' && farm._bgSuppressed);
                let deferPlay = false;
                try {
                    deferPlay = !!(typeof game !== 'undefined' && game._mobileSummonHot && game._mobileSummonHot()
                        && typeof mobileUI !== 'undefined' && mobileUI.isPhone && mobileUI.isPhone());
                } catch (e) {}
                for (const id in this.tracks) {
                    const tr = this.tracks[id];
                    if (tr.on && tr.avail && !muted && !hidden && !farmBg && !deferPlay && this._gameVol() > 0) {

                        const a = this.ensureAudio(tr);

                        this._applyVol(tr);

                        try {

                            const p = a.play();

                            if (p && typeof p.then === 'function') p.then(() => { this._applyVol(tr); });

                            else if (p && p.catch) p.catch(() => {});

                        } catch (e) {}

                    } else if (tr.audio) {

                        try { tr.audio.pause(); } catch (e) {}

                    }

                }

            },

            toggle(id) {

                if (!this._inited) this.init();

                const tr = this.tracks[id]; if (!tr || !tr.avail) return;

                try { if (typeof sound !== 'undefined' && sound.unlock) sound.unlock(); } catch (e) {}

                tr.on = !tr.on;

                this.syncPlayback();

                this.save();

                this._render();

            },

            setTrackVol(id, v) {

                if (!this._inited) this.init();

                const tr = this.tracks[id]; if (!tr) return;

                tr.vol = this._c(v);

                try { if (typeof sound !== 'undefined' && sound._unlocked && sound.resumeAudioIfNeeded) sound.resumeAudioIfNeeded(); } catch (e) {}

                if (tr.audio) this._wireGain(tr, tr.audio);

                this._applyVol(tr);

                this.save();

            },

            setMaster(v) {

                if (!this._inited) this.init();

                this.master = this._c(v);

                try { if (typeof sound !== 'undefined' && sound._unlocked && sound.resumeAudioIfNeeded) sound.resumeAudioIfNeeded(); } catch (e) {}

                this._applyAllVols();

                this.save();

            },

            _render() {

                const list = document.getElementById('ambient-list'); if (!list) return;

                list.innerHTML = this.manifest.map(def => {

                    const tr = this.tracks[def.id]; if (!tr) return '';

                    const on = tr.on && tr.avail;

                    const dis = tr.avail ? '' : 'disabled';

                    const unavail = tr.avail ? '' : `<div class="amb-unavail">${t('ambient_unavailable')}</div>`;

                    return `<div class="amb-row ${on ? 'on' : ''}">`

                        + `<button class="amb-toggle" type="button" ${dis} onclick="ambient.toggle('${def.id}')">${(typeof scCauldronIcon !== 'undefined' ? scCauldronIcon.ambIcon(def) : def.icon)} <span>${t('amb_' + def.id)}</span><span class="amb-state">${on ? '❚❚' : '▶'}</span></button>`

                        + `<input class="amb-slider" type="range" min="0" max="100" value="${Math.round(tr.vol * 100)}" ${dis} oninput="ambient.setTrackVol('${def.id}', this.value/100)" onchange="ambient.setTrackVol('${def.id}', this.value/100)">`

                        + unavail + `</div>`;

                }).join('');

                const mv = document.getElementById('ambient-master');

                if (mv && document.activeElement !== mv) mv.value = String(Math.round(this.master * 100));

            },

            open() {
                if (!this._inited) this.init();
                const md = document.getElementById('ambient-modal');
                const finish = () => {
                    this._render();
                    try {
                        if (typeof music !== 'undefined') {
                            if (!music._inited) music.init();
                            music._render();
                        }
                    } catch (e) {}
                };
                const showModal = () => {
                    try { if (typeof sound !== 'undefined' && sound.unlock) sound.unlock(); } catch (e) {}
                    if (md) md.classList.add('open');
                };
                try {
                    if (typeof mobileUI !== 'undefined' && mobileUI.isPhone && mobileUI.isPhone()) {
                        try { mobileUI.closeAll(); } catch (e) {}
                        showModal();
                        const waitIdle = (since) => {
                            since = since || Date.now();
                            let busy = false;
                            try { busy = !!(typeof game !== 'undefined' && game._mobileSummonHot && game._mobileSummonHot()); } catch (e) {}
                            if (busy && Date.now() - since < 6000) {
                                setTimeout(() => waitIdle(since), 220);
                                return;
                            }
                            requestAnimationFrame(() => requestAnimationFrame(finish));
                        };
                        waitIdle();
                        return;
                    }
                } catch (e) {}
                try { if (typeof sound !== 'undefined' && sound.unlock) sound.unlock(); } catch (e) {}
                requestAnimationFrame(() => requestAnimationFrame(() => { finish(); if (md) md.classList.add('open'); }));
            },

            close() {
                const md = document.getElementById('ambient-modal'); if (md) md.classList.remove('open');
                try { if (typeof game !== 'undefined' && game._mPumpSummonQueue) game._mPumpSummonQueue(); } catch (e) {}
            }

        };

})(typeof window !== 'undefined' ? window : this);

