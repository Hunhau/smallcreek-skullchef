/* YouTube Playables SDK — defensive integration (no-op outside Playables). */
(function (global) {
    'use strict';

    global.ytPlayables = {
        _sdk: null,
        _firstFrameSent: false, _firstFramePending: false,
        _gameReadySent: false, _gameReadyPending: false,
        _loadDone: false, _loadPromise: null,
        _hostPaused: false,
        _isStandalone() {
            try {
                if (typeof isPlayablesEnv === 'function' && isPlayablesEnv()) return false;
                if (location.protocol === 'file:') return true;
                const h = (location.hostname || '').toLowerCase();
                if (!h || h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h.endsWith('.local')) return true;
                if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h)) return true;
                if (/\.trycloudflare\.com$/i.test(h)) return true;
            } catch (e) { return true; }
            return false;
        },
        _detect() {
            try {
                if (typeof window !== 'undefined' && window.ytgame && window.ytgame.IN_PLAYABLES_ENV) {
                    this._sdk = window.ytgame;
                    return true;
                }
            } catch (e) {}
            this._sdk = null;
            return false;
        },
        get available() {
            try { return !!(this._sdk && this._sdk.IN_PLAYABLES_ENV); } catch (e) { return false; }
        },
        init() {
            if (this._detect()) { this._wireSystem(); this._onReady(); return; }
            if (this._isStandalone()) return;
            try {
                const s = document.createElement('script');
                s.src = 'https://www.youtube.com/game_api/v1';
                s.async = true;
                s.onload = () => { if (this._detect()) { this._wireSystem(); this._onReady(); } };
                s.onerror = () => {};
                (document.head || document.documentElement).appendChild(s);
            } catch (e) {}
        },
        _wireSystem() {
            if (!this._sdk || !this._sdk.system || this._systemWired) return;
            this._systemWired = true;
            const sys = this._sdk.system;
            try {
                if (typeof sys.isAudioEnabled === 'function') {
                    const en = sys.isAudioEnabled();
                    if (!en && typeof sound !== 'undefined') { sound.muted = true; try { sound.updateUi(); } catch (e) {} }
                }
            } catch (e) {}
            try {
                if (typeof sys.onAudioEnabledChange === 'function') {
                    sys.onAudioEnabledChange((en) => {
                        try {
                            if (typeof sound === 'undefined') return;
                            sound.muted = !en;
                            sound.updateUi();
                            if (en) sound.recoverFromBackground();
                            else sound._stirStopNow();
                        } catch (e) {}
                    });
                }
            } catch (e) {}
            try {
                if (typeof sys.onPause === 'function') {
                    sys.onPause(() => {
                        this._hostPaused = true;
                        try { if (typeof game !== 'undefined') game.save(); } catch (e) {}
                        try { if (typeof sound !== 'undefined') sound._stirStopNow(); } catch (e) {}
                        try { if (typeof music !== 'undefined') music.syncPlayback(); } catch (e) {}
                        try { if (typeof ambient !== 'undefined') ambient.syncPlayback(); } catch (e) {}
                    });
                }
            } catch (e) {}
            try {
                if (typeof sys.onResume === 'function') {
                    sys.onResume(() => {
                        this._hostPaused = false;
                        try { if (typeof sound !== 'undefined') sound.recoverFromBackground(); } catch (e) {}
                        try { if (typeof music !== 'undefined') music.syncPlayback(); } catch (e) {}
                        try { if (typeof ambient !== 'undefined') ambient.syncPlayback(); } catch (e) {}
                    });
                }
            } catch (e) {}
            try {
                if (typeof sys.getLanguage === 'function') {
                    sys.getLanguage().then((tag) => {
                        const lang = (tag && String(tag).toLowerCase().indexOf('es') === 0) ? 'es' : 'en';
                        if (typeof setLang === 'function' && lang !== LANG) setLang(lang);
                    }).catch(() => {});
                }
            } catch (e) {}
        },
        _onReady() {
            if (this._firstFramePending) this.firstFrameReady();
            if (this._gameReadyPending) this.gameReady();
        },
        firstFrameReady() {
            if (this._firstFrameSent) return;
            if (!this._sdk) { this._firstFramePending = true; return; }
            this._firstFrameSent = true;
            try { if (this._sdk.game && typeof this._sdk.game.firstFrameReady === 'function') this._sdk.game.firstFrameReady(); } catch (e) {}
        },
        gameReady() {
            if (this._gameReadySent) return;
            if (!this._sdk) { this._gameReadyPending = true; return; }
            this._gameReadySent = true;
            try { if (this._sdk.game && typeof this._sdk.game.gameReady === 'function') this._sdk.game.gameReady(); } catch (e) {}
        },
        async loadData() {
            if (!this._sdk) return null;
            if (this._loadPromise) return this._loadPromise;
            const self = this;
            this._loadPromise = (async function () {
                try {
                    if (self._sdk.game && typeof self._sdk.game.loadData === 'function') {
                        const v = await self._sdk.game.loadData();
                        self._loadDone = true;
                        if (typeof v === 'string') return v;
                        return (v == null) ? null : String(v);
                    }
                } catch (e) {}
                self._loadDone = true;
                return null;
            })();
            return this._loadPromise;
        },
        async saveData(str) {
            if (!this._sdk || typeof str !== 'string') return false;
            try { await this.loadData(); } catch (e) {}
            if (!this._loadDone) return false;
            try {
                if (this._sdk.game && typeof this._sdk.game.saveData === 'function') {
                    await this._sdk.game.saveData(str);
                    return true;
                }
            } catch (e) {}
            return false;
        },
        sendScore(value) {
            if (!this._sdk || !this._sdk.engagement || typeof this._sdk.engagement.sendScore !== 'function') return;
            const v = Math.floor(Number(value));
            if (!isFinite(v) || v < 0) return;
            try { this._sdk.engagement.sendScore({ value: v }); } catch (e) {}
        }
    };
})(typeof window !== 'undefined' ? window : this);
