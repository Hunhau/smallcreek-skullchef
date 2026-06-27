/* Fullscreen API — global fullscreen. */
(function (global) {
    'use strict';

    global.fullscreen = {
            _electronActive: false,
            _isElectron() {
                try { return !!(window.electronAPI && typeof window.electronAPI.setFullscreen === 'function'); } catch (e) { return false; }
            },
            supported() {
                try {
                    if (ytPlayables && ytPlayables.available) return false;
                    if (this._isElectron()) return true;
                    return !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
                } catch (e) { return false; }
            },
            // Launched from a Home Screen icon (PWA) => already true fullscreen, no chrome.
            isStandalone() {
                try { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) { return false; }
            },
            // iOS Safari has NO Fullscreen API; the only fullscreen is "Add to Home Screen".
            _isIOS() {
                try { const ua = navigator.userAgent || ''; return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); } catch (e) { return false; }
            },
            _ytp() { try { return !!(typeof ytPlayables !== 'undefined' && ytPlayables && ytPlayables.available); } catch (e) { return false; } },
            isActive() {
                try {
                    if (this._isElectron()) return !!this._electronActive;
                    return !!(document.fullscreenElement || document.webkitFullscreenElement);
                } catch (e) { return false; }
            },
            enter() {
                if (this._isElectron()) {
                    try { window.electronAPI.setFullscreen(true); this._electronActive = true; this.syncUi(); try { if (typeof mobileUI !== 'undefined') mobileUI.reflow(); } catch (e2) {} } catch (e) {}
                    return;
                }
                const el = document.documentElement;
                const fn = el.requestFullscreen || el.webkitRequestFullscreen;
                if (fn) { try { const r = fn.call(el); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
            },
            exit() {
                if (this._isElectron()) {
                    try { window.electronAPI.setFullscreen(false); this._electronActive = false; this.syncUi(); try { if (typeof mobileUI !== 'undefined') mobileUI.reflow(); } catch (e2) {} } catch (e) {}
                    return;
                }
                const fn = document.exitFullscreen || document.webkitExitFullscreen;
                if (fn) { try { const r = fn.call(document); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
            },
            toggle() {
                try {
                    if (this.isStandalone()) return;                          // installed: already fullscreen, nothing to do
                    if (this.supported()) { if (this.isActive()) this.exit(); else this.enter(); return; } // Android/desktop: native API
                    if (this._isIOS() && !this._ytp()) { try { gx.toast(t('pwa_ios_hint')); } catch (e) {} } // iOS Safari fallback hint
                } catch (e) {}
            },
            syncUi() {
                try {
                    const standalone = this.isStandalone(), sup = this.supported(), act = this.isActive();
                    // Show the button on Android/desktop (native API) or iOS Safari (hint fallback);
                    // hide it once installed/standalone (already fullscreen) or in YT Playables.
                    const showFs = !standalone && !this._ytp() && (sup || this._isIOS());
                    [['home-fullscreen-row', 'home-fs'], ['pause-fullscreen-row', 'pause-fs']].forEach(pair => {
                        const row = document.getElementById(pair[0]), btn = document.getElementById(pair[1]);
                        if (row) row.style.display = showFs ? '' : 'none';
                        if (btn) btn.textContent = t(act ? 'fs_exit' : 'fs_enter');
                    });
                } catch (e) {}
            },
            init() {
                ['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => {
                    try {
                        document.addEventListener(ev, () => {
                            this.syncUi();
                            try { if (typeof mobileUI !== 'undefined') mobileUI.reflow(); } catch (e) {}
                        });
                    } catch (e) {}
                });
                if (this._isElectron()) {
                    try {
                        window.electronAPI.onFullscreenChange((active) => {
                            this._electronActive = !!active;
                            this.syncUi();
                            try { if (typeof mobileUI !== 'undefined') mobileUI.reflow(); } catch (e) {}
                        });
                    } catch (e) {}
                }
                try {
                    document.addEventListener('keydown', (ev) => {
                        if (ev.key !== 'F11' || ev.repeat || this._ytp() || this.isStandalone()) return;
                        if (!this.supported()) return;
                        ev.preventDefault();
                        this.toggle();
                    });
                } catch (e) {}
                this.syncUi();
            }
        };
})(typeof window !== 'undefined' ? window : this);
