/* Visual theme + decor background paths. */
(function (global) {
    'use strict';

const DECOR_BG_DEFAULT = 'assets/img/bg.jpg';
        const DECOR_BG_SUMMER = 'assets/img/bg_summer_beach.jpg';
        // === VISUAL THEME (arte dibujada custom — drop-in por carpeta) ===
        // Coloca PNG/JPG en assets/img/themes/handcrafted/ con estos nombres y se activan solos.
        const VISUAL_THEME_DEFS = {
            default: { id: 'default' },
            handcrafted: {
                id: 'handcrafted',
                bg: 'assets/img/themes/handcrafted/bg_kitchen.jpg',
                bgSummer: 'assets/img/themes/handcrafted/bg_beach.jpg',
                homeBg: 'assets/img/themes/handcrafted/bg_kitchen.jpg',
                altar: 'assets/img/themes/handcrafted/altar_angel.png',
                hud: 'assets/img/themes/handcrafted/hud_panel.png',
                lore: 'assets/img/themes/handcrafted/lore_scroll.png'
            }
        };
        const visualTheme = {
            _probeCache: {},
            _active: 'default',
            themeId() { return this._active || 'default'; },
            def(id) { return VISUAL_THEME_DEFS[id] || VISUAL_THEME_DEFS.default; },
            asset(id, key) { const d = this.def(id); return (d && d[key]) ? d[key] : null; },
            probe(url) {
                if (!url) return Promise.resolve(false);
                if (this._probeCache[url] != null) return Promise.resolve(this._probeCache[url]);
                return new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => { this._probeCache[url] = true; resolve(true); };
                    img.onerror = () => { this._probeCache[url] = false; resolve(false); };
                    img.src = url;
                });
            },
            resolveBackground(decorBgId) {
                const id = this.themeId();
                if (decorBgId === 'summer_beach') {
                    return this.asset(id, 'bgSummer') || DECOR_BG_SUMMER;
                }
                return this.asset(id, 'bg') || DECOR_BG_DEFAULT;
            },
            async init() {
                let pick = (game.vtTheme && VISUAL_THEME_DEFS[game.vtTheme]) ? game.vtTheme : '';
                if (pick === 'handcrafted') {
                    const hcBg = VISUAL_THEME_DEFS.handcrafted.bg;
                    if (!(await this.probe(hcBg))) pick = 'default';
                } else if (!pick) {
                    const hcBg = VISUAL_THEME_DEFS.handcrafted.bg;
                    if (await this.probe(hcBg)) pick = 'handcrafted';
                    else pick = 'default';
                }
                if (pick !== game.vtTheme) game.vtTheme = pick;
                this._active = pick;
                await this.apply();
            },
            async apply() {
                const id = this.themeId();
                document.documentElement.setAttribute('data-vtheme', id === 'default' ? '' : id);
                const hud = document.getElementById('hud');
                const lore = document.getElementById('lore-scroll');
                const home = document.getElementById('home-overlay');
                const btn = document.getElementById('btn-prestige');
                const hudUrl = this.asset(id, 'hud');
                const loreUrl = this.asset(id, 'lore');
                const altarUrl = this.asset(id, 'altar');
                const homeUrl = this.asset(id, 'homeBg') || this.asset(id, 'bg');
                if (hud) {
                    if (id !== 'default' && hudUrl && await this.probe(hudUrl)) {
                        hud.classList.add('vt-hud-frame');
                        document.documentElement.style.setProperty('--vt-hud-img', "url('" + hudUrl + "')");
                    } else {
                        hud.classList.remove('vt-hud-frame');
                        document.documentElement.style.removeProperty('--vt-hud-img');
                    }
                }
                if (lore) {
                    if (id !== 'default' && loreUrl && await this.probe(loreUrl)) {
                        lore.classList.add('vt-lore-frame');
                        document.documentElement.style.setProperty('--vt-lore-img', "url('" + loreUrl + "')");
                    } else {
                        lore.classList.remove('vt-lore-frame');
                        document.documentElement.style.removeProperty('--vt-lore-img');
                    }
                }
                if (btn) {
                    if (id !== 'default' && altarUrl && await this.probe(altarUrl)) {
                        btn.style.setProperty('background-image', "url('" + altarUrl + "')", 'important');
                    } else {
                        btn.style.setProperty('background-image', 'url("assets/img/angel.png")', 'important');
                    }
                }
                if (home && homeUrl && await this.probe(homeUrl)) {
                    home.style.background = "url('" + homeUrl + "') center/cover no-repeat";
                }
                try { decor.applyBackground(); } catch (e) {}
            }
        };

    global.DECOR_BG_DEFAULT = DECOR_BG_DEFAULT;
    global.DECOR_BG_SUMMER = DECOR_BG_SUMMER;
    global.VISUAL_THEME_DEFS = VISUAL_THEME_DEFS;
    global.visualTheme = visualTheme;
})(typeof window !== 'undefined' ? window : this);
