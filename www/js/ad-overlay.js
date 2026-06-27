/* Simulated rewarded-ad countdown overlay (web / testing). */
(function (global) {
    'use strict';

    global.adOverlay = {
        _node: null, _timer: null,
        play(seconds, onReward, onFail) {
            this.playThen(seconds, onReward, onFail);
        },
        playThen(seconds, onDone, onFail) {
            if (this._node) this._close();
            let left = Math.max(1, Math.floor(seconds) || 3);
            const ov = document.createElement('div');
            ov.className = 'ad-sim-overlay';
            ov.innerHTML = '<div class="ad-sim-box">'
                + '<div class="ad-sim-tag">' + t('ad_sim_label') + '</div>'
                + '<div class="ad-sim-count">' + left + '</div>'
                + '<div class="ad-sim-hint">' + t('ad_sim_hint') + '</div>'
                + '</div>';
            document.body.appendChild(ov);
            this._node = ov;
            const countEl = ov.querySelector('.ad-sim-count');
            const self = this;
            this._timer = setInterval(function () {
                left--;
                if (left > 0) { if (countEl) countEl.textContent = left; return; }
                self._close();
                if (typeof onDone === 'function') onDone();
            }, 1000);
        },
        _close() {
            if (this._timer) { clearInterval(this._timer); this._timer = null; }
            if (this._node && this._node.parentNode) this._node.remove();
            this._node = null;
        }
    };
})(typeof window !== 'undefined' ? window : this);
