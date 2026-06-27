/* Save schema migrations + integrity wrap/unwrap (build-308). */
(function (global) {
    'use strict';

// === Versionado del esquema de guardado ===
// Sube este número cada vez que cambie la forma del save. Cada incremento debe
// tener su paso de migración en SAVE_MIGRATIONS (clave = versión de ORIGEN).
const SCHEMA_VERSION = 46;
const SAVE_MIGRATIONS = {
    // v16 -> v17: el campo `as` (Angel Shards acumulados) pasó a guardarse aparte de `s`.
    16: (s) => {
        if (!Number.isFinite(s.as)) s.as = Number.isFinite(s.s) ? s.s : 0;
        s.v = 17;
        return s;
    },
    // v17 -> v18: se añade `rewards` (registros anti-abuso del sistema de recompensas:
    // timestamps de cooldown y contadores diarios por recompensa).
    17: (s) => {
        if (!s.rewards || typeof s.rewards !== 'object') s.rewards = {};
        s.v = 18;
        return s;
    },
    // v18 -> v19: se añade `coll` (colección de amuletos generativos: inventario,
    // contadores de drops y amuleto equipado). Se inicializa vacío de forma perezosa.
    18: (s) => {
        if (!s.coll || typeof s.coll !== 'object') s.coll = null;
        s.v = 19;
        return s;
    },
    // v19 -> v20: la colección cambió de "insignias abstractas" a familias reales
    // (ayudantes/cucharas/gorro de chef). El formato antiguo de items es incompatible,
    // así que se vacía el inventario conservando contadores de drops del día.
    19: (s) => {
        if (s.coll && typeof s.coll === 'object') {
            s.coll.items = {};
            s.coll.equipped = null;
        }
        s.v = 20;
        return s;
    },
    // v20 -> v21: las skins pasan a ser ARTE (PNG) dirigido por catálogo; el item guarda
    // el `id` de la skin, no un seed de formas. Se vacía el inventario antiguo (seeds).
    20: (s) => {
        if (s.coll && typeof s.coll === 'object') {
            s.coll.items = {};
            s.coll.equipped = null;
        }
        s.v = 21;
        return s;
    },
    // v21 -> v22: el Árbol del Ángel gana dos nodos nuevos (`aura` = +EB global,
    // `fortuna` = fragmentos extra al prestigiar). Garantizamos que existan a 0 para
    // que los multiplicadores no produzcan NaN en saves antiguos.
    21: (s) => {
        if (!s.tree || typeof s.tree !== 'object') s.tree = {};
        if (!Number.isFinite(s.tree.aura)) s.tree.aura = 0;
        if (!Number.isFinite(s.tree.fortuna)) s.tree.fortuna = 0;
        s.v = 22;
        return s;
    },
    // v22 -> v23: el campo `ch` de cada ayudante pasa de BOOLEANO a CONTADOR de
    // victorias (0 = nunca ganó). Las banderas antiguas `true` valen 1 victoria (x2,
    // mantiene la fuerza actual) y `false`/ausente valen 0. Defensivo ante `c` ausente.
    22: (s) => {
        if (Array.isArray(s.c)) s.c.forEach(x => { if (x && typeof x === 'object') x.ch = x.ch ? 1 : 0; });
        s.v = 23;
        return s;
    },
    // v23 -> v24: el Árbol del Ángel gana un nodo INFINITO (`eterno` = +EB global
    // sin tope). Garantizamos que exista a 0 para que el multiplicador no produzca
    // NaN en saves antiguos.
    23: (s) => {
        if (!s.tree || typeof s.tree !== 'object') s.tree = {};
        if (!Number.isFinite(s.tree.eterno)) s.tree.eterno = 0;
        s.v = 24;
        return s;
    },
    // v24 -> v25: se añade Bongo (5.º ayudante, cp[4]). Saves antiguos guardan
    // solo 4 entradas en `c`; la 5.ª queda en lv/ch 0 por defecto del motor.
    24: (s) => {
        if (Array.isArray(s.c) && s.c.length < 5) {
            while (s.c.length < 5) s.c.push({ lv: 0, ch: 0 });
        }
        s.v = 25;
        return s;
    },
    // v25 -> v26: ingredient farm (stock + plots) and seasonal decorations save.
    25: (s) => {
        const starter = 30;
        const types = ['ink','shrimp','carrot','lettuce','corn','yolk','honey','berries','banana','coconut'];
        const stock = {};
        types.forEach(id => { stock[id] = starter; });
        if (!s.farm || typeof s.farm !== 'object') s.farm = { stock, plots: types.map(id => ({ type: id, readyAt: 0 })), autoReplant: true };
        else {
            if (!s.farm.stock || typeof s.farm.stock !== 'object') s.farm.stock = stock;
            types.forEach(id => { if (!Number.isFinite(s.farm.stock[id])) s.farm.stock[id] = starter; });
            if (!Array.isArray(s.farm.plots)) s.farm.plots = types.map(id => ({ type: id, readyAt: 0 }));
            if (s.farm.autoReplant == null) s.farm.autoReplant = true;
        }
        if (!s.decor || typeof s.decor !== 'object') s.decor = { slots: {}, owned: [] };
        else {
            if (!s.decor.slots || typeof s.decor.slots !== 'object') s.decor.slots = {};
            if (!Array.isArray(s.decor.owned)) s.decor.owned = [];
        }
        s.v = 26;
        return s;
    },
    // v26 -> v27: summer decor pilot — bg swap + chef hat/face (drop tiny stage emojis).
    26: (s) => {
        if (!s.decor || typeof s.decor !== 'object') s.decor = { slots: {}, owned: [] };
        const old = s.decor.slots && typeof s.decor.slots === 'object' ? s.decor.slots : {};
        const slots = { background: null, chefHat: null, chefFace: null };
        if (old.hatAcc === 'summer_shades' || old.chefFace === 'summer_shades') slots.chefFace = 'summer_shades';
        if (old.background === 'summer_beach' || s.decor.equippedBg === 'summer_beach') slots.background = 'summer_beach';
        if (!Array.isArray(s.decor.owned)) s.decor.owned = [];
        delete s.decor.free;
        delete s.decor.equippedBg;
        s.decor.slots = slots;
        s.v = 27;
        return s;
    },
    // v27 -> v28: chef accessory transforms (position/scale/rotation per item).
    27: (s) => {
        if (!s.decor || typeof s.decor !== 'object') s.decor = { slots: {}, owned: [] };
        if (!s.decor.chefTransforms || typeof s.decor.chefTransforms !== 'object') s.decor.chefTransforms = {};
        s.v = 28;
        return s;
    },
    // v28 -> v29: shop spoons now use catalog skin IDs (sp[] indices unchanged).
    28: (s) => {
        s.v = 29;
        return s;
    },
    29: (s) => {
        s.v = 30;
        return s;
    },
    // v30 -> v31: final shop skin swap (sp[]/hp[] slot indices unchanged).
    30: (s) => {
        s.v = 31;
        return s;
    },
    31: (s) => {
        if (s.coll && typeof s.coll === 'object') {
            if (!s.coll.atlasAnnounced || typeof s.coll.atlasAnnounced !== 'object') s.coll.atlasAnnounced = {};
        }
        s.v = 32;
        return s;
    },
    32: (s) => {
        if (s.coll && typeof s.coll === 'object') {
            if (typeof s.coll.atlasPath !== 'string') s.coll.atlasPath = null;
            if (!s.coll.atlasChapterAnnounced || typeof s.coll.atlasChapterAnnounced !== 'object') s.coll.atlasChapterAnnounced = {};
        }
        s.v = 33;
        return s;
    },
    33: (s) => {
        if (s.daily && s.daily.counters && s.daily.counters.pathCharms == null) s.daily.counters.pathCharms = 0;
        s.v = 34;
        return s;
    },
    34: (s) => {
        if (s.coll && typeof s.coll === 'object') {
            if (!s.coll.soupEvAnnounced || typeof s.coll.soupEvAnnounced !== 'object') s.coll.soupEvAnnounced = {};
        }
        s.v = 35;
        return s;
    },
    35: (s) => {
        if (s.coll && typeof s.coll === 'object') {
            if (!s.coll.eventAnnounced || typeof s.coll.eventAnnounced !== 'object') s.coll.eventAnnounced = {};
        }
        s.v = 36;
        return s;
    },
    36: (s) => {
        if (!s.pr || typeof s.pr !== 'object') s.pr = null;
        if (!Number.isFinite(s.br)) s.br = 0;
        if (!Number.isFinite(s.ps)) s.ps = 0;
        s.v = 37;
        return s;
    },
    37: (s) => {
        if (!Number.isFinite(s.lst)) s.lst = 0;
        if (typeof s.lday !== 'string') s.lday = '';
        if (typeof s.vt !== 'string') s.vt = '';
        s.v = 38;
        return s;
    },
    38: (s) => {
        if (!Number.isFinite(s.cm)) s.cm = 55;
        if (!s.wk || typeof s.wk !== 'object') s.wk = null;
        s.v = 39;
        return s;
    },
    39: (s) => {
        if (!Number.isFinite(s.px)) s.px = 0;
        s.v = 40;
        return s;
    },
    40: (s) => {
        if (s.coll && typeof s.coll === 'object') {
            if (!s.coll.loadouts || typeof s.coll.loadouts !== 'object') s.coll.loadouts = { farm: null, prestige: null, prix: null };
            if (!s.coll.museumClaimed || typeof s.coll.museumClaimed !== 'object') s.coll.museumClaimed = {};
        }
        s.v = 41;
        return s;
    },
    41: (s) => {
        if (!s.hb || typeof s.hb !== 'object') s.hb = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
        for (let i = 0; i < 5; i++) if (!Number.isFinite(s.hb[i])) s.hb[i] = 0;
        s.v = 42;
        return s;
    },
    42: (s) => {
        if (!s.cmw || typeof s.cmw !== 'object') s.cmw = null;
        if (!s.boss || typeof s.boss !== 'object') s.boss = null;
        if (s.farm && typeof s.farm === 'object' && !('wagon' in s.farm)) s.farm.wagon = null;
        if (s.coll && typeof s.coll === 'object' && !Number.isFinite(s.coll.cauldronLv)) s.coll.cauldronLv = 0;
        s.v = 43;
        return s;
    },
    43: (s) => {
        if (!Number.isFinite(s.scd)) s.scd = 0;
        s.v = 44;
        return s;
    },
    44: (s) => {
        if (s.coll && typeof s.coll === 'object') {
            if (!s.coll.loadouts || typeof s.coll.loadouts !== 'object') s.coll.loadouts = { farm: null, prestige: null, prix: null, skirmish: null };
            else if (!('skirmish' in s.coll.loadouts)) s.coll.loadouts.skirmish = null;
        }
        s.v = 45;
        return s;
    },
    // v45 -> v46: origen de cosméticos (steam vs móvil) para mercado Steam.
    45: (s) => {
        try {
            if (typeof collOrigin !== 'undefined' && collOrigin.migrateCollOrigins) collOrigin.migrateCollOrigins(s.coll);
            else if (s.coll) {
                if (!s.coll._platformSeal) s.coll._platformSeal = 'legacy';
                if (s.coll.items) {
                    for (const k in s.coll.items) {
                        const it = s.coll.items[k];
                        if (it && typeof it === 'object' && !it.origin) it.origin = 'legacy';
                    }
                }
            }
        } catch (e) {}
        s.v = 46;
        return s;
    }
    // FUTURO: para añadir v36 -> v37 solo añade aquí:
    //   32: (s) => { /* transforma s */ s.v = 33; return s; },
    // y sube SCHEMA_VERSION. No borres pasos antiguos.
};
// Transforma un save antiguo al esquema actual de forma incremental. Nunca lanza:
// si algo falla, devuelve los datos originales sin tocar (no se pierde nada).
function migrateSave(data) {
    if (!data || typeof data !== 'object') return data;
    try {
        let d = data;
        // Saves anteriores al versionado se tratan como v16 (primera clave conocida).
        let v = Number.isFinite(d.v) ? d.v : 16;
        let guard = 0;
        while (v < SCHEMA_VERSION && SAVE_MIGRATIONS[v] && guard++ < 100) {
            const next = SAVE_MIGRATIONS[v](d);
            if (next && typeof next === 'object') d = next;
            v = Number.isFinite(d.v) ? d.v : v + 1;
        }
        if (!Number.isFinite(d.v)) d.v = SCHEMA_VERSION;
        return d;
    } catch (e) {
        return data;
    }
}
// === Integridad del guardado (anti-tamper de cliente) ===
// Firma determinista y SÍNCRONA del JSON del save + una sal embebida. NO es
// criptografía fuerte: el anti-cheat 100% en cliente es imposible (la sal vive en
// el bundle). Sirve para detectar ediciones casuales de localStorage y, junto al
// clamp de valores, evitar estados imposibles (NaN/Infinity/negativos/topes).
const secure = {
    SALT: 'sk_chef_v1_$alt_9c3f7a',
    // FNV-1a (32b) + DJB2 combinados -> 16 hex chars. Math.imul para multiplicación 32b exacta.
    hash(str) {
        str = String(str);
        let h1 = 0x811c9dc5 >>> 0;
        let h2 = 5381 >>> 0;
        for (let i = 0; i < str.length; i++) {
            const c = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
            h2 = (Math.imul(h2, 33) + c) >>> 0;
        }
        const hex = (n) => ('00000000' + (n >>> 0).toString(16)).slice(-8);
        return hex(h1) + hex(h2);
    },
    sign(dataStr) { return this.hash(this.SALT + '|' + dataStr + '|' + this.SALT); },
    wrap(dataStr) { try { return JSON.stringify({ s: this.sign(dataStr), d: dataStr }); } catch (e) { return dataStr; } },
    // Devuelve { data, tampered, legacy } o null. Acepta sobres firmados y saves
    // legacy/backup sin firma (se aceptan y se re-firman en el próximo save()).
    unwrap(raw) {
        if (raw == null) return null;
        let env = null;
        try { env = JSON.parse(raw); } catch (e) { return null; }
        if (!env || typeof env !== 'object') return null;
        if (typeof env.s === 'string' && typeof env.d === 'string') {
            let data = null; try { data = JSON.parse(env.d); } catch (e) { data = null; }
            if (!data || typeof data !== 'object') return null;
            return { data, tampered: this.sign(env.d) !== env.s, legacy: false };
        }
        return { data: env, tampered: false, legacy: true };
    }
};
    global.SCHEMA_VERSION = SCHEMA_VERSION;
    global.SAVE_MIGRATIONS = SAVE_MIGRATIONS;
    global.migrateSave = migrateSave;
    global.secure = secure;
})(typeof window !== 'undefined' ? window : this);
