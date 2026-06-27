/**
 * Origen de cosméticos — protege la economía Steam.
 * Móvil/web: origin !== 'steam' → no comerciable en PC.
 * Ver docs/STEAM_MARKET_ORIGIN.md
 */
(function (global) {
    'use strict';

    var ORIGIN = { STEAM: 'steam', MOBILE: 'mobile', WEB: 'web', LEGACY: 'legacy', BASE: 'base', DEV: 'dev' };
    var MOBILE_BUILDS = { android: 1, ios: 1 };

    function buildTarget() {
        try {
            if (typeof BUILD_TARGET !== 'undefined') return BUILD_TARGET;
            if (global.BUILD_TARGET) return global.BUILD_TARGET;
        } catch (e) {}
        return 'web';
    }

    function isSteamBuild() {
        var b = buildTarget();
        return b === 'steam' || b === 'desktop';
    }

    function isMobileBuild() {
        return !!MOBILE_BUILDS[buildTarget()];
    }

    function platformOrigin() {
        if (isSteamBuild()) return ORIGIN.STEAM;
        if (isMobileBuild()) return ORIGIN.MOBILE;
        var b = buildTarget();
        if (b === 'web' || b === 'playables') return ORIGIN.WEB;
        return ORIGIN.WEB;
    }

    function isMarketRarity(rarity) {
        return rarity === 'legendary' || rarity === 'superleg';
    }

    function stampItem(item, originOverride) {
        if (!item || typeof item !== 'object') return item;
        if (!item.origin) item.origin = originOverride || platformOrigin();
        if (item.marketOk === undefined) {
            item.marketOk = item.origin === ORIGIN.STEAM;
        }
        return item;
    }

    function newItem(id, rarity, originOverride) {
        return stampItem({ id: String(id), rarity: rarity || 'common', count: 1 }, originOverride);
    }

    function sealPlatform(coll) {
        if (!coll || typeof coll !== 'object') return coll;
        if (!coll._platformSeal) coll._platformSeal = platformOrigin();
        return coll;
    }

    function isForeignSave(coll) {
        if (!coll || typeof coll !== 'object') return false;
        var seal = coll._platformSeal;
        if (!seal) return false;
        return seal !== ORIGIN.STEAM && seal !== 'desktop';
    }

    /** Reglas al cargar partida local en Steam (no importación explícita). */
    function applySteamMarketRules(coll) {
        if (!coll || typeof coll !== 'object' || !coll.items) return coll;
        sealPlatform(coll);
        var foreign = isForeignSave(coll);
        var items = coll.items;
        var id;
        for (id in items) {
            if (!Object.prototype.hasOwnProperty.call(items, id)) continue;
            var it = items[id];
            if (!it || typeof it !== 'object') continue;
            if (!it.origin) it.origin = ORIGIN.LEGACY;
            if (it.origin === ORIGIN.STEAM) {
                it.marketOk = true;
            } else if (it.origin === ORIGIN.BASE || it.origin === ORIGIN.DEV) {
                it.marketOk = false;
            } else if (foreign) {
                it.marketOk = false;
            } else if (it.origin === ORIGIN.LEGACY) {
                it.marketOk = true;
            } else {
                it.marketOk = false;
            }
        }
        return coll;
    }

    /** Tras restaurar código/nube en Steam: solo items origin steam pueden venderse. */
    function applyImportedSteamRules(coll) {
        if (!coll || typeof coll !== 'object' || !coll.items) return coll;
        var items = coll.items;
        var id;
        for (id in items) {
            if (!Object.prototype.hasOwnProperty.call(items, id)) continue;
            var it = items[id];
            if (!it || typeof it !== 'object') continue;
            if (!it.origin) it.origin = ORIGIN.MOBILE;
            it.marketOk = it.origin === ORIGIN.STEAM;
        }
        return coll;
    }

    function sanitizeSaveColl(saveData) {
        if (!saveData || typeof saveData !== 'object' || !saveData.coll) return saveData;
        if (isSteamBuild()) applySteamMarketRules(saveData.coll);
        return saveData;
    }

    function sanitizeImportedSave(saveData) {
        if (!saveData || typeof saveData !== 'object') return saveData;
        if (isSteamBuild() && saveData.coll) applyImportedSteamRules(saveData.coll);
        return saveData;
    }

    function applyToGameColl(coll, opts) {
        if (!coll) return coll;
        if (!isSteamBuild()) return coll;
        if (opts && opts.imported) return applyImportedSteamRules(coll);
        return applySteamMarketRules(coll);
    }

    function canMarketItem(item, skinMeta) {
        if (!item || typeof item !== 'object') return false;
        if (item.marketOk === false) return false;
        if (item.origin && item.origin !== ORIGIN.STEAM) return false;
        var rarity = (skinMeta && skinMeta.rarity) || item.rarity;
        return isMarketRarity(rarity);
    }

    function migrateCollOrigins(coll) {
        if (!coll || typeof coll !== 'object') return;
        sealPlatform(coll);
        if (!coll.items) return;
        var items = coll.items;
        var id;
        for (id in items) {
            if (!Object.prototype.hasOwnProperty.call(items, id)) continue;
            var it = items[id];
            if (it && typeof it === 'object' && !it.origin) it.origin = ORIGIN.LEGACY;
        }
    }

    global.collOrigin = {
        ORIGIN: ORIGIN,
        platformOrigin: platformOrigin,
        isSteamBuild: isSteamBuild,
        isMobileBuild: isMobileBuild,
        stampItem: stampItem,
        newItem: newItem,
        applySteamMarketRules: applySteamMarketRules,
        applyImportedSteamRules: applyImportedSteamRules,
        sanitizeSaveColl: sanitizeSaveColl,
        sanitizeImportedSave: sanitizeImportedSave,
        applyToGameColl: applyToGameColl,
        canMarketItem: canMarketItem,
        sealPlatform: sealPlatform,
        isForeignSave: isForeignSave,
        migrateCollOrigins: migrateCollOrigins,
        isMarketRarity: isMarketRarity
    };
})(typeof window !== 'undefined' ? window : this);
