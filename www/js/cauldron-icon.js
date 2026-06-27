/* Caldero (olla) — sustituto del emoji 🍲 en chips, modales y canvas. */
(function (root) {
    const SRC = 'assets/img/icons/cauldron-sticker-64.png';
    const SRC_LG = 'assets/img/icons/cauldron-sticker-128.png';
    let _img = null;
    let _ready = false;

    function preload() {
        if (_img) return _img;
        _img = new Image();
        _img.decoding = 'async';
        _img.onload = function () { _ready = true; };
        _img.src = SRC;
        return _img;
    }

    function html(cls) {
        cls = cls || 'sc-cauldron-icon';
        return '<img class="' + cls + '" src="' + SRC + '" alt="" aria-hidden="true" decoding="async">';
    }

    function htmlLg(cls) {
        cls = cls || 'sc-cauldron-icon sc-cauldron-icon-lg';
        return '<img class="' + cls + '" src="' + SRC_LG + '" alt="" aria-hidden="true" decoding="async">';
    }

    function apply(el, large) {
        if (!el) return;
        el.innerHTML = large ? htmlLg() : html();
    }

    function prefixText(text) {
        return html('sc-cauldron-icon sc-cauldron-inline') + ' ' + (text || '');
    }

    function draw(ctx, cx, cy, size) {
        const img = preload();
        if (_ready && img.complete && img.naturalWidth) {
            ctx.drawImage(img, cx - size * 0.5, cy - size * 0.5, size, size);
        }
    }

    function rewardIcon(id, emoji) {
        return id === 'brew2' ? html('sc-cauldron-icon sc-cauldron-reward') : emoji;
    }

    function pathIcon(p) {
        return (p && p.id === 'cauldron') ? html('sc-cauldron-icon sc-cauldron-path') : ((p && p.emoji) || '🗺️');
    }

    function ambIcon(def) {
        return (def && def.id === 'soup') ? html('sc-cauldron-icon sc-cauldron-amb') : ((def && def.icon) || '');
    }

    function regionIcon(r) {
        return (r && r.id === 'cauldron_core') ? html('sc-cauldron-icon sc-cauldron-path') : ((r && r.emoji) || '🗺️');
    }

    function setGoalIcon(el, icon) {
        if (!el) return;
        if (icon === '🍲') apply(el, false);
        else el.textContent = icon || '🎯';
    }

    preload();

    root.scCauldronIcon = {
        SRC, SRC_LG, html, htmlLg, apply, prefixText, draw, preload,
        rewardIcon, pathIcon, ambIcon, regionIcon, setGoalIcon,
        isSoupEmoji: function (v) { return v === '🍲'; }
    };
})(typeof window !== 'undefined' ? window : this);
