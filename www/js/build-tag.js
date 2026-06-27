/* BUILD_V tag — bump with version.json + sw.js. Update check lives in index.html head. */
(function (global) {
    'use strict';

    var BUILD_V = 'build-353';
    global.BUILD_V = BUILD_V;

    function isMobileBrowserTab() {
        try {
            var standalone = (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches)
                || global.navigator.standalone === true;
            if (standalone) return false;
            if (global.matchMedia('(pointer: coarse)').matches && (global.innerWidth || 9999) <= 980) return true;
            if (global.matchMedia('(orientation: portrait) and (max-width: 768px)').matches) return true;
        } catch (e) {}
        return false;
    }

    function isPhoneUi() {
        try {
            if (typeof mobileUI !== 'undefined' && mobileUI.isPhone && mobileUI.isPhone()) return true;
        } catch (e) {}
        try {
            var standalone = (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches)
                || global.navigator.standalone === true;
            if (global.matchMedia('(pointer: coarse)').matches && (global.innerWidth || 9999) <= 980) return true;
            if (global.matchMedia('(orientation: portrait) and (max-width: 768px)').matches) return true;
        } catch (e) {}
        return false;
    }

    function paintBuildTag() {
        try {
            var prod = (typeof PRODUCTION_BUILD !== 'undefined' && PRODUCTION_BUILD)
                || (typeof SC_LOCAL_DEV !== 'undefined' && !SC_LOCAL_DEV);
            var mobTab = isMobileBrowserTab();
            var phoneUi = isPhoneUi();
            var b = document.getElementById('build-tag');
            if (b) {
                if (prod && !phoneUi) {
                    b.style.display = 'none';
                    b.textContent = '';
                } else if (phoneUi) {
                    b.style.display = 'block';
                    b.textContent = BUILD_V;
                    b.style.left = 'max(8px, env(safe-area-inset-left))';
                    b.style.right = 'auto';
                    b.style.transform = 'none';
                    b.style.bottom = mobTab
                        ? 'max(54px, calc(env(safe-area-inset-bottom) + 46px))'
                        : 'max(8px, env(safe-area-inset-bottom))';
                    b.style.fontSize = '10px';
                    b.style.opacity = '0.8';
                    b.style.zIndex = '100001';
                } else {
                    b.style.display = '';
                    b.textContent = BUILD_V;
                    b.style.left = '';
                    b.style.right = '';
                    b.style.transform = '';
                    b.style.bottom = '';
                    b.style.fontSize = '';
                    b.style.opacity = '';
                }
            }
            var hv = document.getElementById('home-version');
            if (hv && typeof VERSION !== 'undefined') {
                if (prod && phoneUi) {
                    hv.textContent = VERSION + ' · ' + BUILD_V;
                } else {
                    hv.textContent = (typeof home !== 'undefined' && home.versionLabel)
                        ? home.versionLabel()
                        : (prod ? VERSION : (VERSION + ' · ' + BUILD_V));
                }
            }
        } catch (e) {}
    }

    global.__scPaintBuildTag = paintBuildTag;
    paintBuildTag();
    try {
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintBuildTag);
        global.addEventListener('resize', paintBuildTag, { passive: true });
        global.addEventListener('orientationchange', function () { setTimeout(paintBuildTag, 120); }, { passive: true });
    } catch (e) {}
})(typeof window !== 'undefined' ? window : this);
