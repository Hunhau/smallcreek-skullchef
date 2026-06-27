/* Cameos / visitantes Esqueletia — APAGADO hasta update post-launch.
   Ver docs/VISITANTES_ROADMAP.md */
(function (global) {
    'use strict';

    var ENABLED = false;

    global.visitors = {
        enabled: function () { return ENABLED; },
        defs: [],
        init: function () {
            if (!ENABLED) return;
        },
        tick: function () {
            if (!ENABLED) return;
        },
        maybeSpawn: function () {
            if (!ENABLED) return null;
            return null;
        },
        trigger: function () {
            if (!ENABLED) return;
        }
    };
})(typeof window !== 'undefined' ? window : this);
