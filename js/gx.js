/* Toast queue — global gx. */
(function (global) {
    'use strict';

    global.gx = {
            _tq: [],
            _tBusy: false,
            _tWaitStart: 0,
            toast(msg) {
                if (msg == null) return;
                this._tq.push(String(msg));
                this._tPump();
            },
            _helperBusy() {
                try {
                    if (document.querySelector('.summon-clone')) return true;
                    if (document.querySelector('.ingredient-proj:not(.ingredient-proj-dry)')) return true;
                    if (typeof game !== 'undefined' && game._chefFeedInProgress && game._chefFeedInProgress()) return true;
                    const vc = document.getElementById('victory-cinema');
                    if (vc) { const d = getComputedStyle(vc).display; if (d && d !== 'none') return true; }
                } catch (e) {}
                return false;
            },
            _tPump() {
                if (this._tBusy) return;
                const w = document.getElementById('gx-toast-wrap');
                if (!w) { this._tq = []; return; }
                if (!this._tq.length) { this._tWaitStart = 0; return; }
                if (this._helperBusy()) {
                    if (!this._tWaitStart) this._tWaitStart = Date.now();
                    if (Date.now() - this._tWaitStart < 9000) { setTimeout(() => this._tPump(), 350); return; }
                }
                this._tWaitStart = 0;
                this._tBusy = true;
                const el = document.createElement('div');
                el.className = 'gx-toast';
                el.textContent = this._tq.shift();
                w.appendChild(el);
                setTimeout(() => {
                    el.classList.add('gx-toast-out');
                    setTimeout(() => {
                        if (el.parentNode) el.remove();
                        this._tBusy = false;
                        setTimeout(() => this._tPump(), 160);
                    }, 470);
                }, 2200);
            }
        };
})(typeof window !== 'undefined' ? window : this);
