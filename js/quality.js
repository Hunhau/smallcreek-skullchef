/* Visual quality presets — global quality. */
(function (global) {
    'use strict';

    global.quality = {
            mode: 'auto',
            presets: {
                high: { maxParts: 80, partCap: 4, steamMax: 38, waveMul: 1, clickParts: 8 },
                low:  { maxParts: 18, partCap: 1, steamMax: 0, waveMul: 0, clickParts: 1 }
            },
            params: { maxParts: 80, partCap: 4, steamMax: 38, waveMul: 1, clickParts: 8 },
            // "Auto": heurístico simple por núcleos lógicos (sin sampleo costoso de FPS).
            // En teléfonos (touch + pantalla pequeña) usamos 'low' para reducir el trabajo
            // por frame del hilo principal y evitar que las partículas hagan tartamudear el
            // audio del removido al tocar rápido. En escritorio el comportamiento no cambia.
            detectAuto() {
                try {
                    const cap = window.Capacitor;
                    if (cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform()) return 'low';
                } catch (e) {}
                try {
                    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && Math.min(window.innerWidth, window.innerHeight) <= 600) return 'low';
                } catch (e) {}
                try { const c = navigator.hardwareConcurrency; if (Number.isFinite(c) && c > 0 && c <= 4) return 'low'; } catch (e) {}
                return 'high';
            },
            effMode() { return this.mode === 'auto' ? this.detectAuto() : this.mode; },
            apply() {
                const m = this.effMode();
                const p = this.presets[m] || this.presets.high;
                this.params = { maxParts: p.maxParts, partCap: p.partCap, steamMax: p.steamMax, waveMul: p.waveMul, clickParts: p.clickParts };
                try { document.body.classList.toggle('q-low', m === 'low'); } catch (e) {}
                this.syncUi();
            },
            load() {
                try { const v = localStorage.getItem('soup_quality'); if (v === 'auto' || v === 'high' || v === 'low') this.mode = v; } catch (e) {}
                this.apply();
            },
            set(mode) {
                if (mode !== 'auto' && mode !== 'high' && mode !== 'low') return;
                this.mode = mode;
                try { localStorage.setItem('soup_quality', mode); } catch (e) {}
                this.apply();
            },
            syncUi() {
                ['home-quality', 'pause-quality'].forEach(id => {
                    const c = document.getElementById(id); if (!c) return;
                    const modes = ['auto', 'high', 'low'];
                    c.innerHTML = modes.map(mo => `<button class="seg-btn ${mo === this.mode ? 'active' : ''}" type="button" data-q="${mo}" onclick="quality.set('${mo}')">${t('quality_' + mo)}</button>`).join('');
                });
            }
        };
})(typeof window !== 'undefined' ? window : this);
