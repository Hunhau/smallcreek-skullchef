/* Music playlist — global music, MUSIC_PLAYLIST. */

(function (global) {

    'use strict';



    const MUSIC_PLAYLIST = [

            { file: 'assets/audio/ambient/dios.mp3', title_en: 'Dios', title_es: 'Dios' }

        ];



    global.MUSIC_PLAYLIST = MUSIC_PLAYLIST;



    global.music = {

            playlist: MUSIC_PLAYLIST,

            audio: null, idx: 0, on: false, vol: 0.6, avail: true, _inited: false, _missing: {},

            _gain: null, _waRouted: null,

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

            _outVol() { return this._c(this.vol * this._gameVol()); },

            load() {

                try {

                    const raw = localStorage.getItem('soup_music');

                    if (raw) {

                        const d = JSON.parse(raw);

                        if (d && typeof d === 'object') {

                            if (typeof d.vol === 'number' && isFinite(d.vol)) this.vol = this._c(d.vol);

                            if (typeof d.idx === 'number' && isFinite(d.idx)) this.idx = d.idx | 0;

                            this.on = !!d.on;

                        }

                    }

                } catch (e) {}

            },

            save() {

                try { localStorage.setItem('soup_music', JSON.stringify({ on: !!this.on, vol: this.vol, idx: this.idx })); } catch (e) {}

            },

            init() {

                if (this._inited) return; this._inited = true;

                this.load();

                if (!this.playlist.length) this.avail = false;

                if (!(this.idx >= 0 && this.idx < this.playlist.length)) this.idx = 0;

                try { document.addEventListener('visibilitychange', () => this.syncPlayback()); } catch (e) {}

                if (this.on && this.avail) {

                    const evs = ['pointerdown', 'touchstart', 'keydown'];

                    const h = () => { try { this.syncPlayback(); } catch (e) {} evs.forEach(ev => document.removeEventListener(ev, h)); };

                    evs.forEach(ev => document.addEventListener(ev, h, { once: true, passive: true }));

                }

            },

            _wireGain(a) {

                if (this._gain || this._waRouted === false) return;

                const ctx = this._waCtx();

                if (!ctx || !a) return;

                try {

                    const src = ctx.createMediaElementSource(a);

                    const g = ctx.createGain();

                    g.gain.value = this._outVol();

                    src.connect(g);

                    g.connect(ctx.destination);

                    this._gain = g;

                    this._waRouted = true;

                    try { a.volume = 1; } catch (e) {}

                } catch (e) { this._waRouted = false; }

            },

            _applyVol() {

                const v = this._outVol();

                if (this._gain) {

                    try { this._gain.gain.value = v; } catch (e) {}

                } else if (this.audio) {

                    try { this.audio.volume = v; } catch (e) {}

                }

            },

            ensureAudio() {

                if (this.audio) {

                    this._wireGain(this.audio);

                    return this.audio;

                }

                const a = (typeof sound !== 'undefined' && sound._makeAudio) ? sound._makeAudio() : new Audio();

                try { a.preload = 'none'; } catch (e) {}

                a.addEventListener('ended', () => { this.next(); }, { passive: true });

                a.addEventListener('error', () => {

                    this._missing[this.idx] = true;

                    this._skipMissing();

                }, { passive: true });

                a.addEventListener('playing', () => { this._applyVol(); }, { passive: true });

                this.audio = a;

                this._applySrc();

                this._wireGain(a);

                return a;

            },

            _applySrc() {

                if (!this.audio) return;

                const tr = this.playlist[this.idx];

                if (!tr || !tr.file) return;

                if (this.audio.getAttribute('src') !== tr.file) {

                    try { this.audio.src = (typeof sound !== 'undefined' && sound._mediaUrl) ? sound._mediaUrl(tr.file) : tr.file; } catch (e) {}

                }

            },

            _allMissing() {

                if (!this.playlist.length) return true;

                for (let i = 0; i < this.playlist.length; i++) { if (!this._missing[i]) return false; }

                return true;

            },

            _disable() {

                this.avail = false; this.on = false;

                if (this.audio) { try { this.audio.pause(); } catch (e) {} }

                this.save(); this._render();

            },

            _skipMissing() {

                if (this._allMissing()) { this._disable(); return; }

                const n = this.playlist.length; let i = this.idx;

                for (let k = 0; k < n; k++) { i = (i + 1) % n; if (!this._missing[i]) break; }

                this.idx = i;

                this._applySrc();

                if (this.on) { try { if (this.audio) this.audio.currentTime = 0; } catch (e) {} this.syncPlayback(); }

                this.save(); this._render();

            },

            _title() {

                const tr = this.playlist[this.idx]; if (!tr) return '';

                const es = (typeof LANG !== 'undefined' && LANG === 'es');

                return (es ? (tr.title_es || tr.title_en) : (tr.title_en || tr.title_es)) || '';

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
                if (this.on && this.avail && !muted && !hidden && !farmBg && !deferPlay && this._gameVol() > 0) {

                    const a = this.ensureAudio();

                    this._applyVol();

                    try {

                        const p = a.play();

                        if (p && typeof p.then === 'function') p.then(() => { this._applyVol(); });

                        else if (p && p.catch) p.catch(() => {});

                    } catch (e) {}

                } else if (this.audio) {

                    try { this.audio.pause(); } catch (e) {}

                }

            },

            toggle() {

                if (!this._inited) this.init();

                if (!this.avail) return;

                try { if (typeof sound !== 'undefined' && sound.unlock) sound.unlock(); } catch (e) {}

                this.on = !this.on;

                this.syncPlayback();

                this.save(); this._render();

            },

            _step(dir) {

                if (!this._inited) this.init();

                if (!this.avail || !this.playlist.length) return;

                const n = this.playlist.length; let i = this.idx;

                for (let k = 0; k < n; k++) { i = (i + dir + n) % n; if (!this._missing[i]) break; }

                this.idx = i;

                this._applySrc();

                if (this.on && this.audio) { try { this.audio.currentTime = 0; } catch (e) {} this.syncPlayback(); }

                this.save(); this._render();

            },

            next() { this._step(1); },

            prev() { this._step(-1); },

            setVol(v) {

                if (!this._inited) this.init();

                this.vol = this._c(v);

                try { if (typeof sound !== 'undefined' && sound._unlocked && sound.resumeAudioIfNeeded) sound.resumeAudioIfNeeded(); } catch (e) {}

                if (this.audio) this._wireGain(this.audio);

                this._applyVol();

                this.save();

            },

            _render() {

                const sec = document.getElementById('music-sec'); if (!sec) return;

                const has = this.avail && this.playlist.length > 0;

                const noneEl = document.getElementById('music-none');

                const ctrls = document.getElementById('music-ctrls');

                const titleEl = document.getElementById('music-track');

                const playBtn = document.getElementById('music-play');

                const prevBtn = document.getElementById('music-prev');

                const nextBtn = document.getElementById('music-next');

                const vol = document.getElementById('music-vol');

                if (noneEl) noneEl.style.display = has ? 'none' : '';

                if (ctrls) ctrls.style.display = has ? '' : 'none';

                if (titleEl) titleEl.textContent = has ? this._title() : '';

                if (playBtn) { playBtn.textContent = this.on ? '❚❚' : '▶'; playBtn.title = t(this.on ? 'music_pause' : 'music_play'); playBtn.disabled = !has; }

                if (prevBtn) prevBtn.disabled = !has;

                if (nextBtn) nextBtn.disabled = !has;

                if (vol && document.activeElement !== vol) vol.value = String(Math.round(this.vol * 100));

            }

        };

})(typeof window !== 'undefined' ? window : this);

