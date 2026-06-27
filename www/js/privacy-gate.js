/* Privacy consent + first-run chef name gate (leaderboard). */
(function (global) {
    'use strict';

    const privacyConsent = {
        KEY: 'soup_privacy_consent_v1',
        _onAgree: null, _onDecline: null, _sessionDeferred: false,
        has() {
            try { if (localStorage.getItem(this.KEY) === '1') return true; } catch (e) {}
            try { if (leaderboard.hasName()) return true; } catch (e) {}
            return false;
        },
        _store() { try { localStorage.setItem(this.KEY, '1'); } catch (e) {} },
        gate(onAgree, onDecline, opts) {
            const agree = (typeof onAgree === 'function') ? onAgree : function () {};
            const decline = (typeof onDecline === 'function') ? onDecline : function () {};
            try {
                if (this.has()) { agree(); return; }
                if (opts && opts.auto && this._sessionDeferred) { decline(); return; }
                const m = document.getElementById('privacy-consent-modal');
                if (!m) { decline(); return; }
                this._onAgree = agree; this._onDecline = decline;
                m.classList.add('open');
            } catch (e) { try { decline(); } catch (e2) {} }
        },
        _close() { try { const m = document.getElementById('privacy-consent-modal'); if (m) m.classList.remove('open'); } catch (e) {} },
        agree() {
            try { sound.touchAudioIfOn(); } catch (e) {}
            this._store(); this._close();
            const cb = this._onAgree; this._onAgree = null; this._onDecline = null;
            if (cb) { try { cb(); } catch (e) {} }
        },
        decline() {
            try { sound.touchAudioIfOn(); } catch (e) {}
            this._sessionDeferred = true; this._close();
            const cb = this._onDecline; this._onDecline = null; this._onAgree = null;
            if (cb) { try { cb(); } catch (e) {} }
            try { gx.toast(t('privacy_offline_toast')); } catch (e) {}
        }
    };

    const nameGate = {
        _onDone: null, _busy: false, _t: null, _ct: 0,
        needsName() { try { return !!leaderboard.isLive() && !leaderboard.hasName(); } catch (e) { return false; } },
        ensure(onDone) {
            this._onDone = (typeof onDone === 'function') ? onDone : function () {};
            if (!this.needsName()) { this._finish(); return; }
            let prov = false; try { prov = leaderboard.isProvisional(); } catch (e) {}
            if (prov) { this._finish(); this._bgReclaim(); return; }
            try {
                privacyConsent.gate(
                    () => this.open(true),
                    () => { this._finish(); },
                    { auto: true }
                );
            } catch (e) { this._finish(); }
        },
        _finish() {
            try { sound.touchAudioIfOn(); } catch (e) {}
            const cb = this._onDone; this._onDone = null; if (cb) { try { cb(); } catch (e) {} }
        },
        open(firstRun) {
            const m = document.getElementById('name-modal'); if (!m) { this._finish(); return; }
            const inp = document.getElementById('name-input');
            if (inp) {
                let cur = '';
                try { const id = leaderboard.identity(); if (id && id.name && !/^chef/i.test(id.name)) cur = id.name; } catch (e) {}
                inp.value = cur;
            }
            this._setStatus('', '');
            const btn = document.getElementById('name-confirm'); if (btn) btn.disabled = true;
            m.classList.add('open');
            setTimeout(() => { try { if (inp) inp.focus(); } catch (e) {} }, 40);
            if (inp && inp.value) this._scheduleCheck();
        },
        close() { const m = document.getElementById('name-modal'); if (m) m.classList.remove('open'); },
        _setStatus(key, cls) {
            const s = document.getElementById('name-status'); if (!s) return;
            s.textContent = key ? t(key) : '';
            s.style.color = cls === 'ok' ? '#34d399' : (cls === 'bad' ? '#f87171' : '#fbbf24');
        },
        onInput() { this._scheduleCheck(); },
        _scheduleCheck() {
            if (this._t) clearTimeout(this._t);
            const inp = document.getElementById('name-input'); if (!inp) return;
            const raw = inp.value;
            const clean = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
            const btn = document.getElementById('name-confirm');
            if (clean.length < 3) { this._setStatus('name_too_short', 'bad'); if (btn) btn.disabled = true; return; }
            if (/^chef$/i.test(clean) || /^smallcreekskullchef$/i.test(clean.replace(/\s+/g, ''))) { this._setStatus('name_reserved', 'bad'); if (btn) btn.disabled = true; return; }
            this._setStatus('name_checking', '');
            if (btn) btn.disabled = false;
            const token = ++this._ct;
            this._t = setTimeout(() => {
                let p; try { p = leaderboard.checkName(raw); } catch (e) { p = Promise.resolve(true); }
                Promise.resolve(p).then(ok => {
                    if (token !== this._ct) return;
                    this._setStatus(ok ? 'name_available' : 'name_taken', ok ? 'ok' : 'bad');
                }).catch(() => {});
            }, 350);
        },
        confirm() {
            if (this._busy) return;
            try { sound.touchAudioIfOn(); } catch (e) {}
            const inp = document.getElementById('name-input'); if (!inp) return;
            const raw = inp.value;
            const btn = document.getElementById('name-confirm');
            this._busy = true; if (btn) btn.disabled = true;
            this._setStatus('name_checking', '');
            let p; try { p = leaderboard.claimName(raw); } catch (e) { p = Promise.reject('INVALID'); }
            Promise.resolve(p).then(nm => {
                this._busy = false; if (btn) btn.disabled = false;
                this.close();
                try { gx.toast(t('lb_name_saved', { name: nm })); } catch (e) {}
                try { const lbm = document.getElementById('lb-modal'); if (lbm && lbm.classList.contains('open')) lbUI.refreshName(); } catch (e) {}
                this._finish();
            }).catch(reason => {
                this._busy = false; if (btn) btn.disabled = false;
                if (reason === 'NAME_TAKEN') this._setStatus('name_taken', 'bad');
                else if (reason === 'INVALID') this._setStatus('name_invalid', 'bad');
                else { try { gx.toast(t('name_offline_saved')); } catch (e) {} this.close(); this._finish(); }
            });
        },
        _bgReclaim() {
            try {
                leaderboard.reclaim().then(st => {
                    if (st === 'taken') { try { gx.toast(t('name_retry')); } catch (e) {} this.open(false); }
                }).catch(() => {});
            } catch (e) {}
        }
    };

    global.privacyConsent = privacyConsent;
    global.nameGate = nameGate;
})(typeof window !== 'undefined' ? window : this);
