/* In-game pause menu — global pauseMenu. */
(function (global) {
    'use strict';

    global.pauseMenu = {
        _open: false, _pausedByUs: false,
        open() {
            if (this._open) return;
            if (game.p && !this._pausedByUs) return;
            this._open = true;
            if (!game.p) { game.p = true; this._pausedByUs = true; }
            this.showMain();
            this.renderLifetime();
            quality.syncUi(); fullscreen.syncUi(); this.syncAudio();
            try { if (typeof STORE_TIER !== 'undefined') STORE_TIER.syncUi(); } catch (e) {}
            const md = document.getElementById('pause-modal'); if (md) md.classList.add('open');
        },
        renderLifetime() {
            try {
                const el = document.getElementById('pause-lifetime');
                if (el) el.innerHTML = game.lifetimeStatsHtml();
            } catch (e) {}
        },
        close() { this._open = false; const md = document.getElementById('pause-modal'); if (md) md.classList.remove('open'); },
        _unpause() {
            if (!this._pausedByUs) return;
            this._pausedByUs = false; game.p = false; game._soupRect = null; game._stageRect = null; game._scoreTarget = null;
            if (game._loopPaused) { game._loopPaused = false; game.loop(); }
        },
        resume() { this.close(); this._unpause(); },
        showSettings() { const m = document.getElementById('pause-main'), s = document.getElementById('pause-settings'); if (m) m.style.display = 'none'; if (s) s.style.display = 'flex'; quality.syncUi(); fullscreen.syncUi(); this.syncAudio(); },
        showMain() { const m = document.getElementById('pause-main'), s = document.getElementById('pause-settings'); if (m) m.style.display = 'flex'; if (s) s.style.display = 'none'; this.renderLifetime(); },
        syncAudio() {
            const mu = document.getElementById('pause-mute'), v = document.getElementById('pause-vol');
            const muted = sound.muted || sound.volume <= 0;
            if (mu) mu.textContent = muted ? '🔇' : '🔊';
            if (v && document.activeElement !== v) v.value = String(Math.round(sound.volume * 100));
        },
        openGuide() { try { guide.open(); } catch (e) {} },
        openAchievements() { achievementsUI.open(); },
        openAmbient() { try { ambient.open(); } catch (e) {} },
        toHome() {
            this.close(); this._unpause();
            const ov = document.getElementById('home-overlay');
            if (ov) { ov.classList.remove('closing'); ov.style.display = 'flex'; }
            try { home.init(); } catch (e) {}
            try { game.save(); } catch (e) {}
        },
        exit() {
            try {
                if (window.electronAPI && typeof window.electronAPI.quitApp === 'function') {
                    window.electronAPI.quitApp();
                    return;
                }
            } catch (e) {}
            this.toHome();
        }
    };
})(typeof window !== 'undefined' ? window : this);
