/* Soup Skirmish — 2D ingredient arena (game-in-game). */
(function (global) {
    'use strict';

    /* cp id: 0=coco, 1=bunny, 2=pio, 3=ivan, 4=bongo — 1 ingredient each (matches helper lore) */
    var KITS = [
        { crop: 'shrimp', glyph: '\uD83E\uDD90', color: '#fb7185', weaponKey: 'skirmish_weapon_coco' },
        { crop: 'carrot', glyph: '\uD83E\uDD55', color: '#ea580c', weaponKey: 'skirmish_weapon_bunny' },
        { crop: 'corn', glyph: '\uD83C\uDF3D', color: '#fbbf24', weaponKey: 'skirmish_weapon_pio' },
        { crop: 'berries', glyph: '\uD83E\uDED0', color: '#818cf8', weaponKey: 'skirmish_weapon_ivan' },
        { crop: 'banana', glyph: '\uD83C\uDF4C', color: '#fde047', weaponKey: 'skirmish_weapon_bongo' }
    ];

    var PLAYER_CD = 460;

    global.skirmish = {
        active: false,
        _raf: 0,
        _lastTs: 0,
        _canvas: null,
        _ctx: null,
        _imgs: {},
        _aim: null,
        _pendingReward: null,
        _w: 640,
        _h: 480,
        ch: null,
        aiId: 1,
        G: 480,

        kit(id) { return KITS[id] || KITS[0]; },

        _mobileLandscape() {
            try {
                return window.matchMedia('(pointer: coarse) and (orientation: landscape) and (max-height: 600px)').matches;
            } catch (e) { return false; }
        },

        _mobilePortrait() {
            try {
                return window.matchMedia('(pointer: coarse) and (orientation: portrait) and (max-width: 768px)').matches;
            } catch (e) { return false; }
        },

        _layoutMul() {
            if (this._mobileLandscape()) return 0.6;
            if (this._mobilePortrait()) return 0.76;
            return 1;
        },

        _helperScale(key) {
            var lm = this._layoutMul();
            if (this._mobilePortrait()) {
                // Vertical phone: rival (top) and player (bottom) share one scale.
                return 0.32 * lm * 0.88;
            }
            if (key === 'player') return 0.36 * lm;
            return 0.32 * lm * (this._mobileLandscape() ? 0.85 : 1);
        },

        _isLowQuality() {
            try { return document.body && document.body.classList.contains('q-low'); } catch (e) { return false; }
        },

        _resetEndUi() {
            var box = document.getElementById('skirmish-reward-box');
            var icon = document.getElementById('skirmish-reward-icon');
            var end = document.getElementById('skirmish-end');
            var conf = document.getElementById('skirmish-confetti-layer');
            if (box) box.classList.remove('defeat');
            if (icon) icon.textContent = '🍲';
            if (end) end.classList.remove('skirmish-end-win', 'skirmish-end-loss', 'ceremony-playing', 'ceremony-done', 'emblem-drop');
            if (conf) {
                conf.innerHTML = '';
                var sel = document.getElementById('skirmish-end');
                if (sel && conf.parentNode !== sel) sel.insertBefore(conf, sel.firstChild);
            }
            if (this._ceremonyT) { clearTimeout(this._ceremonyT); this._ceremonyT = 0; }
        },

        _spawnConfettiLayer(layer, count) {
            if (!layer) return;
            layer.innerHTML = '';
            var colors = ['#fbbf24', '#fde047', '#a78bfa', '#4ade80', '#fb7185', '#38bdf8', '#f472b6', '#86efac', '#c084fc', '#fcd34d', '#f97316', '#e879f9'];
            var shapes = ['', ' round', ' strip'];
            var n = count || (this._isLowQuality() ? 28 : 64);
            var i, el, col, w, h, shape;
            for (i = 0; i < n; i++) {
                el = document.createElement('i');
                shape = shapes[i % shapes.length];
                el.className = 'skirmish-confetti-piece' + shape + (i < n * 0.35 ? ' burst' : '');
                col = colors[i % colors.length];
                w = 10 + Math.random() * 16;
                h = shape.indexOf('strip') >= 0 ? Math.max(6, w * 0.35) : (8 + Math.random() * 14);
                el.style.left = (Math.random() * 100) + '%';
                el.style.width = w + 'px';
                el.style.height = h + 'px';
                el.style.background = col;
                el.style.setProperty('--cf-delay', (Math.random() * 0.85) + 's');
                el.style.setProperty('--cf-dur', (2.4 + Math.random() * 2.2) + 's');
                el.style.setProperty('--cf-drift', ((Math.random() - 0.5) * 140) + 'px');
                el.style.setProperty('--cf-spin', ((Math.random() > 0.5 ? 1 : -1) * (540 + Math.random() * 540)) + 'deg');
                layer.appendChild(el);
            }
        },

        _playWinCeremony() {
            var end = document.getElementById('skirmish-end');
            var conf = document.getElementById('skirmish-confetti-layer');
            var cinema = document.getElementById('victory-cinema');
            if (!end || !this.ch || !game || !game.coron) return;
            end.classList.add('ceremony-playing');
            end.classList.remove('ceremony-done', 'emblem-drop');
            if (cinema && conf) {
                cinema.appendChild(conf);
                this._spawnConfettiLayer(conf, this._isLowQuality() ? 32 : 72);
            }
            game.coron(this.ch, null, {
                skirmish: true,
                skipSound: true,
                skipToast: true,
                skipRebuild: true,
                onDone: function () {
                    if (conf) {
                        conf.innerHTML = '';
                        if (end.firstChild !== conf) end.insertBefore(conf, end.firstChild);
                    }
                    end.classList.remove('ceremony-playing');
                    end.classList.add('ceremony-done');
                }
            });
        },

        _showFightOverlay() {
            var el = document.getElementById('skirmish-fight-overlay');
            if (!el) return;
            el.classList.remove('active');
            void el.offsetWidth;
            el.classList.add('active');
            window.setTimeout(function () { el.classList.remove('active'); }, 1400);
        },

        _syncMatchBar() {
            var pImg = document.getElementById('skirmish-bar-p-img');
            var aImg = document.getElementById('skirmish-bar-a-img');
            var pName = document.getElementById('skirmish-bar-p-name');
            var aName = document.getElementById('skirmish-bar-a-name');
            if (!this.ch) return;
            var ai = game.cp[this.aiId];
            var pSrc = this.ch.im;
            var aSrc = ai ? ai.im : '';
            try { pSrc = collection.sceneImgForHelper(this.ch.id, 'skirmish'); } catch (e) {}
            try { aSrc = collection.sceneImgForHelper(this.aiId, 'skirmish'); } catch (e2) {}
            if (pImg) pImg.src = pSrc;
            if (aImg) aSrc && (aImg.src = aSrc);
            if (pName) {
                try { pName.textContent = collection.helperEquipSubtitle(this.ch.id, 'skirmish'); } catch (e) { pName.textContent = t(this.ch.nk); }
            }
            if (aName) {
                if (ai) {
                    try { aName.textContent = collection.helperEquipSubtitle(this.aiId, 'skirmish'); } catch (e2) { aName.textContent = t(ai.nk); }
                } else aName.textContent = '???';
            }
        },

        _burstParticles(x, y, color, n) {
            if (this._isLowQuality() || !this.state) return;
            var st = this.state;
            var i, a, sp;
            for (i = 0; i < (n || 10); i++) {
                a = Math.random() * Math.PI * 2;
                sp = 40 + Math.random() * 120;
                st.particles.push({
                    x: x, y: y,
                    vx: Math.cos(a) * sp,
                    vy: Math.sin(a) * sp - 30,
                    life: 0.35 + Math.random() * 0.35,
                    r: 2 + Math.random() * 3,
                    color: color || '#fbbf24'
                });
            }
        },

        _spawnFloater(x, y, text, team) {
            if (!this.state) return;
            this.state.floaters.push({ x: x, y: y, text: text, life: 0.85, team: team });
        },

        _throwStyle(helperId) {
            var k = this.kit(helperId);
            var style = { glyph: k.glyph, scale: 1.05, spin: 7, color: k.color };
            try {
                var entry = game.SUMMON_INGREDIENTS[helperId];
                if (entry && entry.variants) {
                    var i, v;
                    for (i = 0; i < entry.variants.length; i++) {
                        v = entry.variants[i];
                        if (v.fx === k.crop || (v.glyphs && v.glyphs[0] === k.glyph)) {
                            style.scale = (v.endScale != null ? v.endScale : 1) * 1.08;
                            style.spin = Math.max(5, Math.min(11, ((v.endRot || 130) - (v.startRot || -20)) / 28));
                            if (v.particleColors && v.particleColors[0]) style.color = v.particleColors[0];
                            break;
                        }
                    }
                }
            } catch (e) {}
            return style;
        },

        _ingredientFontSize() {
            if (this._mobileLandscape()) return Math.max(20, Math.min(34, this._w * 0.038));
            return Math.max(34, Math.min(58, this._w * 0.056));
        },

        _drawIngredientGlyph(glyph, x, y, rot, scale, glowColor) {
            var ctx = this._ctx;
            var px = this._ingredientFontSize() * (scale || 1);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(rot || 0);
            if (glowColor && !this._isLowQuality()) {
                ctx.shadowColor = glowColor;
                ctx.shadowBlur = 14;
            } else {
                ctx.shadowColor = 'rgba(0,0,0,0.55)';
                ctx.shadowBlur = 10;
            }
            ctx.shadowOffsetY = 3;
            ctx.font = px + 'px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(glyph, 0, 0);
            ctx.restore();
        },

        _spawnProjectile(helperId, team, sx, sy, vx, vy) {
            var st = this._throwStyle(helperId);
            return {
                x: sx,
                y: sy,
                vx: vx,
                vy: vy,
                glyph: st.glyph,
                scale: st.scale,
                spin: st.spin,
                color: st.color,
                team: team,
                rot: 0
            };
        },

        _spawnY(team) {
            var o = team === 'p' ? this._playerOrigin() : this._aiOrigin();
            return team === 'p' ? o.y - 28 : o.y + 14;
        },

        _ballisticVelocity(sx, sy, tx, ty, g) {
            var dx = tx - sx;
            var dy = ty - sy;
            var dist = Math.sqrt(dx * dx + dy * dy) || 1;
            var T = Math.max(0.5, Math.min(1.35, dist / 360));
            var vx, vy, i;
            for (i = 0; i < 8; i++) {
                vx = dx / T;
                vy = (dy - 0.5 * g * T * T) / T;
                if (Math.abs(vx) < 820 && vy > -820 && vy < 520) break;
                T += 0.1;
            }
            return { vx: vx, vy: vy, T: T };
        },

        open() {
            if (!game || !game.cp || !game.minigameUnlocked || !game.minigameUnlocked()) return;
            if (game.scd > 0) return;
            try { if (typeof collection !== 'undefined') collection.snapshotMainEquips(); } catch (e0) {}
            try { if (typeof mobileUI !== 'undefined') mobileUI.closeAll(); } catch (e) {}
            var rm = document.getElementById('race-modal');
            if (rm) rm.style.display = 'none';
            game.p = true;
            this.active = false;
            this._pendingReward = null;
            var m = document.getElementById('skirmish-modal');
            if (!m) return;
            m.style.display = 'flex';
            var sel = document.getElementById('skirmish-sel');
            var play = document.getElementById('skirmish-play');
            var end = document.getElementById('skirmish-end');
            if (sel) sel.style.display = 'block';
            if (play) play.style.display = 'none';
            if (end) end.style.display = 'none';
            var hint = document.getElementById('skirmish-hint');
            if (hint) hint.style.display = '';
            var hdr = document.getElementById('skirmish-header');
            if (hdr) hdr.style.display = '';
            this._resetEndUi();
            this.refreshList();
            if (!this._escBound) {
                var self = this;
                this._onEsc = function (e) { if (e.key === 'Escape') self.abandon(); };
                window.addEventListener('keydown', this._onEsc);
                this._escBound = true;
            }
        },

        abandon() {
            this._pendingReward = null;
            this.close();
        },

        close() {
            this.stopLoop();
            game.p = false;
            if (this._escBound) {
                window.removeEventListener('keydown', this._onEsc);
                this._escBound = false;
            }
            var m = document.getElementById('skirmish-modal');
            if (m) m.style.display = 'none';
            try { if (typeof collection !== 'undefined') collection.restoreSceneAfterMinigame(); } catch (e) {}
        },

        ret() {
            var msg = this._pendingReward;
            this._pendingReward = null;
            game.scd = game.getSkirmishCd();
            this.close();
            try { game.syncMinigameButtons(); } catch (e0) {}
            if (msg) try { gx.toast(msg); } catch (e) {}
        },

        refreshList() {
            var l = document.getElementById('skirmish-list');
            if (!l) return;
            l.innerHTML = '';
            try { collection.renderMinigameEquipBar('skirmish-equip-bar', 'skirmish'); } catch (e0) {}
            var self = this;
            game.cp.filter(function (c) { return c.lv > 0; }).forEach(function (c) {
                var d = document.createElement('div');
                d.className = 'skirmish-sel-card';
                var imgSrc = c.im;
                try { imgSrc = collection.sceneImgForHelper(c.id, 'skirmish'); } catch (e) {}
                var k = self.kit(c.id);
                var cardHtml = '';
                try { cardHtml = collection.helperEquipCardHtml(c.id, 'skirmish'); } catch (e1) { cardHtml = '<span class="skirmish-sel-name">' + t(c.nk) + '</span>'; }
                d.style.setProperty('--skirmish-kit', k.color);
                d.innerHTML = '<div class="skirmish-sel-portrait">' +
                    '<span class="skirmish-sel-lv">Lv ' + c.lv + '</span>' +
                    '<span class="skirmish-sel-glyph">' + k.glyph + '</span>' +
                    '<img src="' + imgSrc + '" loading="lazy" decoding="async" alt="">' +
                    '</div>' +
                    cardHtml +
                    '<span class="skirmish-kit">' + k.glyph + ' · ' + t(k.weaponKey) + '</span>';
                d.onclick = function () { self.start(c); };
                l.appendChild(d);
            });
        },

        start(c) {
            if (!c) return;
            this.ch = c;
            this.aiId = this._pickAiId(c.id);
            this._stage = document.getElementById('skirmish-stage');
            this._canvas = document.getElementById('skirmish-canvas');
            this._ctx = this._canvas ? this._canvas.getContext('2d') : null;
            if (!this._stage || !this._canvas || !this._ctx) return;
            this.stopLoop();
            document.getElementById('skirmish-sel').style.display = 'none';
            document.getElementById('skirmish-end').style.display = 'none';
            document.getElementById('skirmish-play').style.display = 'flex';
            var hint = document.getElementById('skirmish-hint');
            if (hint) hint.style.display = 'none';
            var hdr = document.getElementById('skirmish-header');
            if (hdr) hdr.style.display = 'none';
            this._resetEndUi();
            this._loadImages(c.id, this.aiId);
            this._resetMatch();
            this._syncMatchBar();
            this._showFightOverlay();
            this._bindInput();
            this._lastTs = 0;
            this._lastPlayerShot = 0;
            var self = this;
            requestAnimationFrame(function () {
                requestAnimationFrame(function () { self._resize(); });
            });
            this._raf = requestAnimationFrame(function (ts) { self._loop(ts); });
            try { sound.play('buy'); } catch (e) {}
        },

        _pickAiId(playerId) {
            var pool = game.cp.filter(function (c) { return c.lv > 0 && c.id !== playerId; });
            if (!pool.length) pool = game.cp.filter(function (c) { return c.lv > 0; });
            if (!pool.length) return 1;
            return pool[Math.floor(Math.random() * pool.length)].id;
        },

        _loadImages(helperId, aiId) {
            this._imgs = {};
            var self = this;
            var load = function (key, src) {
                if (!src) return;
                var im = new Image();
                im.decoding = 'async';
                im.onload = function () { self._imgs[key] = im; };
                im.src = src;
            };
            try { load('player', collection.sceneImgForHelper(helperId)); } catch (e) {
                load('player', game.cp[helperId] ? game.cp[helperId].im : '');
            }
            var aid = aiId != null ? aiId : 1;
            try { load('ai', collection.sceneImgForHelper(aid)); } catch (e2) {
                load('ai', game.cp[aid] ? game.cp[aid].im : '');
            }
            load('chef', 'assets/img/chef.png');
        },

        _resetMatch() {
            this.active = true;
            this._aim = null;
            this._lastPlayerShot = 0;
            this.state = {
                projectiles: [],
                splats: [],
                particles: [],
                floaters: [],
                playerFill: 0,
                aiFill: 0,
                timeLeft: 80,
                aiCooldown: 0.42,
                playerRecoil: 0,
                aiRecoil: 0,
                flashP: 0,
                flashA: 0,
                steamPhase: 0,
                arenaPhase: 0,
                win: null
            };
            this._resize();
            this._syncHud();
        },

        stopLoop() {
            this.active = false;
            if (this._raf) cancelAnimationFrame(this._raf);
            this._raf = 0;
            this._unbindInput();
        },

        _resize() {
            var stage = document.getElementById('skirmish-stage');
            if (!this._canvas || !stage || !this._ctx) return;
            var r = stage.getBoundingClientRect();
            var w = Math.max(320, r.width || stage.clientWidth || 640);
            var h = Math.max(360, r.height || stage.clientHeight || 480);
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            this._canvas.width = Math.floor(w * dpr);
            this._canvas.height = Math.floor(h * dpr);
            this._canvas.style.width = w + 'px';
            this._canvas.style.height = h + 'px';
            this._ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            this._w = w;
            this._h = h;
        },

        _bindInput() {
            var root = this._stage || this._canvas;
            if (!root) return;
            this._unbindInput();
            this._inputRoot = root;
            this._bound = true;
            this._resize();
            var self = this;
            this._fireFrame = 0;
            this._onDown = function (e) {
                if (!self.active || !self.state || self.state.win != null) return;
                if (e.button != null && e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();
                var now = performance.now();
                if (now - self._lastPlayerShot < PLAYER_CD) return;
                self._fireFrame = now;
                self._resize();
                var pt = self._ptr(e);
                self._aim = pt;
                self._firePlayerAt(pt);
            };
            this._onMove = function (e) {
                if (!self.active || !self.state || self.state.win != null) return;
                self._aim = self._ptr(e);
            };
            this._onSpace = function (e) {
                if (e.code !== 'Space' && e.key !== ' ') return;
                if (!self.active || !self.state || self.state.win != null) return;
                e.preventDefault();
                e.stopPropagation();
                var now = performance.now();
                if (now - self._lastPlayerShot < PLAYER_CD) return;
                self._firePlayerAt(self._basketCenter('p'));
            };
            root.addEventListener('pointerdown', this._onDown);
            root.addEventListener('pointermove', this._onMove);
            window.addEventListener('keydown', this._onSpace, true);
            this._onResize = function () { self._resize(); };
            window.addEventListener('resize', this._onResize);
        },

        _unbindInput() {
            var root = this._inputRoot || this._stage || this._canvas;
            if (!root) { this._bound = false; return; }
            if (this._onDown) {
                root.removeEventListener('pointerdown', this._onDown);
            }
            if (this._onMove) root.removeEventListener('pointermove', this._onMove);
            if (this._onSpace) window.removeEventListener('keydown', this._onSpace, true);
            if (this._onResize) window.removeEventListener('resize', this._onResize);
            this._bound = false;
            this._inputRoot = null;
            this._aim = null;
        },

        _ptr(e) {
            var root = this._inputRoot || this._stage || this._canvas;
            var r = root.getBoundingClientRect();
            var x = e.clientX - r.left;
            var y = e.clientY - r.top;
            return {
                x: Math.max(0, Math.min(this._w, x * (this._w / Math.max(1, r.width)))),
                y: Math.max(0, Math.min(this._h, y * (this._h / Math.max(1, r.height))))
            };
        },

        /* Player bottom-left; rival top-right. Baskets on vertical center axis. */
        _playerOrigin() {
            var xMul = this._mobileLandscape() ? 0.16 : 0.14;
            var yMul = this._mobileLandscape() ? 0.84 : 0.86;
            return { x: this._w * xMul, y: this._h * yMul };
        },

        _aiOrigin() {
            var land = this._mobileLandscape();
            var port = this._mobilePortrait();
            var xMul = land ? 0.84 : 0.86;
            var y = this._h * (land ? 0.27 : (port ? 0.19 : 0.16));
            var im = this._imgs.ai;
            if (im && im.complete && im.height) {
                var dh = im.height * this._helperScale('ai');
                var pad = land ? 0.03 : (port ? 0.045 : 0.02);
                var minY = dh + this._h * pad;
                if (y < minY) y = minY;
            }
            return { x: this._w * xMul, y: y };
        },

        _basketRect(team) {
            var land = this._mobileLandscape();
            /* Mobile landscape: tall cauldrons, slightly wider than ultra-narrow (closer to portrait). */
            var bw = this._w * (land ? 0.27 : 0.36);
            var bh = this._h * (land ? 0.19 : 0.15);
            var x = (this._w - bw) * 0.5;
            if (team === 'p') return { x: x, y: this._h * (land ? 0.032 : 0.04), w: bw, h: bh };
            return { x: x, y: this._h * (land ? 0.738 : 0.76), w: bw, h: bh };
        },

        _basketCenter(team) {
            var b = this._basketRect(team);
            return { x: b.x + b.w * 0.5, y: b.y + b.h * 0.55 };
        },

        _basketHitRect(team) {
            var b = this._basketRect(team);
            var land = this._mobileLandscape();
            /* Wider touch margin on sides so narrow pots stay easy to hit with a finger. */
            var padX = land ? Math.max(40, b.w * 0.55) : Math.max(22, b.w * 0.12);
            var padY = land ? Math.max(16, b.h * 0.22) : Math.max(20, b.h * 0.28);
            return { x: b.x - padX, y: b.y - padY, w: b.w + padX * 2, h: b.h + padY * 2 };
        },

        _pointInRect(x, y, r) {
            return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
        },

        _segHitsRect(x0, y0, x1, y1, r) {
            if (this._pointInRect(x0, y0, r) || this._pointInRect(x1, y1, r)) return true;
            var lines = [
                [r.x, r.y, r.x + r.w, r.y],
                [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
                [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
                [r.x, r.y + r.h, r.x, r.y]
            ];
            var i;
            for (i = 0; i < lines.length; i++) {
                if (this._segIntersect(x0, y0, x1, y1, lines[i][0], lines[i][1], lines[i][2], lines[i][3])) return true;
            }
            return false;
        },

        _segIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
            var d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
            if (Math.abs(d) < 1e-6) return false;
            var t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / d;
            var u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / d;
            return t >= 0 && t <= 1 && u >= 0 && u <= 1;
        },

        _projectileHitsBasket(p, px, py) {
            var team = p.team === 'p' ? 'p' : 'a';
            var b = this._basketHitRect(team);
            if (this._pointInRect(p.x, p.y, b)) return true;
            if (px != null && py != null && this._segHitsRect(px, py, p.x, p.y, b)) return true;
            return false;
        },

        _applyPlayerScore(pp) {
            var st = this.state;
            st.playerFill = Math.min(100, st.playerFill + pp);
        },

        _firePlayerAt(to) {
            if (!this.ch || !this.state || this.state.win != null) return;
            var now = performance.now();
            if (this._lastPlayerShot && now - this._lastPlayerShot < PLAYER_CD) return;
            this._lastPlayerShot = now;
            var o = this._playerOrigin();
            var sx = o.x;
            var sy = this._spawnY('p');
            var tx = to.x;
            var ty = to.y;
            var dist = Math.sqrt((tx - sx) * (tx - sx) + (ty - sy) * (ty - sy));
            if (dist < 40) {
                var aim = this._basketCenter('p');
                tx = aim.x;
                ty = aim.y;
            }
            var g = this.G;
            var vel = this._ballisticVelocity(sx, sy, tx, ty, g);
            this.state.projectiles.push(this._spawnProjectile(this.ch.id, 'p', sx, sy, vel.vx, vel.vy));
            this.state.playerRecoil = 8;
            this.state.flashP = 0.35;
            try { sound.play('bubble'); } catch (e) {}
        },

        _aiTarget() {
            var c = this._basketCenter('a');
            return {
                x: c.x + (Math.random() - 0.5) * this._w * 0.03,
                y: c.y + (Math.random() - 0.5) * this._h * 0.015
            };
        },

        _aiMissTarget() {
            var b = this._basketRect('a');
            return {
                x: b.x + b.w * (Math.random() < 0.5 ? 0.06 : 0.94),
                y: b.y + b.h * (0.15 + Math.random() * 0.7)
            };
        },

        _aiPoints() {
            var g2 = this.state.playerFill - this.state.aiFill;
            if (g2 < -12) return 5;
            if (g2 > 22) return 7;
            return 6;
        },

        _fireAi() {
            var st = this.state;
            if (!st || st.win != null) return;
            var miss = Math.random() < 0.1;
            var o = this._aiOrigin();
            var sx = o.x;
            var sy = this._spawnY('a');
            var aim = miss ? this._aiMissTarget() : this._aiTarget();
            var vel = this._ballisticVelocity(sx, sy, aim.x, aim.y, this.G);
            st.projectiles.push(this._spawnProjectile(this.aiId, 'a', sx, sy, vel.vx, vel.vy));
            if (!miss) st.aiFill = Math.min(100, st.aiFill + this._aiPoints());
            st.aiRecoil = 6;
            st.flashA = 0.3;
        },

        _loop(ts) {
            var self = this;
            if (!this.active) return;
            if (!this._lastTs) {
                this._lastTs = ts;
                this._resize();
            }
            var dt = Math.min(0.05, (ts - this._lastTs) / 1000);
            this._lastTs = ts;
            this._tick(dt);
            this._draw();
            this._raf = requestAnimationFrame(function (t) { self._loop(t); });
        },

        _tick(dt) {
            var st = this.state;
            if (st.win != null) return;
            st.timeLeft -= dt;
            st.aiCooldown -= dt;
            st.playerRecoil = Math.max(0, st.playerRecoil - dt * 28);
            st.aiRecoil = Math.max(0, st.aiRecoil - dt * 28);
            st.flashP = Math.max(0, st.flashP - dt * 2.5);
            st.flashA = Math.max(0, st.flashA - dt * 2.5);
            st.steamPhase = (st.steamPhase || 0) + dt;
            st.arenaPhase = (st.arenaPhase || 0) + dt;

            if (st.aiCooldown <= 0) {
                this._fireAi();
                var gap = st.playerFill - st.aiFill;
                if (gap < -14) st.aiCooldown = 0.96 + Math.random() * 0.34;
                else if (gap > 18) st.aiCooldown = 0.56 + Math.random() * 0.24;
                else st.aiCooldown = 0.58 + Math.random() * 0.28;
            }

            var g = this.G;
            var i;
            for (i = st.projectiles.length - 1; i >= 0; i--) {
                var p = st.projectiles[i];
                var px = p.x;
                var py = p.y;
                p.vy += g * dt;
                p.x += p.vx * dt;
                p.y += p.vy * dt;
                p.rot += dt * (p.spin || 7);
                if (this._projectileHitsBasket(p, px, py)) {
                    st.splats.push({ x: p.x, y: p.y, glyph: p.glyph, scale: p.scale, life: 0.65, team: p.team, color: p.color });
                    this._burstParticles(p.x, p.y, p.color, 12);
                    if (p.team === 'p') {
                        var pg = st.playerFill - st.aiFill;
                        var pp = pg < -18 ? 6 : 5;
                        this._applyPlayerScore(pp);
                        this._spawnFloater(p.x, p.y - 8, '+' + pp, 'p');
                    }
                    st.projectiles.splice(i, 1);
                    try { sound.play('bubble'); } catch (e) {}
                    continue;
                }
                if (p.y > this._h + 50 || p.y < -80 || p.x < -50 || p.x > this._w + 50) st.projectiles.splice(i, 1);
            }
            for (i = st.splats.length - 1; i >= 0; i--) {
                st.splats[i].life -= dt;
                if (st.splats[i].life <= 0) st.splats.splice(i, 1);
            }
            for (i = (st.particles || []).length - 1; i >= 0; i--) {
                var pt = st.particles[i];
                pt.life -= dt;
                pt.x += pt.vx * dt;
                pt.y += pt.vy * dt;
                pt.vy += 180 * dt;
                if (pt.life <= 0) st.particles.splice(i, 1);
            }
            for (i = (st.floaters || []).length - 1; i >= 0; i--) {
                var fl = st.floaters[i];
                fl.life -= dt;
                fl.y -= 28 * dt;
                if (fl.life <= 0) st.floaters.splice(i, 1);
            }

            if (st.playerFill >= 100) this._end(true);
            else if (st.aiFill >= 100) this._end(false);
            else if (st.timeLeft <= 0) this._end(st.playerFill >= st.aiFill);
            this._syncHud();
        },

        _draw() {
            var ctx = this._ctx;
            if (!ctx || this._w <= 0 || this._h <= 0) return;
            var w = this._w;
            var h = this._h;
            var st = this.state;
            var low = this._isLowQuality();
            var phase = st.arenaPhase || 0;
            ctx.clearRect(0, 0, w, h);

            this._drawArenaBackground(w, h, low, phase);
            this._drawArenaFloor(w, h, low, phase);
            this._drawCenterLane(w, h, low);

            this._drawBasket('p', st.playerFill);
            this._drawBasket('a', st.aiFill);

            var po = this._playerOrigin();
            var ao = this._aiOrigin();
            this._drawPodium(po.x, po.y, 'p', low);
            this._drawPodium(ao.x, ao.y, 'a', low);
            this._drawHelper('player', po.x, po.y + st.playerRecoil, this._helperScale('player'), st.flashP);
            this._drawHelper('ai', ao.x, ao.y - st.aiRecoil, this._helperScale('ai'), st.flashA);
            this._drawPlayerCooldown(po.x, po.y + st.playerRecoil);

            var i;
            for (i = 0; i < st.splats.length; i++) {
                var s = st.splats[i];
                var splatA = Math.max(0, s.life * 1.6);
                ctx.globalAlpha = splatA;
                if (!low && s.color) {
                    ctx.save();
                    ctx.fillStyle = this._kitRgba(s.color, 0.22 * splatA);
                    ctx.beginPath();
                    ctx.arc(s.x, s.y, this._ingredientFontSize() * 0.28 * (s.scale || 1), 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                this._drawIngredientGlyph(s.glyph, s.x, s.y, 0, (s.scale || 1) * (0.9 + (1 - s.life) * 0.15), s.color);
                ctx.globalAlpha = 1;
            }

            for (i = 0; i < st.projectiles.length; i++) {
                var p = st.projectiles[i];
                if (!low && p.color && p.px != null) {
                    ctx.save();
                    ctx.strokeStyle = this._kitRgba(p.color, 0.45);
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(p.px, p.py);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                    ctx.restore();
                }
                if (!low && p.color) {
                    ctx.save();
                    ctx.globalAlpha = 0.4;
                    ctx.fillStyle = p.color;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y + 3, this._ingredientFontSize() * 0.18, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.restore();
                }
                this._drawIngredientGlyph(p.glyph, p.x, p.y, p.rot, p.scale, p.color);
                p.px = p.x;
                p.py = p.y;
            }

            if (!low && st.particles) {
                for (i = 0; i < st.particles.length; i++) {
                    var pt = st.particles[i];
                    ctx.globalAlpha = Math.min(1, pt.life * 2.5);
                    ctx.fillStyle = pt.color;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.globalAlpha = 1;
            }

            if (st.floaters) {
                for (i = 0; i < st.floaters.length; i++) {
                    var fl = st.floaters[i];
                    ctx.save();
                    ctx.globalAlpha = Math.min(1, fl.life * 1.4);
                    ctx.font = 'bold ' + Math.max(14, Math.round(w * 0.028)) + 'px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillStyle = fl.team === 'p' ? '#86efac' : '#fca5a5';
                    ctx.strokeStyle = 'rgba(0,0,0,0.55)';
                    ctx.lineWidth = 3;
                    ctx.strokeText(fl.text, fl.x, fl.y);
                    ctx.fillText(fl.text, fl.x, fl.y);
                    ctx.restore();
                }
            }

            if (this._aim && st.win == null) {
                this._drawAimPreview(this._aim.x, this._aim.y);
            }

            if (!low) {
                var vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.22, w * 0.5, h * 0.5, w * 0.78);
                vig.addColorStop(0, 'rgba(0,0,0,0)');
                vig.addColorStop(1, 'rgba(2,6,23,0.48)');
                ctx.fillStyle = vig;
                ctx.fillRect(0, 0, w, h);
            }
        },

        _drawArenaBackground(w, h, low, phase) {
            var ctx = this._ctx;
            var grd = ctx.createLinearGradient(0, 0, 0, h);
            grd.addColorStop(0, '#2a1f5c');
            grd.addColorStop(0.28, '#3b2a7a');
            grd.addColorStop(0.55, '#241e52');
            grd.addColorStop(1, '#0a1020');
            ctx.fillStyle = grd;
            ctx.fillRect(0, 0, w, h);

            if (low) return;

            var mist = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.08, w * 0.5, h * 0.5, w * 0.62);
            mist.addColorStop(0, 'rgba(251,191,36,0.06)');
            mist.addColorStop(1, 'rgba(251,191,36,0)');
            ctx.fillStyle = mist;
            ctx.fillRect(0, 0, w, h);

            var glowTop = ctx.createRadialGradient(w * 0.5, h * 0.08, 0, w * 0.5, h * 0.08, w * 0.5);
            glowTop.addColorStop(0, 'rgba(74,222,128,0.2)');
            glowTop.addColorStop(1, 'rgba(74,222,128,0)');
            ctx.fillStyle = glowTop;
            ctx.fillRect(0, 0, w, h);
            var glowBot = ctx.createRadialGradient(w * 0.5, h * 0.92, 0, w * 0.5, h * 0.92, w * 0.5);
            glowBot.addColorStop(0, 'rgba(248,113,113,0.18)');
            glowBot.addColorStop(1, 'rgba(248,113,113,0)');
            ctx.fillStyle = glowBot;
            ctx.fillRect(0, 0, w, h);

            ctx.strokeStyle = 'rgba(251,191,36,0.06)';
            ctx.lineWidth = 1;
            var gx, gy;
            for (gx = 0; gx < w; gx += 36) {
                ctx.beginPath();
                ctx.moveTo(gx, 0);
                ctx.lineTo(gx, h);
                ctx.stroke();
            }
            for (gy = 0; gy < h; gy += 36) {
                ctx.beginPath();
                ctx.moveTo(0, gy);
                ctx.lineTo(w, gy);
                ctx.stroke();
            }

            ctx.globalAlpha = 0.1 + Math.sin(phase * 1.2) * 0.04;
            ctx.font = Math.round(w * 0.11) + 'px serif';
            ctx.textAlign = 'center';
            ctx.fillText('🍲', w * 0.5, h * 0.5);
            ctx.globalAlpha = 1;
        },

        _drawArenaFloor(w, h, low, phase) {
            var ctx = this._ctx;
            var pad = w * 0.035;
            var fx = pad;
            var fy = h * 0.2;
            var fw = w - pad * 2;
            var fh = h * 0.62;
            ctx.save();
            ctx.fillStyle = 'rgba(8,12,28,0.72)';
            this._roundRect(fx - 4, fy - 4, fw + 8, fh + 8, 18);
            ctx.fill();
            ctx.strokeStyle = 'rgba(251,191,36,0.35)';
            ctx.lineWidth = 3;
            this._roundRect(fx - 4, fy - 4, fw + 8, fh + 8, 18);
            ctx.stroke();
            ctx.fillStyle = 'rgba(15,23,42,0.62)';
            this._roundRect(fx, fy, fw, fh, 16);
            ctx.fill();
            if (!low) {
                var tile = Math.max(20, Math.round(fw / 12));
                var row, col, tx, ty;
                for (row = 0; row < Math.ceil(fh / tile); row++) {
                    for (col = 0; col < Math.ceil(fw / tile); col++) {
                        tx = fx + col * tile;
                        ty = fy + row * tile;
                        ctx.fillStyle = (row + col) % 2 === 0 ? 'rgba(88,28,135,0.22)' : 'rgba(46,16,74,0.28)';
                        ctx.fillRect(tx, ty, tile, tile);
                    }
                }
                ctx.strokeStyle = 'rgba(251,191,36,0.28)';
                ctx.lineWidth = 2;
                this._roundRect(fx, fy, fw, fh, 16);
                ctx.stroke();
                ctx.globalAlpha = 0.12 + Math.sin(phase * 2) * 0.05;
                ctx.fillStyle = '#fde68a';
                ctx.beginPath();
                ctx.ellipse(fx + fw * 0.5, fy + fh * 0.5, fw * 0.38, fh * 0.28, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
            ctx.restore();
        },

        _drawCenterLane(w, h, low) {
            var ctx = this._ctx;
            ctx.save();
            ctx.strokeStyle = 'rgba(251,191,36,0.18)';
            ctx.lineWidth = 2;
            ctx.setLineDash([8, 16]);
            ctx.beginPath();
            ctx.moveTo(w * 0.5, h * 0.2);
            ctx.lineTo(w * 0.5, h * 0.8);
            ctx.stroke();
            ctx.setLineDash([]);
            if (!low) {
                ctx.font = Math.round(w * 0.034) + 'px "Segoe UI Emoji", sans-serif';
                ctx.textAlign = 'center';
                ctx.globalAlpha = 0.35;
                ctx.fillText('⚔', w * 0.5, h * 0.5);
                ctx.globalAlpha = 1;
            }
            ctx.restore();
        },

        _drawPodium(x, y, team, low) {
            if (low) return;
            var ctx = this._ctx;
            var col = team === 'p' ? 'rgba(74,222,128,0.35)' : 'rgba(248,113,113,0.35)';
            ctx.save();
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.ellipse(x, y + 6, this._w * 0.07, this._h * 0.018, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(15,23,42,0.5)';
            ctx.beginPath();
            ctx.ellipse(x, y + 8, this._w * 0.055, this._h * 0.012, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        },

        _drawPlayerCooldown(x, y) {
            var now = performance.now();
            var cdLeft = Math.max(0, PLAYER_CD - (now - (this._lastPlayerShot || 0)));
            if (cdLeft <= 0 || !this.state || this.state.win != null) return;
            var ctx = this._ctx;
            var t = 1 - cdLeft / PLAYER_CD;
            var r = Math.max(18, this._w * 0.042 * this._layoutMul());
            var cy = y - r * 0.35;
            ctx.save();
            ctx.strokeStyle = 'rgba(15,23,42,0.55)';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x, cy, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(251,191,36,0.75)';
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(x, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * t);
            ctx.stroke();
            ctx.restore();
        },

        _kitRgba(hex, alpha) {
            if (!hex || hex.indexOf('#') !== 0) return 'rgba(251,191,36,' + alpha + ')';
            var h = hex.slice(1);
            if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
            return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16) + ',' + alpha + ')';
        },

        _drawAimPreview(tx, ty) {
            var ctx = this._ctx;
            var o = this._playerOrigin();
            var sx = o.x;
            var sy = this._spawnY('p');
            var g = this.G;
            var vel = this._ballisticVelocity(sx, sy, tx, ty, g);
            var kitCol = this.ch ? this.kit(this.ch.id).color : '#fbbf24';
            var now = performance.now();
            var onCd = now - (this._lastPlayerShot || 0) < PLAYER_CD;
            var alpha = onCd ? 0.28 : 0.82;
            var steps = 28;
            var dt = vel.T / steps;
            var x = sx;
            var y = sy;
            var vx = vel.vx;
            var vy = vel.vy;
            ctx.strokeStyle = this._kitRgba(kitCol, alpha);
            ctx.lineWidth = 2.5;
            ctx.setLineDash([5, 7]);
            ctx.beginPath();
            ctx.moveTo(x, y);
            var i;
            for (i = 0; i < steps; i++) {
                x += vx * dt;
                y += vy * dt;
                vy += g * dt;
                ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.strokeStyle = onCd ? 'rgba(148,163,184,0.65)' : kitCol;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(tx, ty, 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(tx - 14, ty);
            ctx.lineTo(tx + 14, ty);
            ctx.moveTo(tx, ty - 14);
            ctx.lineTo(tx, ty + 14);
            ctx.stroke();
        },

        _drawBasketSteam(b, fill, team) {
            if (fill < 12 || this._isLowQuality()) return;
            var ctx = this._ctx;
            var phase = this.state.steamPhase || 0;
            var n = Math.min(5, 2 + Math.floor(fill / 28));
            var i;
            for (i = 0; i < n; i++) {
                var t = (phase * (0.55 + i * 0.11) + i * 1.7) % 1;
                var sx = b.x + b.w * (n > 1 ? 0.22 + (i * 0.56 / (n - 1)) : 0.5);
                var sy = b.y + b.h * (1 - fill / 100) - 6 - t * b.h * 0.55;
                var r = 3 + t * 5 + (i % 2);
                ctx.globalAlpha = (1 - t) * 0.28;
                ctx.fillStyle = team === 'p' ? '#bbf7d0' : '#fecaca';
                ctx.beginPath();
                ctx.arc(sx, sy, r, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        },

        _drawBasket(team, fill) {
            var b = this._basketRect(team);
            var ctx = this._ctx;
            var label = team === 'p' ? t('skirmish_your_basket') : t('skirmish_rival_basket');
            var rim = team === 'p' ? '#4ade80' : '#f87171';
            var rimDark = team === 'p' ? '#15803d' : '#991b1b';
            var liquidTop = team === 'p' ? '#86efac' : '#fca5a5';
            var liquidBot = team === 'p' ? '#15803d' : '#b91c1c';
            var low = this._isLowQuality();
            var cx = b.x + b.w / 2;
            var phase = this.state.steamPhase || 0;
            var potH = b.h * 1.08;
            var potY = b.y - b.h * 0.04;

            if (!low) {
                ctx.save();
                ctx.globalAlpha = 0.28 + fill * 0.004;
                ctx.fillStyle = team === 'p' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)';
                ctx.beginPath();
                ctx.ellipse(cx, potY + potH * 0.55, b.w * 0.62, potH * 0.78, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }

            ctx.save();
            ctx.fillStyle = '#292524';
            ctx.strokeStyle = rimDark;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(b.x + b.w * 0.08, potY + potH * 0.18);
            ctx.quadraticCurveTo(b.x - b.w * 0.02, potY + potH * 0.55, b.x + b.w * 0.12, potY + potH * 0.92);
            ctx.lineTo(b.x + b.w * 0.88, potY + potH * 0.92);
            ctx.quadraticCurveTo(b.x + b.w * 1.02, potY + potH * 0.55, b.x + b.w * 0.92, potY + potH * 0.18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.strokeStyle = rim;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.moveTo(b.x + b.w * 0.06, potY + potH * 0.2);
            ctx.quadraticCurveTo(cx, potY + potH * 0.08, b.x + b.w * 0.94, potY + potH * 0.2);
            ctx.stroke();

            if (!low) {
                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(b.x - b.w * 0.04, potY + potH * 0.42, b.w * 0.07, -Math.PI * 0.35, Math.PI * 0.35);
                ctx.stroke();
                ctx.beginPath();
                ctx.arc(b.x + b.w * 1.04, potY + potH * 0.42, b.w * 0.07, Math.PI * 0.65, Math.PI * 1.35);
                ctx.stroke();
            }
            ctx.restore();

            var fh = Math.max(0, potH * (fill / 100) * 0.72);
            if (fh > 3) {
                var ly = potY + potH * 0.92 - fh;
                var lg = ctx.createLinearGradient(0, ly, 0, ly + fh);
                lg.addColorStop(0, liquidTop);
                lg.addColorStop(1, liquidBot);
                ctx.save();
                ctx.fillStyle = lg;
                ctx.beginPath();
                ctx.moveTo(b.x + b.w * 0.14, ly + fh);
                ctx.lineTo(b.x + b.w * 0.14, ly + 4);
                ctx.quadraticCurveTo(cx, ly - 4 + Math.sin(phase * 4) * 2, b.x + b.w * 0.86, ly + 4);
                ctx.lineTo(b.x + b.w * 0.86, ly + fh);
                ctx.closePath();
                ctx.fill();
                if (!low && fill > 20) {
                    ctx.fillStyle = 'rgba(255,255,255,0.2)';
                    ctx.beginPath();
                    ctx.ellipse(cx + Math.sin(phase * 3) * 4, ly + 6, b.w * 0.14, 4, 0, 0, Math.PI * 2);
                    ctx.fill();
                    if (fill > 55) {
                        ctx.globalAlpha = 0.35 + Math.sin(phase * 6) * 0.15;
                        ctx.fillStyle = '#fff';
                        for (var bub = 0; bub < 3; bub++) {
                            var bt = (phase * 0.8 + bub * 0.33) % 1;
                            ctx.beginPath();
                            ctx.arc(b.x + b.w * (0.3 + bub * 0.2), ly + fh - bt * fh * 0.7, 2 + bt * 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        ctx.globalAlpha = 1;
                    }
                }
                ctx.restore();
            }

            this._drawBasketSteam(b, fill, team);

            ctx.fillStyle = '#fef3c7';
            ctx.font = 'bold ' + Math.max(12, Math.round(b.w * 0.05)) + 'px sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0,0,0,0.7)';
            ctx.shadowBlur = 5;
            ctx.fillText(Math.round(fill) + '%', cx, potY + potH * 0.58);
            ctx.shadowBlur = 0;
            ctx.font = 'bold ' + Math.max(10, Math.round(b.w * (this._mobileLandscape() ? 0.048 : 0.038))) + 'px sans-serif';
            ctx.fillStyle = team === 'p' ? '#86efac' : '#fca5a5';
            ctx.fillText(label, cx, potY + (this._mobileLandscape() ? 2 : -8));
        },

        _roundRect(x, y, w, h, r) {
            var ctx = this._ctx;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
        },

        _drawHelper(key, x, y, scale, flash) {
            var im = this._imgs[key] || this._imgs.chef;
            if (!im || !im.complete) return;
            var ctx = this._ctx;
            var dw = im.width * scale;
            var dh = im.height * scale;
            var low = this._isLowQuality();
            if (!low) {
                ctx.save();
                ctx.fillStyle = 'rgba(0,0,0,0.32)';
                ctx.beginPath();
                ctx.ellipse(x, y + 4, dw * 0.4, dh * 0.07, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            if (flash > 0 && !low) {
                ctx.save();
                ctx.strokeStyle = 'rgba(251,191,36,' + (0.35 + flash * 0.45) + ')';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.ellipse(x, y - dh * 0.45, dw * 0.42, dh * 0.48, 0, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
            }
            if (flash > 0) {
                ctx.shadowColor = '#fbbf24';
                ctx.shadowBlur = 28 * flash;
            }
            ctx.drawImage(im, x - dw / 2, y - dh, dw, dh);
            ctx.shadowBlur = 0;
        },

        _syncHud() {
            var st = this.state;
            var tEl = document.getElementById('skirmish-timer');
            var pEl = document.getElementById('skirmish-player-fill');
            var aEl = document.getElementById('skirmish-ai-fill');
            var pPct = document.getElementById('skirmish-player-pct');
            var aPct = document.getElementById('skirmish-ai-pct');
            var secs = Math.max(0, Math.ceil(st.timeLeft));
            if (tEl) {
                tEl.textContent = secs;
                tEl.classList.toggle('skirmish-timer-low', secs > 0 && secs <= 15);
            }
            if (pEl) pEl.style.width = st.playerFill + '%';
            if (aEl) aEl.style.width = st.aiFill + '%';
            if (pPct) pPct.textContent = Math.round(st.playerFill) + '%';
            if (aPct) aPct.textContent = Math.round(st.aiFill) + '%';
        },

        _end(won) {
            var st = this.state;
            st.win = won;
            this.stopLoop();
            var play = document.getElementById('skirmish-play');
            if (play) play.style.display = 'none';
            var pe = document.getElementById('skirmish-end');
            if (!pe) return;
            pe.style.display = 'flex';
            pe.classList.remove('skirmish-end-win', 'skirmish-end-loss', 'ceremony-playing', 'ceremony-done', 'emblem-drop');
            pe.classList.add(won ? 'skirmish-end-win' : 'skirmish-end-loss');
            var rank = document.getElementById('skirmish-rank');
            var rew = document.getElementById('skirmish-reward');
            var det = document.getElementById('skirmish-reward-detail');
            var box = document.getElementById('skirmish-reward-box');
            var icon = document.getElementById('skirmish-reward-icon');
            if (box) box.classList.toggle('defeat', !won);
            if (icon) icon.textContent = won ? '🍲' : '🥄';
            var mult = 1 + game.s * 0.35;
            var eb = Math.floor((won ? 6000 : 2000) * mult);
            if (won) {
                try {
                    var bond = helperBond.prixStirMult(this.ch.id);
                    if (bond > 1) eb = Math.floor(eb * bond);
                } catch (e) {}
                game.e += eb;
                game.te += eb;
                game.track('eb', eb);
                try { helperBond.add(this.ch.id, 5); } catch (e1) {}
                if (rank) rank.textContent = t('skirmish_win_title');
                if (rew) rew.textContent = t('skirmish_win_reward', { eb: eb.toLocaleString() });
                if (det) det.textContent = t('skirmish_win_detail');
                try { sound.play('victory'); } catch (e2) {}
                this._pendingReward = t('skirmish_win_toast', { eb: eb.toLocaleString() });
                this._playWinCeremony();
            } else {
                game.e += eb;
                game.te += eb;
                game.track('eb', eb);
                try { if (this.ch) helperBond.add(this.ch.id, 2, true); } catch (e0) {}
                if (rank) rank.textContent = t('skirmish_loss_title');
                if (rew) rew.textContent = t('skirmish_loss_reward', { eb: eb.toLocaleString() });
                if (det) det.textContent = t('skirmish_loss_detail');
                this._pendingReward = t('skirmish_loss_toast', { eb: eb.toLocaleString() });
            }
            try { game.save(); } catch (e3) {}
        }
    };
})(typeof window !== 'undefined' ? window : global);
