/* In-game leaderboard panel — global lbUI. */
(function (global) {
    'use strict';

    global.lbUI = {
            board: 'score',
            _token: 0,
            _cache: {},
            _fadeT: null,
            _heightT: null,
            PLAT: { youtube: '📺', steam: '🎮', android: '🤖', ios: '🍎', web: '🌐' },
            CREATOR_ID: '1832ff16-5fec-4afd-b570-f950e19eb434',
            CREATOR_NAME: 'smallcreekskullchef',
            isCreator(r) {
                if (!r) return false;
                if (r.id && String(r.id).toLowerCase() === this.CREATOR_ID) return true;
                return !!(r.name && String(r.name).toLowerCase() === this.CREATOR_NAME);
            },
            open() {
                const m = document.getElementById('lb-modal'); if (!m) return;
                const inp = document.getElementById('lb-name-input');
                try { if (inp) inp.value = leaderboard.identity().name || ''; } catch (e) {}
                m.classList.add('open');
                this.render();
            },
            close() { const m = document.getElementById('lb-modal'); if (m) m.classList.remove('open'); },
            setBoard(b) { this.board = (b === 'prestige' || b === 'prix') ? b : 'score'; this.render(); },
            syncTabs() {
                document.querySelectorAll('#lb-modal .lb-tab').forEach(el => {
                    el.classList.toggle('active', el.dataset.board === this.board);
                });
            },
            refreshName() {
                const inp = document.getElementById('lb-name-input');
                try { if (inp) inp.value = leaderboard.identity().name || ''; } catch (e) {}
            },
            saveName() {
                const inp = document.getElementById('lb-name-input'); if (!inp) return;
                const raw = inp.value;
                const btn = inp.parentNode ? inp.parentNode.querySelector('button') : null;
                const doClaim = () => {
                if (btn) btn.disabled = true;
                let p; try { p = leaderboard.claimName(raw); } catch (e) { p = Promise.reject('INVALID'); }
                Promise.resolve(p).then(nm => {
                    if (btn) btn.disabled = false;
                    inp.value = nm;
                    gx.toast(t('lb_name_saved', { name: nm }));
                    this.render();
                }).catch(reason => {
                    if (btn) btn.disabled = false;
                    if (reason === 'NAME_TAKEN') gx.toast(t('name_taken'));
                    else if (reason === 'OFFLINE') { gx.toast(t('name_offline_saved')); this.refreshName(); }
                    else gx.toast(t('lb_name_invalid'));
                    this.render();
                });
                };
                try {
                    privacyConsent.gate(doClaim, () => { if (btn) btn.disabled = false; });
                } catch (e) { doClaim(); }
            },
            fmtVal(board, v) {
                let n = Number(v); if (!isFinite(n)) n = 0;
                return Math.floor(n).toLocaleString();
            },
            esc(s) { return String(s == null ? '' : s).replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c])); },
            _reduceMotion() {
                try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
            },
            _rowsHtml(board, rows) {
                if (!rows || !rows.length) return `<div class="lb-msg">${t('lb_empty')}</div>`;
                const creatorRows = rows.filter(r => this.isCreator(r));
                const others = rows.filter(r => !this.isCreator(r));
                const ordered = creatorRows.concat(others);
                let rankNum = 0;
                return ordered.map(r => {
                    const isC = this.isCreator(r);
                    const plat = this.PLAT[r.platform] || '🌐';
                    const badge = isC ? `<span class="lb-creator-badge" title="${this.esc(t('creator_badge_title'))}">👑 ${this.esc(t('creator_badge'))}</span>` : '';
                    const rankCell = isC ? '👑' : ('#' + (++rankNum));
                    return `<div class="lb-row ${r.you ? 'you' : ''}"><span class="lb-rank">${rankCell}</span><span class="lb-plat">${plat}</span><span class="lb-name"><span class="lb-name-txt">${this.esc(r.name)}${r.you ? ' ★' : ''}</span>${badge}</span><span class="lb-val">${this.fmtVal(board, r.value)}</span></div>`;
                }).join('');
            },
            _paint(list, html) {
                if (list._lbHtml === html) return;
                list._lbHtml = html;
                if (this._reduceMotion()) { list.innerHTML = html; return; }
                clearTimeout(this._fadeT);
                clearTimeout(this._heightT);
                const fromH = list.offsetHeight;
                list.classList.add('lb-fading');
                this._fadeT = setTimeout(() => {
                    list.innerHTML = html;
                    list.scrollTop = 0;
                    const toH = list.offsetHeight;
                    list.classList.add('lb-animh');
                    list.style.height = fromH + 'px';
                    void list.offsetHeight;
                    list.classList.remove('lb-fading');
                    list.style.height = toH + 'px';
                    this._heightT = setTimeout(() => {
                        list.classList.remove('lb-animh');
                        list.style.height = '';
                    }, 240);
                }, 150);
            },
            render() {
                this.syncTabs();
                let live = false;
                try { live = !!leaderboard.isLive(); } catch (e) {}
                const note = document.getElementById('lb-note');
                if (note) note.textContent = live ? '' : t('lb_offline');
                const list = document.getElementById('lb-list'); if (!list) return;
                const board = this.board;
                const token = ++this._token;
                const cached = this._cache[board];
                this._paint(list, cached ? this._rowsHtml(board, cached) : `<div class="lb-msg">${t('lb_loading')}</div>`);
                let p;
                try { p = leaderboard.top(board, 50); } catch (e) { p = Promise.resolve([]); }
                Promise.resolve(p).then(rows => {
                    if (token !== this._token) return;
                    this._cache[board] = rows || [];
                    this._paint(list, this._rowsHtml(board, rows));
                }).catch(() => {
                    if (token !== this._token) return;
                    if (!cached) this._paint(list, `<div class="lb-msg">${t('lb_empty')}</div>`);
                });
            }
        };

    try { leaderboard.openPanel = function () { global.lbUI.open(); }; } catch (e) {}
})(typeof window !== 'undefined' ? window : this);
