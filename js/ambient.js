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

                this._bindUi();

            },

            _bindUi() {

                if (this._uiBound) return;

                this._uiBound = true;

                const list = document.getElementById('ambient-list');

                if (list) {

                    const onSl = (e) => {

                        const sl = e.target.closest('.amb-slider[data-track]');

                        if (sl) this.setTrackVol(sl.dataset.track, Number(sl.value) / 100);

                    };

                    list.addEventListener('input', onSl, { passive: true });

                    list.addEventListener('change', onSl, { passive: true });

                    const busyOn = () => { this._sliderBusy = true; };

                    const busyOff = () => { this._sliderBusy = false; };

                    list.addEventListener('touchstart', busyOn, { passive: true, capture: true });

                    list.addEventListener('touchend', busyOff, { passive: true, capture: true });

                    list.addEventListener('touchcancel', busyOff, { passive: true, capture: true });

                }

                const mv = document.getElementById('ambient-master');

                if (mv) {

                    const onM = () => this.setMaster(Number(mv.value) / 100);

                    mv.addEventListener('input', onM, { passive: true });

                    mv.addEventListener('change', onM, { passive: true });

                }

            },

            _refreshI18n() {

                for (const def of this.manifest) {

                    const row = document.querySelector('#ambient-list .amb-row[data-id="' + def.id + '"]');

                    if (!row) continue;

                    const label = row.querySelector('.amb-toggle span');

                    if (label) label.textContent = t('amb_' + def.id);

                    const st = row.querySelector('.amb-state');

                    const tr = this.tracks[def.id];

                    const on = tr && tr.on && tr.avail;

                    if (st) st.textContent = on ? '❚❚' : '▶';

                }

            },

            _patchRow(id) {

                const tr = this.tracks[id]; if (!tr) return;

                const row = document.querySelector('#ambient-list .amb-row[data-id="' + id + '"]');

                if (!row) { this._render(); return; }

                const on = tr.on && tr.avail;

                row.classList.toggle('on', !!on);

                const st = row.querySelector('.amb-state');

                if (st) st.textContent = on ? '❚❚' : '▶';

            },

            _effVol(tr) { return this._c(this.master * tr.vol * this._gameVol()); },

            _htmlLoops() {
                try { return !!(typeof sound !== 'undefined' && sound._loopUseHtmlOnly && sound._loopUseHtmlOnly()); } catch (e) { return false; }
            },

            _healLoopAudio(tr) {
                if (!tr || !this._htmlLoops()) return;
                if (tr._waRouted === 'html' && !tr._gain) return;
                const wasPlaying = tr.audio && !tr.audio.paused;
                try { if (tr.audio) { tr.audio.pause(); tr.audio.removeAttribute('src'); tr.audio.load(); } } catch (e) {}
                tr.audio = null;
                tr._gain = null;
                tr._waRouted = 'html';
                if (wasPlaying && tr.on) {
                    const a = this.ensureAudio(tr);
                    this._applyVol(tr);
                    this._playLoop(a);
                }
            },

            _healAllLoopAudio() {
                for (const id in this.tracks) this._healLoopAudio(this.tracks[id]);
            },

            _wireGain(tr, a) {

                if (this._htmlLoops()) {
                    tr._gain = null;
                    tr._waRouted = 'html';
                    return;
                }

                if (tr._gain || tr._waRouted === 'html') return;

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

                try {
                    if (typeof sound !== 'undefined' && sound._loopUseHtmlOnly && sound._loopUseHtmlOnly()) {
                        a.preload = 'metadata';
                    }
                } catch (e) {}

                a.addEventListener('error', () => {

                    tr.avail = false; tr.on = false;

                    try { a.pause(); } catch (e) {}

                    this._render(); this.save();

                }, { passive: true });

                a.addEventListener('playing', () => { this._applyVol(tr); }, { passive: true });

                tr.audio = a;

                if (this._htmlLoops()) {
                    tr._gain = null;
                    tr._waRouted = 'html';
                } else {
                    this._wireGain(tr, a);
                }

                this._applyVol(tr);

                return a;

            },

            _playLoop(a) {
                if (!a) return;
                if (!a.paused && !a.ended && a.currentTime > 0) return;
                const start = () => {
                    try {
                        const p = a.play();
                        if (p && typeof p.catch === 'function') p.catch(() => {});
                    } catch (e) {}
                };
                if (a.readyState >= 2) { start(); return; }
                if (a._scBgLoad) return;
                a._scBgLoad = true;
                const done = () => { a._scBgLoad = false; start(); };
                a.addEventListener('canplay', done, { once: true });
                a.addEventListener('error', () => { a._scBgLoad = false; }, { once: true });
                try { a.load(); } catch (e) { a._scBgLoad = false; start(); }
            },

            _canPlayBg() {
                try {
                    if (typeof sound !== 'undefined') {
                        if (sound.muted || sound.volume <= 0) return false;
                    }
                } catch (e) {}
                if (typeof document !== 'undefined' && document.hidden) return false;
                try { if (typeof farm !== 'undefined' && farm._bgSuppressed) return false; } catch (e) {}
                return this._gameVol() > 0;
            },

            _startTrack(id) {
                const tr = this.tracks[id];
                if (!tr || !tr.on || !tr.avail || !this._canPlayBg()) return;
                const a = this.ensureAudio(tr);
                this._applyVol(tr);
                this._playLoop(a);
            },

            _modalOpen() {
                try {
                    const md = document.getElementById('ambient-modal');
                    return !!(md && md.classList.contains('open'));
                } catch (e) { return false; }
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
                for (const id in this.tracks) {
                    const tr = this.tracks[id];
                    const want = tr.on && tr.avail && !muted && !hidden && !farmBg && this._gameVol() > 0;
                    if (want) {
                        const a = this.ensureAudio(tr);
                        this._applyVol(tr);
                        this._playLoop(a);
                    } else if (tr.audio) {
                        try { tr.audio.pause(); } catch (e) {}
                    }
                }

            },

            _gestureUnmute() {

                try {

                    if (typeof sound === 'undefined') return;

                    if (sound.unlockForBgLoops) sound.unlockForBgLoops();

                    else if (sound.unlock) sound.unlock();

                } catch (e) {}

            },

            toggle(id) {

                if (!this._inited) this.init();

                const tr = this.tracks[id]; if (!tr || !tr.avail) return;

                const turningOn = !tr.on;

                tr.on = !tr.on;

                if (turningOn) {
                    try {
                        if (typeof mobileUI !== 'undefined' && mobileUI.isPhone && mobileUI.isPhone()) {
                            for (const oid in this.tracks) {
                                if (oid !== id && this.tracks[oid].on) {
                                    this.tracks[oid].on = false;
                                    if (this.tracks[oid].audio) { try { this.tracks[oid].audio.pause(); } catch (e) {} }
                                }
                            }
                        }
                    } catch (e) {}
                    this._gestureUnmute();
                    requestAnimationFrame(() => { try { this._startTrack(id); } catch (e) {} });
                } else {
                    if (tr.audio) { try { tr.audio.pause(); } catch (e) {} }
                }

                this.save();

                this._patchRow(id);

            },

            setTrackVol(id, v) {

                if (!this._inited) this.init();

                const tr = this.tracks[id]; if (!tr) return;

                tr.vol = this._c(v);

                if (this._htmlLoops()) this._healLoopAudio(tr);

                this._applyVol(tr);

                this._syncTrackSlider(id);

                this.save();

            },

            bumpTrackVol(id, delta) {

                const tr = this.tracks[id]; if (!tr) return;

                this.setTrackVol(id, tr.vol + Number(delta));

            },

            _syncTrackSlider(id) {

                const tr = this.tracks[id]; if (!tr) return;

                const sl = document.querySelector('#ambient-list .amb-slider[data-track="' + id + '"]');

                if (sl && document.activeElement !== sl) sl.value = String(Math.round(tr.vol * 100));

            },

            setMaster(v) {

                if (!this._inited) this.init();

                this.master = this._c(v);

                if (this._htmlLoops()) this._healAllLoopAudio();

                this._applyAllVols();

                const mv = document.getElementById('ambient-master');

                if (mv && document.activeElement !== mv) mv.value = String(Math.round(this.master * 100));

                this.save();

            },

            bumpMaster(delta) {

                this.setMaster(this.master + Number(delta));

            },

            _render() {

                if (this._sliderBusy) return;

                const list = document.getElementById('ambient-list'); if (!list) return;

                list.innerHTML = this.manifest.map(def => {

                    const tr = this.tracks[def.id]; if (!tr) return '';

                    const on = tr.on && tr.avail;

                    const dis = tr.avail ? '' : 'disabled';

                    const unavail = tr.avail ? '' : `<div class="amb-unavail">${t('ambient_unavailable')}</div>`;

                    return `<div class="amb-row ${on ? 'on' : ''}" data-id="${def.id}">`

                        + `<button class="amb-toggle" type="button" ${dis} onclick="ambient.toggle('${def.id}')">${(typeof scCauldronIcon !== 'undefined' ? scCauldronIcon.ambIcon(def) : def.icon)} <span>${t('amb_' + def.id)}</span><span class="amb-state">${on ? '❚❚' : '▶'}</span></button>`

                        + `<div class="amb-vol-row"><button type="button" class="vol-step" ${dis} onclick="ambient.bumpTrackVol('${def.id}',-0.05)">−</button>`

                        + `<input class="amb-slider" type="range" min="0" max="100" value="${Math.round(tr.vol * 100)}" data-track="${def.id}" ${dis} oninput="ambient.setTrackVol('${def.id}', Number(this.value)/100)" onchange="ambient.setTrackVol('${def.id}', Number(this.value)/100)">`

                        + `<button type="button" class="vol-step" ${dis} onclick="ambient.bumpTrackVol('${def.id}',0.05)">+</button></div>`

                        + unavail + `</div>`;

                }).join('');

                const mv = document.getElementById('ambient-master');

                if (mv && document.activeElement !== mv) mv.value = String(Math.round(this.master * 100));

            },

            open() {
                if (!this._inited) this.init();
                const md = document.getElementById('ambient-modal');
                try {
                    if (typeof mobileUI !== 'undefined' && mobileUI.isPhone && mobileUI.isPhone()) {
                        try { mobileUI.closeAll(); } catch (e) {}
                    }
                } catch (e) {}
                try {
                    if (typeof sound !== 'undefined' && sound.unlockForBgLoops) sound.unlockForBgLoops();
                } catch (e) {}
                if (md) md.classList.add('open');
                this._healAllLoopAudio();
                this._bindUi();
                this._render();
                try {
                    if (typeof music !== 'undefined') {
                        if (!music._inited) music.init();
                        music._healLoopAudio();
                        music._render();
                    }
                } catch (e) {}
            },

            close() {
                const md = document.getElementById('ambient-modal'); if (md) md.classList.remove('open');
                try {
                    if (typeof game !== 'undefined' && game._mSummonQueue && game._mSummonQueue.length > 0) {
                        requestAnimationFrame(() => { try { game._mPumpSummonQueue(); } catch (e) {} });
                    }
                } catch (e) {}
            }

        };

})(typeof window !== 'undefined' ? window : this);

