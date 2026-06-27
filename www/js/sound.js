/* Audio engine: stir, SFX, volume (build-305). */
(function (global) {
    'use strict';

const sound = {
    defs: { stir:['audio/stir1.mp3','audio/stir2.mp3'], bubble:['audio/bubble.mp3'], buy:['audio/buy.mp3'], prestige:['audio/prestige.mp3'], victory:['audio/victory.mp3'], eat:['audio/eat.mp3'], rainStart:['audio/audiorain_start.mp3'], bubblePop:['audio/audiobubble_pop.mp3'], farmAbrir:['audio/farm_abrir.mp3'], farmPlantar:['audio/farm_plantar.mp3'], farmRegar:['audio/farm_regar.mp3'], farmListo:['audio/farm_listo.mp3'], farmCosechar:['audio/farm_cosechar.mp3'], farmSinStock:['audio/farm_sin_stock.mp3'], farmPrestigio:['audio/farm_prestigio.mp3'] },
    _isNativeCap() {
        try {
            const cap = window.Capacitor;
            return !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
        } catch (e) { return false; }
    },
    _mediaUrl(src) {
        if (!src) return src;
        try {
            const abs = new URL(src, document.baseURI || location.href).href;
            const cap = window.Capacitor;
            if (cap && typeof cap.convertFileSrc === 'function') return cap.convertFileSrc(abs);
            return abs;
        } catch (e) { return src; }
    },
    _makeAudio(src) {
        const a = new Audio();
        try { a.setAttribute('playsinline', ''); a.setAttribute('webkit-playsinline', 'true'); a.playsInline = true; } catch (e) {}
        try { a.preload = this._isNativeCap() ? 'metadata' : 'auto'; } catch (e) {}
        if (src) { try { a.src = this._mediaUrl(src); } catch (e) {} }
        return a;
    },
    vols: { stir:0.3, bubble:0.25, buy:0.5, prestige:0.7, victory:0.85, eat:0.48, rainStart:0.55, bubblePop:0.30, farmAbrir:0.45, farmPlantar:0.42, farmRegar:0.4, farmListo:0.5, farmCosechar:0.48, farmSinStock:0.45, farmPrestigio:0.65, farmBonus:0.55 },
    // === SFX rapid-fire shaping (ADITIVO) ===========================
    // minGap = intervalo mínimo (ms) entre re-disparos del MISMO sonido
    //          para que el clic-ametralladora no genere un muro de copias.
    // poly   = voces simultáneas máximas por sonido; si se supera, se
    //          reutiliza la voz MÁS ANTIGUA en vez de clonar sin límite.
    // pitch  = variación sutil de playbackRate (±pitch) para que las
    //          repeticiones no hagan comb-filter y suenen orgánicas.
    // SOLO afecta al SONIDO; nunca a la lógica de compra/clic.
    cfg: {
        buy:      { minGap: 70, poly: 4, pitch: 0.04 },
        stir:     { minGap: 60, poly: 4, pitch: 0.04 },
        bubble:   { minGap: 40, poly: 3, pitch: 0.03 },
        rainStart:{ minGap: 900, poly: 1, pitch: 0.02 },
        bubblePop:{ minGap: 220, poly: 2, pitch: 0.04 },
        eat:      { minGap: 50, poly: 3, pitch: 0.06 },
        farmAbrir: { minGap: 300, poly: 1, pitch: 0 },
        farmPlantar: { minGap: 120, poly: 2, pitch: 0.03 },
        farmRegar: { minGap: 200, poly: 2, pitch: 0.03 },
        farmListo: { minGap: 800, poly: 2, pitch: 0.04 },
        farmCosechar: { minGap: 100, poly: 3, pitch: 0.04 },
        farmSinStock: { minGap: 600, poly: 1, pitch: 0 },
        farmPrestigio: { minGap: 0, poly: 1, pitch: 0 },
        farmBonus: { minGap: 200, poly: 2, pitch: 0.04 },
        _default: { minGap: 0,  poly: 3, pitch: 0 }
    },
    _last: {}, flat: {}, _farmBroken: {},
    pool: {}, voices: {}, muted:false, volume:1, _inited:false, _unlocked:false, _needReprime: false,
    _farmAmb: { audio: null, broken: false, active: false },
    _eatPreload: null, _eatEndTimer: null, _eatAudio: null, _lastEatDur: 2000,
    // Mobile web (iOS/Android browser): one-shot SFX via Web Audio so sounds triggered
    // from timers/async (farm ready, ingredient rain, eat) work without a user gesture.
    // Stir keeps its dedicated HTMLAudio loop (already gesture-started on tap).
    _waCtx: null, _waBuf: {}, _waLoading: {}, _waAmb: null, _waAmbGain: null, _waBuyPlaying: false,
    _loopUseHtmlOnly() {
        try {
            const ua = navigator.userAgent || '';
            if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
        } catch (e) {}
        return false;
    },
    _useWebAudio() {
        try {
            if (this._isNativeCap()) return false;
            if (typeof isPlayablesEnv === 'function' && isPlayablesEnv()) return false;
            const ua = navigator.userAgent || '';
            if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
            return window.matchMedia('(pointer: coarse)').matches;
        } catch (e) { return false; }
    },
    // Prod mobile, cuenta nueva: altavoz apagado hasta que el jugador lo encienda
    // (gesto explícito = iOS desbloquea audio). PC sin cambios.
    _prodMobileFreshAudio() {
        try {
            if (typeof SC_LOCAL_DEV !== 'undefined' && SC_LOCAL_DEV) return false;
            if (window.matchMedia && window.matchMedia('(pointer: fine)').matches) {
                const ua = navigator.userAgent || '';
                if (!/iPhone|iPad|iPod|Android/i.test(ua)) return false;
            }
            const ua = navigator.userAgent || '';
            if (/iPhone|iPad|iPod|Android/i.test(ua)) return true;
            return !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
        } catch (e) { return false; }
    },
    _primeMobileEssentials() {
        if (!this._useWebAudio()) return;
        const keys = ['bubble', 'buy', 'eat', 'farmAbrir', 'farmPlantar', 'farmRegar', 'farmCosechar', 'farmListo', 'farmSinStock', 'rainStart', 'bubblePop', 'prestige', 'victory'];
        for (let ki = 0; ki < keys.length; ki++) {
            const arr = this.flat[keys[ki]];
            if (arr && arr[0]) try { this._primeOne(arr[0]); } catch (e) {}
        }
        try { this._waLoadSrc('audio/stir1.mp3'); this._waLoadSrc('audio/stir2.mp3'); } catch (e) {}
    },
    _waEnsure() {
        try {
            if (!this._unlocked) return null;
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (!Ctx) return null;
            if (!this._waCtx) this._waCtx = new Ctx();
            const ctx = this._waCtx;
            if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
                try { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
            }
            return ctx;
        } catch (e) { return null; }
    },
    _waKick() {
        if (!this._unlocked) return false;
        const ctx = this._waEnsure();
        if (!ctx) return false;
        try {
            if (ctx.state === 'suspended' || ctx.state === 'interrupted') {
                try { ctx.resume(); } catch (e) {}
            }
            const dur = 0.016;
            const frames = Math.max(1, Math.ceil(ctx.sampleRate * dur));
            const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            const g = ctx.createGain();
            g.gain.value = 0.0001;
            src.connect(g);
            g.connect(ctx.destination);
            src.start(0);
            try { src.stop(dur); } catch (e) {}
            return true;
        } catch (e) { return false; }
    },
    _waLoadSrc(src) {
        const url = this._mediaUrl(src);
        if (this._waBuf[url]) return Promise.resolve(this._waBuf[url]);
        if (this._waLoading[url]) return this._waLoading[url];
        if (!this._unlocked) return Promise.resolve(null);
        const ctx = this._waEnsure();
        if (!ctx) return Promise.resolve(null);
        this._waLoading[url] = fetch(url, { cache: 'force-cache' })
            .then(r => (r && r.ok ? r.arrayBuffer() : Promise.reject(new Error('fetch'))))
            .then(ab => {
                const copy = ab.slice(0);
                const dec = ctx.decodeAudioData(copy);
                return (dec && typeof dec.then === 'function') ? dec : new Promise((res, rej) => { ctx.decodeAudioData(copy, res, rej); });
            })
            .then(buf => { this._waBuf[url] = buf; return buf; })
            .catch(() => null)
            .finally(() => { delete this._waLoading[url]; });
        return this._waLoading[url];
    },
    _waLoadAll() {
        if (!this._useWebAudio()) return;
        const pri = ['farmAbrir', 'farmPlantar', 'farmRegar', 'farmCosechar', 'farmListo', 'farmSinStock', 'farmPrestigio', 'bubble', 'buy', 'eat', 'rainStart', 'bubblePop', 'prestige', 'victory'];
        for (let i = 0; i < pri.length; i++) {
            const arr = this.defs[pri[i]];
            if (arr) arr.forEach(u => { try { this._waLoadSrc(u); } catch (e) {} });
        }
        try { this._waLoadSrc('audio/farm_ambiente.mp3'); } catch (e) {}
        for (const k in this.defs) {
            const arr = this.defs[k];
            if (arr) arr.forEach(u => { try { this._waLoadSrc(u); } catch (e) {} });
        }
    },
    _waPlayBuffer(buf, vol, rate, onEnded) {
        const ctx = this._waEnsure();
        if (!ctx || !buf) return false;
        try {
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.playbackRate.value = rate || 1;
            const g = ctx.createGain();
            g.gain.value = Math.min(1, Math.max(0, vol));
            src.connect(g); g.connect(ctx.destination);
            if (typeof onEnded === 'function') {
                src.onended = () => { try { onEnded(); } catch (e) {} };
            }
            src.start(0);
            return true;
        } catch (e) { return false; }
    },
    _waPlaySfx(name) {
        if (!this._useWebAudio()) return false;
        const grp = this.defs[name];
        if (!grp || !grp.length) return false;
        const cfg = this.cfg[name] || this.cfg._default;
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        if (name === 'buy') {
            if (this._waBuyPlaying) return true;
            if ((now - (this._last[name] || 0)) < 650) return true;
        } else {
            const minGap = cfg.minGap || 0;
            if (minGap > 0 && (now - (this._last[name] || 0)) < minGap) return true;
        }
        this._last[name] = now;
        const srcPath = grp.length > 1 ? grp[Math.floor(Math.random() * grp.length)] : grp[0];
        const url = this._mediaUrl(srcPath);
        const buf = this._waBuf[url];
        if (!buf) { try { this._waLoadSrc(srcPath); } catch (e) {} return false; }
        const vol = Math.min(1, Math.max(0, (this.vols[name] != null ? this.vols[name] : 0.5) * this.volume));
        const pitch = cfg.pitch || 0;
        const rate = (name === 'buy' || pitch <= 0) ? 1 : Math.min(2, Math.max(0.5, 1 + (Math.random() * 2 - 1) * pitch));
        const self = this;
        const onEnded = (name === 'buy') ? function () { self._waBuyPlaying = false; } : null;
        if (name === 'buy') this._waBuyPlaying = true;
        const ok = this._waPlayBuffer(buf, vol, rate, onEnded);
        if (name === 'buy' && !ok) this._waBuyPlaying = false;
        return ok;
    },
    init() {
        if (this._inited) return; this._inited = true;
        try {
            const raw = localStorage.getItem('soup_audio');
            if (raw) {
                const d = JSON.parse(raw);
                if (d && typeof d === 'object') {
                    this.muted = !!d.m;
                    if (typeof d.v === 'number' && isFinite(d.v)) this.volume = Math.min(1, Math.max(0, d.v));
                }
            } else if (this._prodMobileFreshAudio()) {
                this.muted = true;
                this.volume = 1;
                this.save();
            }
        } catch (e) {}
        // HARDENING: si un archivo de audio falta (404) o no se puede decodificar,
        // el evento 'error' del elemento NO es una excepción y NO ensucia la consola
        // con throws. Lo silenciamos explícitamente para que el juego suene "vacío"
        // pero jamás rompa. El juego funciona con CERO archivos en audio/.
        try {
            this._eatPreload = this._makeAudio('audio/eat.mp3');
            this._eatPreload.addEventListener('error', () => {}, { passive: true });
        } catch (e) { this._eatPreload = null; }
        for (const k in this.defs) { this.pool[k] = this.defs[k].map(src => { const a = this._makeAudio(src); a.addEventListener('error', () => {}, { passive: true }); return a; }); }
        // POOL de reproducción: por cada fuente se crean unas pocas instancias
        // reutilizables (round-robin) en vez de clonar un Audio nuevo en cada play().
        const VOICES_PER_SRC = 3;
        for (const k in this.defs) {
            this.voices[k] = this.defs[k].map(src => {
                const inst = [];
                for (let i = 0; i < VOICES_PER_SRC; i++) { const a = this._makeAudio(src); a.addEventListener('error', () => {}, { passive: true }); inst.push(a); }
                return { inst, idx: 0 };
            });
        }
        // Lista PLANA de todas las voces por sonido: usada para contar la
        // polifonía activa y para reutilizar la voz más antigua sin clonar.
        for (const k in this.voices) { this.flat[k] = []; this.voices[k].forEach(g => g.inst.forEach(a => this.flat[k].push(a))); }
        const v = document.getElementById('audio-vol'); if (v) v.value = String(Math.round(this.volume * 100));
        this.updateUi();
        const evs = ['pointerdown', 'touchstart', 'keydown'];
        const handler = () => { this.unlock(); evs.forEach(ev => document.removeEventListener(ev, handler)); };
        evs.forEach(ev => document.addEventListener(ev, handler, { once: true, passive: true }));
        try {
            const wake = () => { try { this.recoverFromBackground(); } catch (e) {} };
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) { try { this.suspendAll(); } catch (e) {} }
                else { this._needReprime = true; wake(); }
            }, { passive: true });
            window.addEventListener('pagehide', () => { try { this.suspendAll(); } catch (e) {} }, { passive: true });
            window.addEventListener('focus', () => { if (this._unlocked) { this._needReprime = true; wake(); } }, { passive: true });
            window.addEventListener('pageshow', () => { if (this._unlocked) { this._needReprime = true; wake(); } }, { passive: true });
            // The visibility/focus/pageshow handlers above already recover on return.
            // The gesture must NOT re-run recovery (it bubbles AFTER tap-driven SFX and
            // would re-mute/pause the pooled voices); just resume the AudioContext.
            const gestureWake = () => {
                try { this.unlock(); this.resumeAudio(); } catch (e) {}
                if (this._unlocked && this._needReprime) {
                    this._needReprime = false;
                    try { this.recoverFromBackground(); } catch (e) {}
                }
                /* Do NOT _syncBgAudio here — runs on every tap and reloads all loops (mobile freeze). */
            };
            ['pointerdown', 'touchstart'].forEach(ev => document.addEventListener(ev, gestureWake, { passive: true }));
        } catch (e) {}
    },
    // Resume any Web Audio context (eat synth) if the OS suspended/interrupted it.
    resumeAudio() {
        if (!this._unlocked) return;
        try { this._waEnsure(); } catch (e) {}
        try {
            const ctx = this._eatCtx;
            if (ctx && (ctx.state === 'suspended' || ctx.state === 'interrupted')) {
                const p = ctx.resume(); if (p && p.catch) p.catch(() => {});
            }
        } catch (e) {}
    },
    resumeAudioIfNeeded() {
        if (!this._unlocked) return;
        try {
            const wa = this._waCtx;
            if (wa && (wa.state === 'suspended' || wa.state === 'interrupted')) {
                try { const p = wa.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
            } else {
                const eat = this._eatCtx;
                if (eat && (eat.state === 'suspended' || eat.state === 'interrupted')) this.resumeAudio();
            }
        } catch (e) {}
    },
    /* Pause loops/SFX when app backgrounded or PWA swiped away (iOS ghost audio). */
    suspendAll() {
        if (!this._inited) return;
        try { this._stirStopNow(); } catch (e) {}
        try { this.stopEat(); } catch (e) {}
        try { this.farmAmbStop(); } catch (e) {}
        try {
            [this._waCtx, this._eatCtx].forEach(function (ctx) {
                if (ctx && ctx.state === 'running') { try { ctx.suspend(); } catch (e) {} }
            });
        } catch (e) {}
        try {
            if (typeof ambient !== 'undefined' && ambient.tracks) {
                for (const id in ambient.tracks) {
                    const tr = ambient.tracks[id];
                    if (tr && tr.audio) { try { tr.audio.pause(); } catch (e) {} }
                }
            }
        } catch (e) {}
        try {
            if (typeof music !== 'undefined' && music.audio) { try { music.audio.pause(); } catch (e) {} }
        } catch (e) {}
    },
    touchAudioIfOn() {
        if (this.muted || this.volume <= 0) return;
        this.touchAudio();
    },
    /* Ambient/music toggles: unlock + resume only — never _waLoadAll (freezes mobile). */
    unlockForBgLoops() {
        try {
            if (this.muted) {
                this.muted = false;
                this.save();
                this.updateUi();
            }
            if (this.volume <= 0) {
                this.volume = 1;
                this.save();
                this.updateUi();
            }
        } catch (e) {}
        try { this.unlock(); } catch (e) {}
        try { this.resumeAudioIfNeeded(); } catch (e) {}
    },
    // Re-arm audio after Play / privacy / name modals (iOS needs a fresh gesture chain).
    touchAudio() {
        try {
            this.unlock();
            this.resumeAudio();
            if (this._useWebAudio()) { try { this._waKick(); } catch (e) {} }
            if (this._stirUseWa()) {
                try { this._stirWaEnsureBus(); this._stirWaPreload(); } catch (e) {}
            }
            if (this._useWebAudio()) { try { this._waLoadAll(); } catch (e) {} }
        } catch (e) {}
        this._syncBgAudio();
    },
    // Full audio recovery after screen sleep / tab background. Re-primes EVERY pooled
    // voice (not just one per group) and resets the stir loop so the next click can
    // start sound again without restarting the game.
    recoverFromBackground() {
        if (!this._inited || this.muted || this.volume <= 0) return;
        this.resumeAudio();
        if (this._useWebAudio()) {
            try { this._waLoadAll(); if (this._stirUseWa()) this._stirWaPreload(); } catch (e) {}
            return;
        }
        // SYNC prime (mirrors unlock()): never leave a voice muted via an async
        // callback, and never pause/reset a voice that is actively playing — that was
        // silencing real SFX on mobile (the async mute window + done() clobber).
        const prime = (a) => {
            if (!a) return;
            try {
                if (!a.paused && !a.ended) return; // don't touch a voice mid-play
                a.muted = true;
                const p = a.play(); if (p && p.catch) p.catch(() => {});
                a.pause(); a.currentTime = 0; a.muted = false;
            } catch (e) { try { a.load(); a.muted = false; } catch (e2) {} }
        };
        try {
            for (const k in this.flat) {
                const arr = this.flat[k];
                if (arr) for (let i = 0; i < arr.length; i++) prime(arr[i]);
            }
            prime(this._eatPreload);
            this._stirStopNow();
        } catch (e) {}
    },
    // Legacy alias kept for any external callers.
    _reprimePool() { this.recoverFromBackground(); },
    _primeOne(a) {
        if (!a) return;
        try { a.muted = true; const p = a.play(); if (p && p.catch) p.catch(() => {}); a.pause(); a.currentTime = 0; a.muted = false; } catch (e) {}
    },
    unlock() {
        const first = !this._unlocked;
        if (first) {
            this._unlocked = true;
            try {
                // iOS WKWebView rejects mass-priming dozens of voices in one gesture.
                if (this._isNativeCap()) {
                    this._primeOne(this._makeAudio('audio/bubble.mp3'));
                    const sv = this._stirEnsure();
                    if (sv) for (let si = 0; si < sv.length; si++) this._primeOne(sv[si]);
                } else if (this._stirUseWa()) {
                    this._primeMobileEssentials();
                    try { this._waLoadSrc('audio/stir1.mp3'); this._waLoadSrc('audio/stir2.mp3'); } catch (e) {}
                } else if (!this._useWebAudio()) {
                    for (const k in this.flat) {
                        const arr = this.flat[k];
                        if (arr) for (let i = 0; i < arr.length; i++) this._primeOne(arr[i]);
                    }
                    this._primeOne(this._eatPreload);
                    const sv = this._stir.voices;
                    if (sv) for (let i = 0; i < sv.length; i++) this._primeOne(sv[i]);
                } else {
                    this._primeMobileEssentials();
                    const sv = this._stirEnsure();
                    if (sv) for (let si = 0; si < sv.length; si++) this._primeOne(sv[si]);
                }
                if (this._eatCtx && this._eatCtx.state === 'suspended') { try { this._eatCtx.resume(); } catch (e) {} }
            } catch (e) {}
        }
        try {
            if (first || this._needReprime) this.resumeAudio();
            else this.resumeAudioIfNeeded();
            if (first || this._needReprime) this._waLoadAll();
        } catch (e) {}
    },
    _syncBgAudio() {
        try { if (typeof ambient !== 'undefined' && ambient._inited) ambient.syncPlayback(); } catch (e) {}
        try { if (typeof music !== 'undefined' && music._inited) music.syncPlayback(); } catch (e) {}
    },
    save() { try { localStorage.setItem('soup_audio', JSON.stringify({ m:this.muted, v:this.volume })); } catch (e) {} },
    play(name) {
        if (this.muted || this.volume <= 0) return;
        this.unlock();
        if (name !== 'stir' && this._useWebAudio() && this._waPlaySfx(name)) return;
        const grp = this.voices[name]; if (!grp || !grp.length) return;
        const cfg = this.cfg[name] || this.cfg._default;
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        // === BUY: sonido ÚNICO, NO re-disparable ===========================
        // La compra (buy(i,ev)) se ejecuta en cada clic, pero el SONIDO debe
        // sonar UNA sola vez por reproducción: si CUALQUIER voz 'buy' sigue
        // sonando (no pausada y no terminada), se ignora el re-disparo (sin
        // reinicio, sin nueva voz, sin cola). Si no hay ninguna activa, suena
        // UNA voz completa hasta su final natural, a volumen normal (vols.buy)
        // y a rate EXACTO 1 (sin variación de tono), como la grabación limpia.
        if (name === 'buy') {
            const flatB = this.flat[name] || [];
            if (!flatB.length) return;
            let mobileCoarse = false;
            try { mobileCoarse = window.matchMedia('(pointer: coarse)').matches; } catch (e) {}
            if (mobileCoarse) {
                const minGap = 220;
                if ((now - (this._lastBuyM || 0)) < minGap) return;
                this._lastBuyM = now;
            } else {
                for (let i = 0; i < flatB.length; i++) { const v = flatB[i]; if (!v.paused && !v.ended) return; }
            }
            const a = flatB[0];
            try {
                a.muted = false;
                a.volume = Math.min(1, Math.max(0, (this.vols[name] != null ? this.vols[name] : 0.5) * this.volume));
                a.playbackRate = 1;
                a.currentTime = 0;
                a._startedAt = now;
                const p = a.play(); if (p && p.catch) p.catch(()=>{});
            } catch (e) {}
            return;
        }
        // (1) RATE LIMIT por sonido: ignora re-disparos demasiado seguidos.
        //     Solo silencia el AUDIO; la acción de juego ya ocurrió aparte.
        const minGap = cfg.minGap || 0;
        if (minGap > 0 && (now - (this._last[name] || 0)) < minGap) return;
        this._last[name] = now;
        const flat = this.flat[name] || [];
        if (!flat.length) return;
        const cap = cfg.poly || 3;
        // (2) Voces ACTIVAS (sonando ahora mismo) de este sonido.
        let active = [];
        for (let i = 0; i < flat.length; i++) { const v = flat[i]; if (!v.paused && !v.ended) active.push(v); }
        let a = null;
        if (active.length >= cap) {
            // CAP de POLIFONÍA superado: reutiliza la voz MÁS ANTIGUA en
            // lugar de apilar copias nuevas (evita la "superposición").
            a = active[0]; let oldest = a._startedAt || 0;
            for (let i = 1; i < active.length; i++) { const s = active[i]._startedAt || 0; if (s < oldest) { oldest = s; a = active[i]; } }
        } else {
            // (4) Prefiere una voz LIBRE de una variante aleatoria, así no
            //     hace falta cortar (currentTime=0) una voz que ya suena.
            const g = grp.length > 1 ? grp[Math.floor(Math.random() * grp.length)] : grp[0];
            for (let k = 0; k < g.inst.length; k++) { const cand = g.inst[(g.idx + k) % g.inst.length]; if (cand.paused || cand.ended) { a = cand; break; } }
            g.idx = (g.idx + 1) % g.inst.length;
            if (!a) { for (let i = 0; i < flat.length; i++) { if (flat[i].paused || flat[i].ended) { a = flat[i]; break; } } }
            if (!a) a = flat[0];
        }
        try {
            a.muted = false;
            a.volume = Math.min(1, Math.max(0, (this.vols[name] != null ? this.vols[name] : 0.5) * this.volume));
            // (3) Variación sutil de tono para que las repeticiones no se
            //     enfasen/comb-filtreen. Sin variación => rate exacto 1.
            const pitch = cfg.pitch || 0;
            a.playbackRate = pitch > 0 ? Math.min(2, Math.max(0.5, 1 + (Math.random() * 2 - 1) * pitch)) : 1;
            a.currentTime = 0;
            a._startedAt = now;
            const p = a.play();
            // Don't re-prime the whole pool on a failed play (that re-mutes every voice
            // and silences mobile SFX). Just flag for the next foreground recovery.
            if (p && p.catch) p.catch(() => { this._needReprime = true; });
        } catch (e) { this._needReprime = true; }
    },
    // Crunch SFX: pooled eat.mp3 (unlocked on gesture); synth fallback if play fails.
    _eatCtx: null,
    stopEat() {
        if (this._eatAudio) {
            try { this._eatAudio.onended = null; this._eatAudio.pause(); this._eatAudio.currentTime = 0; } catch (e) {}
            this._eatAudio = null;
        }
        if (this._eatEndTimer) { clearTimeout(this._eatEndTimer); this._eatEndTimer = null; }
    },
    _playEatSynth(onEnd, fallbackMs, baseVol) {
        const minMs = 1500;
        const ms = Math.max(minMs, fallbackMs);
        this._lastEatDur = ms;
        try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            if (Ctx) {
                if (!this._eatCtx) this._eatCtx = new Ctx();
                const ctx = this._eatCtx;
                if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
                const t0 = ctx.currentTime;
                for (let b = 0; b < 7; b++) {
                    const start = t0 + b * 0.055 + Math.random() * 0.022;
                    const dur = 0.04 + Math.random() * 0.035;
                    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
                    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
                    const data = buf.getChannelData(0);
                    for (let i = 0; i < len; i++) {
                        const env = Math.exp(-i / (len * 0.09));
                        data[i] = (Math.random() * 2 - 1) * env * 0.85;
                    }
                    const src = ctx.createBufferSource();
                    src.buffer = buf;
                    const gn = ctx.createGain();
                    gn.gain.setValueAtTime(0.0001, start);
                    gn.gain.exponentialRampToValueAtTime(baseVol * (0.45 + Math.random() * 0.4), start + 0.006);
                    gn.gain.exponentialRampToValueAtTime(0.0001, start + dur);
                    src.connect(gn); gn.connect(ctx.destination);
                    src.start(start);
                }
            }
        } catch (e) {}
        if (onEnd) this._eatEndTimer = setTimeout(() => { try { onEnd(); } catch (e) {} }, ms);
        return ms;
    },
    playEat(onEnd) {
        const fallbackMs = (typeof game !== 'undefined' && game.CHEF_FALLBACK_EAT_MS) || 2000;
        const minMs = 1500;
        const clampMs = (raw) => Math.max(minMs, (Number.isFinite(raw) && raw > 0) ? raw : fallbackMs);
        this.unlock();
        this.stopEat();
        if (this.muted || this.volume <= 0) {
            this._lastEatDur = minMs;
            return minMs;
        }
        const vol = Math.max(0.1, Math.min(1, (this.vols.eat != null ? this.vols.eat : 0.48) * (this.volume || 1)));
        if (this._useWebAudio()) {
            const eatSrc = (this.defs.eat && this.defs.eat[0]) ? this.defs.eat[0] : 'audio/eat.mp3';
            const url = this._mediaUrl(eatSrc);
            const buf = this._waBuf[url];
            if (buf) {
                const durMs = clampMs(buf.duration * 1000);
                this._lastEatDur = durMs;
                if (this._waPlayBuffer(buf, vol, 1) && onEnd) this._eatEndTimer = setTimeout(() => { try { onEnd(); } catch (e) {} }, durMs);
                return durMs;
            }
            try { this._waLoadSrc(eatSrc); } catch (e) {}
            return this._playEatSynth(onEnd, fallbackMs, vol);
        }
        const flat = this.flat.eat || [];
        let a = null;
        for (let i = 0; i < flat.length; i++) { const v = flat[i]; if (v.paused || v.ended) { a = v; break; } }
        if (!a && flat.length) a = flat[0];
        if (!a) return this._playEatSynth(onEnd, fallbackMs, vol);
        try {
            a.onended = onEnd ? () => { try { onEnd(); } catch (e) {} } : null;
            a.volume = vol;
            a.playbackRate = 1;
            a.currentTime = 0;
            this._eatAudio = a;
            let durMs = fallbackMs;
            const syncMeta = () => {
                const d = a.duration;
                if (Number.isFinite(d) && d > 0) durMs = clampMs(d * 1000);
                this._lastEatDur = durMs;
            };
            syncMeta();
            if (!(Number.isFinite(a.duration) && a.duration > 0)) a.addEventListener('loadedmetadata', syncMeta, { once: true });
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            this._last.eat = now;
            const p = a.play();
            if (p && p.catch) p.catch(() => this._playEatSynth(onEnd, fallbackMs, vol));
            return this._lastEatDur || durMs;
        } catch (e) {}
        return this._playEatSynth(onEnd, fallbackMs, vol);
    },
    // === STIR LOOP (sostenido, gobernado por actividad) =================
    // Móvil browser (iPhone PWA): Web Audio stir1↔stir2, una voz a la vez,
    // encadenado por onended (sin setTimeout), buffers recortados (padding MP3).
    // PC + Capacitor nativo: HTML gapless build-251 — no tocar.
    _stir: { active:false, last:0, timer:null, idx:0, voices:null, cur:null, fade:null, broken:false, _handoff:null, _fadePrev:null, _waCur:null, _waPrevNode:null, _waStirGain:null, _waStirHi:null, _waStirFilt:null, _waSources:null },
    _stirVol() { return Math.min(1, Math.max(0, (this.vols.stir != null ? this.vols.stir : 0.3) * this.volume)); },
    _stirUseWa() {
        try {
            const ua = navigator.userAgent || '';
            return /iPhone|iPad|iPod|Android/i.test(ua);
        } catch (e) { return false; }
    },
    _stirNative() {
        try { if (this._isNativeCap()) return true; } catch (e) {}
        try {
            const b = (typeof window !== 'undefined' && window.BUILD_TARGET) || '';
            if (b === 'ios' || b === 'android') return true;
        } catch (e) {}
        return false;
    },
    _stirEnsure() {
        const S = this._stir;
        if (this._stirUseWa()) return null;
        if (S.voices || S.broken) return S.voices;
        try {
            const srcs = this.defs.stir || [];
            if (!srcs.length) { S.broken = true; return null; }
            S.voices = srcs.map(src => {
                const a = this._makeAudio(src);
                try { a.preload = 'auto'; a.load(); } catch (e) {}
                a.addEventListener('error', () => { S.broken = true; }, { passive: true });
                return a;
            });
            if (this._unlocked) { S.voices.forEach(a => { try { this._primeOne(a); } catch (e) {} }); }
        } catch (e) { S.broken = true; S.voices = null; }
        return S.voices;
    },
    _stirHtmlFallbackEnsure() {
        const S = this._stir;
        if (S.voices && S.voices.length) return S.voices;
        try {
            const srcs = this.defs.stir || [];
            if (!srcs.length) return null;
            S.voices = srcs.map(src => {
                const a = this._makeAudio(src);
                try { a.preload = 'auto'; a.load(); } catch (e) {}
                return a;
            });
            if (this._unlocked) { S.voices.forEach(a => { try { this._primeOne(a); } catch (e) {} }); }
        } catch (e) { return null; }
        return S.voices;
    },
    _stirPauseHtmlVoices() {
        const S = this._stir;
        const voices = S.voices;
        if (!voices || !voices.length) return;
        const vol = this._stirVol();
        voices.forEach(v => {
            try { v.onended = null; v.loop = false; v.pause(); v.currentTime = 0; v.volume = vol; } catch (e) {}
        });
        S.cur = null;
    },
    _stirWaStop() {
        const S = this._stir;
        if (S._waSources) {
            S._waSources.forEach(n => {
                try {
                    const src = n.src || n;
                    src.onended = null;
                    src.stop();
                    src.disconnect();
                    if (n.gain) n.gain.disconnect();
                } catch (e) {}
            });
            S._waSources = null;
        }
        S._waCur = null;
        S._waPrevNode = null;
    },
    _stirWaVol() { return Math.min(1, this._stirVol() * 1.38); },
    _stirWaTrim(buf) {
        if (!buf || !Number.isFinite(buf.duration)) return { start: 0, dur: buf ? buf.duration : 0 };
        const start = 0.048;
        const endPad = 0.072;
        const dur = Math.max(0.12, buf.duration - start - endPad);
        return { start, dur };
    },
    _stirWaEnsureBus() {
        const ctx = this._waEnsure();
        const S = this._stir;
        if (!ctx || S._waStirGain) return ctx;
        try {
            const hi = ctx.createBiquadFilter();
            hi.type = 'highpass';
            hi.frequency.value = 95;
            hi.Q.value = 0.707;
            const lo = ctx.createBiquadFilter();
            lo.type = 'lowpass';
            lo.frequency.value = 2500;
            lo.Q.value = 0.45;
            const g = ctx.createGain();
            g.gain.value = this._stirVol();
            hi.connect(lo);
            lo.connect(g);
            g.connect(ctx.destination);
            S._waStirHi = hi;
            S._waStirFilt = lo;
            S._waStirGain = g;
        } catch (e) {}
        return ctx;
    },
    _stirWaPreload() {
        const paths = this.defs.stir || [];
        for (let i = 0; i < paths.length; i++) { try { this._waLoadSrc(paths[i]); } catch (e) {} }
    },
    _stirWaBegin() {
        const S = this._stir;
        S.active = true;
        S.idx = 0;
        this._stirWaPreload();
        const paths = this.defs.stir || [];
        Promise.all(paths.map(p => { try { return this._waLoadSrc(p); } catch (e) { return Promise.resolve(null); } }))
            .then(() => { if (S.active) this._stirWaPlayNext(); });
    },
    _stirWaCrossfadeOut(prevNode, startAt) {
        if (!prevNode || !prevNode.gain) return;
        try {
            const pg = prevNode.gain.gain;
            pg.cancelScheduledValues(startAt);
            pg.setValueAtTime(typeof pg.value === 'number' ? pg.value : 0, startAt);
            pg.linearRampToValueAtTime(0, startAt + 0.016);
        } catch (e) {}
        try { if (prevNode.src) { prevNode.src.onended = null; prevNode.src.stop(startAt + 0.018); } } catch (e) {}
    },
    _stirWaPlayNext() {
        const S = this._stir;
        if (!S.active) return;
        const paths = this.defs.stir || [];
        if (!paths.length) { this._stirStopNow(); return; }
        const ctx = this._stirWaEnsureBus();
        if (!ctx) { this._stirPlayNext(); return; }
        const path = paths[S.idx % paths.length];
        S.idx = (S.idx + 1) % paths.length;
        const url = this._mediaUrl(path);
        const buf = this._waBuf[url];
        if (!buf) {
            try {
                this._stirWaPreload();
                this._waLoadSrc(path).then(b => {
                    if (!S.active) return;
                    if (b) this._stirWaPlayNext();
                    else if (this._stirHtmlFallbackEnsure()) this._stirPlayNext();
                    else this._stirStopNow();
                });
            } catch (e) {
                if (this._stirHtmlFallbackEnsure()) this._stirPlayNext();
                else this._stirStopNow();
            }
            return;
        }
        this._stirPauseHtmlVoices();
        try {
            const trim = this._stirWaTrim(buf);
            const src = ctx.createBufferSource();
            src.buffer = buf;
            src.playbackRate.value = 1;
            const vol = this._stirWaVol();
            if (S._waStirGain) S._waStirGain.gain.value = vol;
            const clipGain = ctx.createGain();
            src.connect(clipGain);
            clipGain.connect(S._waStirHi || S._waStirFilt || S._waStirGain);
            const startAt = ctx.currentTime + 0.002;
            const fadeIn = 0.032;
            const fadeOut = 0.045;
            const playDur = trim.dur;
            const endAt = startAt + playDur;
            this._stirWaCrossfadeOut(S._waPrevNode, startAt);
            clipGain.gain.setValueAtTime(0, startAt);
            clipGain.gain.linearRampToValueAtTime(1, startAt + fadeIn);
            if (playDur > fadeIn + fadeOut + 0.06) {
                clipGain.gain.setValueAtTime(1, endAt - fadeOut);
                clipGain.gain.linearRampToValueAtTime(0, endAt);
            }
            src.start(startAt, trim.start, playDur);
            try { src.stop(endAt + 0.004); } catch (e) {}
            if (!S._waSources) S._waSources = [];
            const node = { src, gain: clipGain };
            S._waSources.push(node);
            S._waCur = src;
            S._waPrevNode = node;
            src.onended = () => {
                try { src.disconnect(); clipGain.disconnect(); } catch (e) {}
                if (S._waSources) {
                    const i = S._waSources.indexOf(node);
                    if (i >= 0) S._waSources.splice(i, 1);
                }
                if (S._waCur === src) S._waCur = null;
                if (S._waPrevNode === node) S._waPrevNode = null;
                if (S.active) this._stirWaPlayNext();
            };
        } catch (e) {
            if (this._stirHtmlFallbackEnsure()) this._stirPlayNext();
            else this._stirStopNow();
        }
    },
    _stirPlayNext() {
        const S = this._stir;
        if (!S.active) return;
        const voices = S.voices;
        if (!voices || !voices.length) { this._stirStopNow(); return; }
        if (S._handoff) { clearTimeout(S._handoff); S._handoff = null; }
        if (S._fadePrev) { clearTimeout(S._fadePrev); S._fadePrev = null; }
        const native = this._stirNative();
        const prev = S.cur;
        const a = voices[S.idx % voices.length];
        S.idx = (S.idx + 1) % voices.length;
        S.cur = a;
        let advanced = false;
        const advance = () => { if (advanced) return; advanced = true; if (this._stir.active) this._stirPlayNext(); };
        try {
            a.onended = null;
            a.volume = this._stirVol();
            a.playbackRate = native ? 1 : Math.min(2, Math.max(0.5, 1 + (Math.random() * 2 - 1) * 0.03));
            a.currentTime = 0;
            a.onended = advance;
            const p = a.play(); if (p && p.catch) p.catch(() => {});
            const arm = () => {
                const dur = a.duration;
                if (!Number.isFinite(dur) || dur <= 0) return;
                const lead = native ? Math.min(0.065, Math.max(0.03, dur * 0.07)) : Math.min(0.14, dur * 0.16);
                const ms = Math.max(16, ((dur - lead) * 1000) / (a.playbackRate || 1));
                if (S._handoff) clearTimeout(S._handoff);
                S._handoff = setTimeout(advance, ms);
            };
            if (Number.isFinite(a.duration) && a.duration > 0) arm();
            else a.addEventListener('loadedmetadata', arm, { once: true });
            if (prev && prev !== a && !prev.paused) {
                try {
                    const vol = this._stirVol();
                    prev.volume = vol * (native ? 0.12 : 0.35);
                    S._fadePrev = setTimeout(() => {
                        try {
                            if (prev !== S.cur) { prev.onended = null; prev.pause(); prev.currentTime = 0; prev.volume = vol; }
                        } catch (e) {}
                        S._fadePrev = null;
                    }, native ? 85 : 120);
                } catch (e) {}
            }
        } catch (e) { this._stirStopNow(); }
    },
    stirPulse() {
        if (this.muted || this.volume <= 0) return;
        const S = this._stir;
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        S.last = now;
        if (this._stirUseWa()) {
            if (!this._unlocked) this.unlock();
            else this.resumeAudioIfNeeded();
            if (S.broken) S.broken = false;
            try { this._waKick(); } catch (e) {}
            this._stirWaEnsureBus();
            if (S.fade) {
                clearInterval(S.fade); S.fade = null;
                if (S._waStirGain) { try { S._waStirGain.gain.value = this._stirWaVol(); } catch (e) {} }
            }
            if (S._waStirGain && S.active) { try { S._waStirGain.gain.value = this._stirWaVol(); } catch (e) {} }
            if (!S.active) {
                this._stirWaBegin();
                if (!S.timer) S.timer = setInterval(() => this._stirWatch(), 130);
            }
            return;
        }
        if (S.broken) return;
        // PC + Capacitor nativo: camino HTML build-251 (stir1↔stir2 gapless) — no tocar.
        this.unlock();
        const voices = this._stirEnsure();
        if (!voices) return;
        if (S.fade) { clearInterval(S.fade); S.fade = null; if (S.cur) { try { S.cur.volume = this._stirVol(); } catch (e) {} } }
        if (!S.active) {
            S.active = true; S.idx = 0;
            this._stirPlayNext();
            if (!S.timer) S.timer = setInterval(() => this._stirWatch(), 130);
        }
    },
    _stirWatch() {
        const S = this._stir;
        if (!S.active) { if (S.timer) { clearInterval(S.timer); S.timer = null; } return; }
        const hidden = (typeof document !== 'undefined' && document.hidden);
        if (this.muted || this.volume <= 0 || hidden) { this._stirStopNow(); return; }
        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const IDLE_MS = 700;
        if ((now - S.last) > IDLE_MS && !S.fade) this._stirFadeOut();
    },
    _stirFadeOut() {
        const S = this._stir;
        if (S._waStirGain) {
            const g = S._waStirGain;
            const start = (typeof g.gain.value === 'number') ? g.gain.value : this._stirVol();
            const steps = 9; let i = 0;
            if (S.fade) clearInterval(S.fade);
            S.fade = setInterval(() => {
                i++;
                try { g.gain.value = Math.max(0, start * (1 - i / steps)); } catch (e) {}
                if (i >= steps) { clearInterval(S.fade); S.fade = null; this._stirStopNow(); }
            }, 20);
            return;
        }
        const a = S.cur;
        if (!a) { this._stirStopNow(); return; }
        const start = (typeof a.volume === 'number') ? a.volume : this._stirVol();
        const steps = 9; let i = 0;
        if (S.fade) clearInterval(S.fade);
        S.fade = setInterval(() => {
            i++;
            try { a.volume = Math.max(0, start * (1 - i / steps)); } catch (e) {}
            if (i >= steps) { clearInterval(S.fade); S.fade = null; this._stirStopNow(); }
        }, 20);
    },
    _stirStopNow() {
        const S = this._stir;
        S.active = false;
        if (S.timer) { clearInterval(S.timer); S.timer = null; }
        if (S.fade) { clearInterval(S.fade); S.fade = null; }
        if (S._handoff) { clearTimeout(S._handoff); S._handoff = null; }
        if (S._fadePrev) { clearTimeout(S._fadePrev); S._fadePrev = null; }
        this._stirWaStop();
        const voices = S.voices;
        if (voices) voices.forEach(a => { try { a.onended = null; a.pause(); a.currentTime = 0; a.volume = this._stirVol(); } catch (e) {} });
        S.cur = null; S.idx = 0;
    },
    playFarm(name, fallback) {
        if (this.muted || this.volume <= 0) return;
        this.unlock();
        if (this._farmBroken[name]) { if (fallback) this.play(fallback); return; }
        const flat = this.flat[name];
        if (!flat || !flat.length) { if (fallback) this.play(fallback); return; }
        this.play(name);
    },
    _farmAmbVol() { return Math.min(1, Math.max(0, 0.22 * this.volume)); },
    farmAmbStart() {
        if (this.muted || this.volume <= 0) return;
        const F = this._farmAmb;
        if (F.active) return;
        this.unlock();
        if (this._useWebAudio()) {
            const ctx = this._waEnsure();
            const url = this._mediaUrl('audio/farm_ambiente.mp3');
            const buf = this._waBuf[url];
            if (ctx && buf) {
                try {
                    if (this._waAmb) { try { this._waAmb.stop(); } catch (e) {} this._waAmb = null; }
                    const src = ctx.createBufferSource();
                    src.buffer = buf;
                    src.loop = true;
                    const g = ctx.createGain();
                    g.gain.value = this._farmAmbVol();
                    src.connect(g); g.connect(ctx.destination);
                    src.start(0);
                    this._waAmb = src;
                    this._waAmbGain = g;
                    F.active = true;
                    F.broken = false;
                    return;
                } catch (e) {}
            } else { try { this._waLoadSrc('audio/farm_ambiente.mp3'); } catch (e2) {} }
        }
        if (F.broken) return;
        try {
            if (!F.audio) {
                F.audio = this._makeAudio('audio/farm_ambiente.mp3');
                F.audio.loop = true;
                F.audio.preload = 'auto';
                F.audio.addEventListener('error', () => { F.broken = true; this.farmAmbStop(); }, { passive: true });
            }
            if (F.broken) return;
            F.audio.volume = this._farmAmbVol();
            F.active = true;
            const p = F.audio.play();
            if (p && p.catch) p.catch(() => { F.broken = true; F.active = false; });
        } catch (e) { F.broken = true; F.active = false; }
    },
    farmAmbStop() {
        const F = this._farmAmb;
        F.active = false;
        if (this._waAmb) { try { this._waAmb.stop(); } catch (e) {} this._waAmb = null; this._waAmbGain = null; }
        if (!F.audio) return;
        try { F.audio.pause(); F.audio.currentTime = 0; } catch (e) {}
    },
    setMuted(m) {
        const wasOff = this.muted || this.volume <= 0;
        this.muted = !!m;
        if (wasOff && !this.muted && this.volume > 0) {
            try { this.touchAudio(); } catch (e) {}
        }
        if (this.muted) { try { this._stirStopNow(); } catch (e) {} try { this.farmAmbStop(); } catch (e) {} }
        this.save(); this.updateUi();
        this._syncBgAudio();
    },
    toggleMute() { this.setMuted(!this.muted); },
    setVolume(val) {
        const n = Number(val);
        const wasOff = this.muted || this.volume <= 0;
        this.volume = isFinite(n) ? Math.min(1, Math.max(0, n)) : this.volume;
        if (this.volume > 0 && this.muted) this.muted = false;
        if (wasOff && this.volume > 0 && !this.muted) {
            try { this.touchAudio(); } catch (e) {}
        }
        if (this._waAmbGain) { try { this._waAmbGain.gain.value = this._farmAmbVol(); } catch (e) {} }
        const F = this._farmAmb;
        if (F.audio && F.active) { try { F.audio.volume = this._farmAmbVol(); } catch (e) {} }
        const S = this._stir;
        if (S.active) {
            if (S.cur) { try { S.cur.volume = this._stirVol(); } catch (e) {} }
            if (S._waStirGain) { try { S._waStirGain.gain.value = this._stirUseWa() ? this._stirWaVol() : this._stirVol(); } catch (e) {} }
        }
        this.save(); this.updateUi();
        this._syncBgAudio();
    },
    updateUi() {
        const c = document.getElementById('audio-ctrl'), b = document.getElementById('audio-mute'), v = document.getElementById('audio-vol');
        if (b) b.innerText = (this.muted || this.volume <= 0) ? '🔇' : '🔊';
        if (c) c.classList.toggle('muted', this.muted || this.volume <= 0);
        if (v && document.activeElement !== v) v.value = String(Math.round(this.volume * 100));
        if (typeof home !== 'undefined' && home.syncAudio) home.syncAudio();
        if (typeof pauseMenu !== 'undefined' && pauseMenu.syncAudio) pauseMenu.syncAudio();
    }
};
    global.sound = sound;
})(typeof window !== 'undefined' ? window : this);
