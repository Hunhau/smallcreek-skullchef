/* Cameos / visitantes de Esqueletia — capa AISLADA y de bajo riesgo.
   Ver docs/VISITANTES_ROADMAP.md

   Diseño (no romper):
   - Solo se activa en LOCAL/LAN (window.SC_LOCAL_DEV). En producción web: OFF.
   - NO toca el guardado de ayudantes (game.cp) ni la economía base.
   - Efectos SOLO temporales vía cpsMult()/clickMult(), igual patrón que softEvents.
   - No usa el sistema de audio (frágil): solo animación DOM + toast.
   - Su propio temporizador (setInterval), su propio CSS inyectado, su propio
     overlay con pointer-events:none (nunca bloquea clics → sin ghost-clicks).
   - Estado en memoria (no se persiste). Si algo falla, el juego sigue igual. */
(function (global) {
    'use strict';

    // Interruptor maestro. DORMIDO: el camino está preparado (módulo + hooks),
    // pero no spawnea nada hasta poner esto en true (y solo afecta a local).
    var MASTER_ON = false;

    function isLocal() {
        return !!(global.SC_LOCAL_DEV === true);
    }
    function ENABLED() {
        return MASTER_ON && isLocal();
    }

    function lang() {
        try { return (global.LANG === 'es') ? 'es' : 'en'; } catch (e) { return 'en'; }
    }

    // Catálogo inicial (piloto). Efectos temporales suaves, nunca permanentes.
    var DEFS = [
        {
            id: 'frog',
            emoji: '🐸',
            name_en: 'The Frog',
            name_es: 'La Rana',
            lore_en: 'The Frog hopped by and gobbled the bugs in the broth!',
            lore_es: '¡La Rana pasó y se zampó los bichos del caldo!',
            cps: 1.20,        // +20% CPS temporal
            click: 1.0,
            durationMs: 25000,
            cooldownMs: 180000,
            spawnChancePerTick: 0.012
        }
    ];

    var state = {
        active: null,     // def en curso (efecto aplicado)
        until: 0,         // timestamp fin de efecto
        cooldownUntil: 0, // no spawnear antes de esto
        iv: null,
        started: false
    };

    function now() { return Date.now(); }

    function injectCss() {
        if (document.getElementById('sc-visitors-css')) return;
        var st = document.createElement('style');
        st.id = 'sc-visitors-css';
        st.textContent =
            '#sc-visitor-layer{position:fixed;left:0;right:0;bottom:14vh;z-index:90000;' +
            'pointer-events:none;display:flex;justify-content:center;align-items:flex-end;}' +
            '.sc-visitor{font-size:clamp(48px,11vw,96px);line-height:1;filter:drop-shadow(0 6px 10px rgba(0,0,0,.5));' +
            'will-change:transform,opacity;opacity:0;transform:translateX(60vw) scale(.6);}' +
            '.sc-visitor.go{animation:scVisitorIn 1s cubic-bezier(.2,.9,.3,1) forwards,' +
            'scVisitorBob 0.9s ease-in-out 1s 3 alternate,scVisitorOut 1s ease-in forwards 3.8s;}' +
            '@keyframes scVisitorIn{from{opacity:0;transform:translateX(60vw) scale(.6);}' +
            'to{opacity:1;transform:translateX(0) scale(1);}}' +
            '@keyframes scVisitorBob{from{transform:translateY(0) rotate(-4deg);}' +
            'to{transform:translateY(-14px) rotate(4deg);}}' +
            '@keyframes scVisitorOut{from{opacity:1;transform:translateX(0) scale(1);}' +
            'to{opacity:0;transform:translateX(-60vw) scale(.6);}}';
        (document.head || document.documentElement).appendChild(st);
    }

    function showCameo(def) {
        try {
            injectCss();
            var layer = document.getElementById('sc-visitor-layer');
            if (!layer) {
                layer = document.createElement('div');
                layer.id = 'sc-visitor-layer';
                document.body.appendChild(layer);
            }
            var el = document.createElement('div');
            el.className = 'sc-visitor';
            el.textContent = def.emoji;
            layer.appendChild(el);
            // forzar reflow para reiniciar animación
            void el.offsetWidth;
            el.classList.add('go');
            setTimeout(function () { try { el.remove(); } catch (e) {} }, 5200);
        } catch (e) { /* nunca romper el juego por la animación */ }
    }

    function announce(def) {
        try {
            var nm = (lang() === 'es') ? def.name_es : def.name_en;
            var lore = (lang() === 'es') ? def.lore_es : def.lore_en;
            var cpsPct = Math.round((def.cps - 1) * 100);
            var clkPct = Math.round((def.click - 1) * 100);
            var bits = [];
            if (cpsPct) bits.push('+' + cpsPct + '% CPS');
            if (clkPct) bits.push('+' + clkPct + '% ' + (lang() === 'es' ? 'clic' : 'click'));
            var secs = Math.round(def.durationMs / 1000);
            var msg = def.emoji + ' ' + nm + ' — ' + lore +
                (bits.length ? ' (' + bits.join(' · ') + ' · ' + secs + 's)' : '');
            if (global.gx && typeof gx.toast === 'function') gx.toast(msg);
        } catch (e) {}
    }

    var visitors = {
        defsList: DEFS,
        enabled: ENABLED,

        cpsMult: function () {
            try {
                if (state.active && now() < state.until) return state.active.cps || 1;
            } catch (e) {}
            return 1;
        },
        clickMult: function () {
            try {
                if (state.active && now() < state.until) return state.active.click || 1;
            } catch (e) {}
            return 1;
        },

        trigger: function (id) {
            try {
                if (!ENABLED()) return;
                var def = null;
                for (var i = 0; i < DEFS.length; i++) { if (DEFS[i].id === id) { def = DEFS[i]; break; } }
                if (!def) def = DEFS[0];
                if (!def) return;
                state.active = def;
                state.until = now() + (def.durationMs || 20000);
                state.cooldownUntil = now() + (def.cooldownMs || 120000);
                showCameo(def);
                announce(def);
            } catch (e) {}
        },

        maybeSpawn: function () {
            try {
                if (!ENABLED()) return;
                if (state.active && now() < state.until) return;     // efecto en curso
                if (now() < state.cooldownUntil) return;              // en cooldown
                var def = DEFS[Math.floor(Math.random() * DEFS.length)] || DEFS[0];
                if (!def) return;
                if (Math.random() < (def.spawnChancePerTick || 0.01)) this.trigger(def.id);
            } catch (e) {}
        },

        tick: function () {
            try {
                if (!ENABLED()) return;
                if (state.active && now() >= state.until) state.active = null; // expira efecto
                this.maybeSpawn();
            } catch (e) {}
        },

        // Para pruebas en local desde consola: visitors.spawnNow()
        spawnNow: function (id) { this.trigger(id || (DEFS[0] && DEFS[0].id)); },

        init: function () {
            try {
                if (state.started) return;
                state.started = true;
                if (!ENABLED()) return;
                // Primer spawn de cortesía a los ~20s (para que el creador lo vea en local).
                state.cooldownUntil = now() + 20000;
                var self = this;
                state.iv = setInterval(function () { self.tick(); }, 1000);
            } catch (e) {}
        }
    };

    global.visitors = visitors;

    // Autoarranque aislado (no depende del boot inline).
    try {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', function () { visitors.init(); });
        } else {
            visitors.init();
        }
    } catch (e) {}
})(typeof window !== 'undefined' ? window : this);
