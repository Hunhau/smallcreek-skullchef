/* BUILD_V tag — bump with version.json + sw.js. Update check lives in index.html head. */
(function (global) {
    'use strict';

    var BUILD_V = 'build-342';
    global.BUILD_V = BUILD_V;

    function paintBuildTag() {
        try {
            var prod = (typeof PRODUCTION_BUILD !== 'undefined' && PRODUCTION_BUILD)
                || (typeof SC_LOCAL_DEV !== 'undefined' && !SC_LOCAL_DEV);
            var b = document.getElementById('build-tag');
            if (b) {
                if (prod) { b.style.display = 'none'; b.textContent = ''; }
                else { b.style.display = ''; b.textContent = BUILD_V; }
            }
            var hv = document.getElementById('home-version');
            if (hv && typeof VERSION !== 'undefined') {
                hv.textContent = (typeof home !== 'undefined' && home.versionLabel)
                    ? home.versionLabel()
                    : (prod ? VERSION : (VERSION + ' · ' + BUILD_V));
            }
        } catch (e) {}
    }

    paintBuildTag();
    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintBuildTag);
        else paintBuildTag();
    } catch (e) {}
})(typeof window !== 'undefined' ? window : this);
