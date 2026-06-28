/* Home overlay — globals VERSION, home. */
(function (global) {
    'use strict';

const VERSION = 'v1.0.1';
        const home = {
            toggleLang() { setLang(LANG === 'en' ? 'es' : 'en'); },
            toggleMute() { sound.toggleMute(); this.syncAudio(); },
            setVolume(v) { sound.setVolume(Number(v) / 100); this.syncAudio(); },
            syncAudio() {
                const m = document.getElementById('home-mute'), v = document.getElementById('home-vol');
                const muted = sound.muted || sound.volume <= 0;
                if (m) m.textContent = muted ? '🔇' : '🔊';
                if (v && document.activeElement !== v) v.value = String(Math.round(sound.volume * 100));
            },
            versionLabel() {
                var bt = (typeof window !== 'undefined' && window.BUILD_TARGET) || '';
                if (bt === 'steam' && typeof BUILD_V !== 'undefined') return VERSION + ' · ' + BUILD_V;
                if (typeof PRODUCTION_BUILD !== 'undefined' && PRODUCTION_BUILD) return VERSION;
                if (typeof SC_LOCAL_DEV !== 'undefined' && !SC_LOCAL_DEV) return VERSION;
                return (typeof BUILD_V !== 'undefined') ? (VERSION + ' · ' + BUILD_V) : VERSION;
            },
            init() {
                const lb = document.getElementById('home-lang'); if (lb) lb.textContent = '🌐 ' + LANG.toUpperCase();
                const ver = document.getElementById('home-version'); if (ver) ver.textContent = this.versionLabel();
                paintBuildTag();
                this.syncAudio();
                try { if (typeof STORE_TIER !== 'undefined') STORE_TIER.syncUi(); } catch (e) {}
            },
            play() {
                const ov = document.getElementById('home-overlay'); if (!ov) return;
                try { if (typeof sound.touchAudioIfOn === 'function') sound.touchAudioIfOn(); else if (!sound.muted && sound.volume > 0) sound.touchAudio(); } catch (e) {}
                try { if (typeof sound._syncBgAudio === 'function') sound._syncBgAudio(); } catch (e) {}
                const enter = () => {
                    ov.classList.add('closing');
                    setTimeout(() => {
                        ov.style.display = 'none';
                        try { if (typeof sound._syncBgAudio === 'function') sound._syncBgAudio(); } catch (e0) {}
                        try { if (typeof game !== 'undefined' && game.syncMinigameButtons) game.syncMinigameButtons(); } catch (e1) {}
                        try { if (typeof mobileUI !== 'undefined') { mobileUI.fitScene(); setTimeout(() => mobileUI.fitScene(), 200); } } catch (e) {}
                        try { landscapeGate.run(() => { try { tutorial.maybeStart(); } catch (e) {} }); } catch (e) { try { tutorial.maybeStart(); } catch (er) {} }
                    }, 600);
                };
                const proceed = () => {
                    try { nameGate.ensure(enter); } catch (e) { enter(); }
                };
                try {
                    if (typeof founderBeta !== 'undefined' && founderBeta.maybeShow(proceed)) return;
                } catch (e2) {}
                proceed();
            }
        };

    global.VERSION = VERSION;
    global.home = home;
})(typeof window !== 'undefined' ? window : this);
