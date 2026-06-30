/* Ingredient PNG visuals — farm + throws. Emoji fallback if PNG missing. */
(function (global) {
    'use strict';

    var BASE = 'assets/img/ingredients/';
    var ENABLED = true;

    /** Ingredientes con estrella de adorno del artista (variantes B / premium). */
    var STAR_DECO_IDS = {
        ink: 1, shrimp: 1, lettuce: 1, yolk: 1, honey: 1,
        berries: 1, strawberry: 1, banana: 1, coconut: 1
    };

    var FILES = {
        ink: 'ing_ink.png',
        shrimp: 'ing_shrimp.png',
        carrot: 'ing_carrot.png',
        lettuce: 'ing_lettuce.png',
        corn: 'ing_corn.png',
        yolk: 'ing_yolk.png',
        honey: 'ing_honey.png',
        berries: 'ing_berries.png',
        strawberry: 'ing_strawberry.png',
        banana: 'ing_banana.png',
        coconut: 'ing_coconut.png',
        star_spark: 'ing_star_spark.png',
        star_glow: 'ing_star_glow.png'
    };

    /** Emojis legacy de adorno → estrella PNG (sustituye 💜 tinta, etc.). */
    var LEGACY_DECO_GLYPHS = {
        '\uD83D\uDC9C': 1
    };

    var GLYPH_TO_ID = {
        '\uD83E\uDD91': 'ink',
        '\uD83E\uDD90': 'shrimp',
        '\uD83E\uDD55': 'carrot',
        '\uD83E\uDD6C': 'lettuce',
        '\uD83C\uDF3D': 'corn',
        '\uD83D\uDC9B': 'yolk',
        '\uD83C\uDF6F': 'honey',
        '\uD83E\uDED0': 'berries',
        '\uD83C\uDF53': 'strawberry',
        '\uD83C\uDF4C': 'banana',
        '\uD83E\uDD65': 'coconut'
    };

    function src(id) {
        if (!id || !FILES[id]) return '';
        return BASE + FILES[id];
    }

    function pickStarFile() {
        return Math.random() < 0.5 ? 'star_spark' : 'star_glow';
    }

    function pickStarFileStable(id) {
        var n = 0, i, s = String(id || '');
        for (i = 0; i < s.length; i++) n += s.charCodeAt(i);
        return (n % 2) ? 'star_spark' : 'star_glow';
    }

    function idFromGlyph(glyph) {
        if (!glyph) return '';
        if (GLYPH_TO_ID[glyph]) return GLYPH_TO_ID[glyph];
        if (LEGACY_DECO_GLYPHS[glyph]) return pickStarFile();
        return '';
    }

    function idFromFarmType(type) {
        return type && FILES[type] ? type : '';
    }

    function wantsStarDeco(id) {
        return !!(id && STAR_DECO_IDS[id]);
    }

    function appendStar(parent) {
        var st = document.createElement('img');
        st.className = 'ing-star-deco';
        st.src = src(pickStarFile());
        st.alt = '';
        st.decoding = 'async';
        st.draggable = false;
        parent.appendChild(st);
    }

    function fillProj(el, glyph, farmType) {
        if (!el) return;
        var id = idFromFarmType(farmType) || idFromGlyph(glyph);
        var url = ENABLED && id ? src(id) : '';
        el.textContent = '';
        if (url) {
            el.classList.add('ingredient-proj-img');
            var wrap = document.createElement('span');
            wrap.className = 'ing-proj-stack';
            var img = document.createElement('img');
            img.className = 'ing-main';
            img.src = url;
            img.alt = '';
            img.decoding = 'async';
            img.draggable = false;
            img.onerror = function () {
                try {
                    el.classList.remove('ingredient-proj-img');
                    el.textContent = glyph || '';
                } catch (e) {}
            };
            wrap.appendChild(img);
            if (wantsStarDeco(id)) appendStar(wrap);
            el.appendChild(wrap);
        } else {
            el.classList.remove('ingredient-proj-img');
            el.textContent = glyph || '';
        }
    }

    function farmInner(type) {
        var glyph = (global.FARM_GLYPHS && global.FARM_GLYPHS[type]) || '\uD83C\uDF31';
        if (!ENABLED) return glyph;
        var id = idFromFarmType(type);
        var url = src(id);
        if (!url) return glyph;
        var star = wantsStarDeco(id)
            ? '<img class="farm-star-deco" src="' + src(pickStarFileStable(id)) + '" alt="" decoding="async">'
            : '';
        return '<span class="farm-ing-stack"><img class="farm-ing-img" src="' + url + '" alt="" decoding="async">' + star + '</span>';
    }

    global.ingredientVisual = {
        ENABLED: ENABLED,
        fillProj: fillProj,
        farmInner: farmInner,
        src: src
    };
})(typeof window !== 'undefined' ? window : this);
