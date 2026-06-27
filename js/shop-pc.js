/* PC shop column collapse toggle (build-318). */
(function (global) {
    'use strict';

    function toggleShopPC() {
        var c = document.body.classList.toggle('shop-collapsed');
        try { localStorage.setItem('sc_shop_collapsed', c ? '1' : '0'); } catch (e) {}
    }

    function init() {
        try {
            if (localStorage.getItem('sc_shop_collapsed') === '1') document.body.classList.add('shop-collapsed');
        } catch (e) {}
    }

    global.toggleShopPC = toggleShopPC;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
    else init();
})(typeof window !== 'undefined' ? window : this);
