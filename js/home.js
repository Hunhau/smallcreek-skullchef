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
                if (typeof PRODUCTION_BUILD !== 'undefined' && PRODUCTION_BUILD) return VERSION;
                if (typeof SC_LOCAL_DEV !== 'undefined' && !SC_LOCAL_DEV) return VERSION;
                return (typeof BUILD_V !== 'undefined') ? (VERSION + ' · ' + BUILD_V) : VERSION;
            },
            init() {
                const lb = document.getElementById('home-lang'); if (lb) lb.textContent = '🌐 ' + LANG.toUpperCase();
                const ver = document.getElementById('home-version'); if (ver) ver.textContent = this.versionLabel();
                paintBuildTag();
                this.syncAudio();
            },
            play() {
                const ov = document.getElementById('home-overlay'); if (!ov) return;
                try { sound.unlock(); sound.resumeAudio(); sound._primeMobileEssentials(); } catch (e) {}
                const enter = () => {
                    ov.classList.add('closing');
                    // On a phone in PORTRAIT, hold the tutorial until the player rotates to
                    // landscape (the rotate hint is already showing); fires once. Desktop /
                    // already-landscape starts the tutorial immediately, exactly as before.
                    setTimeout(() => {
                        ov.style.display = 'none';
                        try { if (typeof game !== 'undefined' && game.syncMinigameButtons) game.syncMinigameButtons(); } catch (e1) {}
                        try { if (typeof mobileUI !== 'undefined') { mobileUI.fitScene(); setTimeout(() => mobileUI.fitScene(), 200); } } catch (e) {}
                        try { landscapeGate.run(() => { try { tutorial.maybeStart(); } catch (e) {} }); } catch (e) { try { tutorial.maybeStart(); } catch (er) {} }
                    }, 600);
                };
                try { nameGate.ensure(enter); } catch (e) { enter(); }
            }
        };

    global.VERSION = VERSION;
    global.home = home;
})(typeof window !== 'undefined' ? window : this);
