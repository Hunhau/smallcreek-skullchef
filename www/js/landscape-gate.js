/* Portrait playable — legacy rotate overlay shim. */
(function (global) {
    'use strict';

    var ROTATE_DISMISS_KEY = 'soup_rotate_dismissed_v1';

    global.landscapeGate = {
        run(cb) { try { if (typeof cb === 'function') cb(); } catch (e) {} }
    };

    global.applyRotateDismissOnBoot = function () {
        try { localStorage.removeItem(ROTATE_DISMISS_KEY); } catch (e) {}
        try {
            const ov = document.getElementById('rotate-overlay');
            if (ov) { ov.classList.remove('dismissed'); if (ov.style.display) ov.style.display = 'none'; }
        } catch (e) {}
    };
})(typeof window !== 'undefined' ? window : this);
