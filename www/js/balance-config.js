/* Economía SmallCreek Skullchef — build-324 (validado: tools/balance_tune.py).
   Targets sim: era0 ~28 min · click 35-45% · boss 14-26 min · todas las plataformas igual.
   Ver docs/BALANCE_ESTADO.md */
(function (global) {
    'use strict';

    global.BALANCE = {
        balanceVersion: 324,

        /* —— Prestigio (POW 3.85 → curva suave largo plazo) —— */
        prestigeEbBase: 620000,
        prestigeEbPow: 3.85,
        eraCpsMultPerLevel: 0.85,
        prestigeShardSqrtExp: 0.62,

        /* —— Ayudantes (ROI sim-validado) —— */
        companionCostMult: 1.11,
        companions: [
            { baseCost: 8, pw: 0.048 },
            { baseCost: 58, pw: 0.165 },
            { baseCost: 780, pw: 0.52 },
            { baseCost: 9500, pw: 5.0 },
            { baseCost: 120000, pw: 15.5 }
        ],
        pioCpsPctPerLv: 0.055,
        bongoClickPctPerLv: 0.038,
        milestoneSteps: [
            { lv: 5, mult: 1.35 },
            { lv: 10, mult: 1.58 },
            { lv: 25, mult: 1.88 },
            { lv: 50, mult: 2.0 },
            { lv: 100, mult: 2.0 }
        ],

        /* —— Clic / stir (40% ingreso era0 en sim @ 0.4 stir/s) —— */
        clickBaseGain: 5.5,
        clickPowBase: 1.28,
        clickBunnyExpCoeff: 0.44,
        clickBunnyExpCap: 28,
        stirComboSteps: [
            { hits: 5, mult: 1.06 },
            { hits: 10, mult: 1.11 },
            { hits: 18, mult: 1.16 },
            { hits: 28, mult: 1.22 }
        ],
        stirComboDecayMs: 2200,
        critChance: 0.05,
        critMult: 2.65,

        /* —— Amuletos —— */
        charmDropIntervalSec: 420,
        charmDailyCap: 16,
        charmRarityWeights: { common: 50, uncommon: 31, rare: 13.5, epic: 3.8, legendary: 0.85, superleg: 0.35, anomaly: 0.05 },
        cauldronDropPctPerLv: 0.05,
        cauldronCpsPctPerLv: 0.025,
        cauldronMaxLv: 5,

        /* —— Offline (8 h · no rompe active) —— */
        offlineMaxSec: 28800,
        offlineCpsMult: 0.52,

        /* —— Jefe + comunidad (TTK sim 14-26 min/semana) —— */
        commWeeklyDropMult: 1.12,
        commGoalCpsMult: 6400,
        commGoalMin: 3800000,
        bossHpCpsMult: 280,
        bossHpMin: 40000,
        bossClickDmgCpsMult: 0.60,
        bossClickDmgMin: 100,
        bossIdleDpsCpsMult: 0.09,
        bossRewardCpsMult: 220,
        bossRewardMin: 22000,
        bossRewardShard: 1,

        /* —— Misiones (~20 min/día completable) —— */
        questDailyEbGoalCpsMult: 185,
        questDailyEbGoalMin: 6000,
        questDailyEbRewardCpsMult: 155,
        questDailyClicksGoal: 130,
        questWeeklyEbGoalCpsMult: 11000,
        questWeeklyEbGoalMin: 300000,
        questWeeklyEbRewardCpsMult: 780,

        /* —— Árbol ángel —— */
        treeCaldoPctPerLv: 0.17,
        treeManosPctPerLv: 0.22,
        treeCucharaPctPerLv: 0.07,
        treeOfflinePctPerLv: 0.28,
        treeAuraPctPerLv: 0.09,
        treeEternalPctPerLv: 0.034,

        /* —— Chef / granja / meta —— */
        chefMoodMaxBonusPct: 13,
        chefMoodFloor: 14,
        loginStreakBase: 550,
        loginStreakPerDay: 700,
        loginStreakCap: 110000,
        loginStreakCpsMult: 140,
        farmBrothPctPerStock: 0.13,
        farmBrothCapPct: 11,
        farmWagonCpsMult: 0.94,
        farmWagonGrowSpeedMult: 1.4,
        helperBondCpsPctPerLv: 0.01,
        helperDuoBonuses: { cocoBunnyClick: 5.5, pioIvanCps: 5.5, bongoChampCps: 5.5, bongoChampClick: 5.5 },
        soupEvolutionClickPctPerTier: 0.024,
        soupEvolutionCpsPctPerTier: 0.02,
        atlasSetBonusPct: 1.25,
        atlasSetBonusCap: 20
    };

    function bal() { return global.BALANCE || {}; }

    global.balanceGet = function (key, fallback) {
        var b = bal();
        return b[key] !== undefined && b[key] !== null ? b[key] : fallback;
    };

    global.balancePrestigeGoal = function (prestigeLevel) {
        var s = Math.max(0, Math.floor(Number(prestigeLevel) || 0));
        return balanceGet('prestigeEbBase', 620000) * Math.pow(balanceGet('prestigeEbPow', 3.85), s);
    };

    global.balanceCompCostMult = function () {
        return Number(balanceGet('companionCostMult', 1.11)) || 1.11;
    };

    global.balanceEraMult = function (era) {
        var s = Math.max(0, Math.floor(Number(era) || 0));
        return 1 + s * (Number(balanceGet('eraCpsMultPerLevel', 0.85)) || 0.85);
    };

    global.balanceMilestoneMult = function (lv) {
        var level = Math.max(0, Math.floor(Number(lv) || 0));
        var steps = balanceGet('milestoneSteps', []);
        var m = 1;
        for (var i = 0; i < steps.length; i++) {
            if (level >= steps[i].lv) m *= steps[i].mult;
        }
        return m;
    };

    global.balanceStirComboMult = function (combo) {
        var c = Math.max(0, Math.floor(Number(combo) || 0));
        var steps = balanceGet('stirComboSteps', []);
        var mult = 1;
        for (var i = 0; i < steps.length; i++) {
            if (c >= steps[i].hits) mult = steps[i].mult;
        }
        return mult;
    };

    global.balanceApplyCompanionDefaults = function (game) {
        var list = balanceGet('companions', null);
        if (!game || !Array.isArray(game.cp) || !Array.isArray(list)) return;
        for (var i = 0; i < list.length && i < game.cp.length; i++) {
            var def = list[i];
            if (!def) continue;
            if (def.baseCost != null && Array.isArray(game.cpBaseCost)) {
                game.cpBaseCost[i] = def.baseCost;
                if (!game.cp[i].lv) game.cp[i].cs = def.baseCost;
            }
            if (def.pw != null) game.cp[i].pw = def.pw;
        }
    };

    global.balanceApplyCharmRarities = function (collection) {
        if (!collection || !Array.isArray(collection.RARITIES)) return;
        var w = balanceGet('charmRarityWeights', null);
        if (!w || typeof w !== 'object') return;
        collection.RARITIES.forEach(function (r) {
            if (w[r.k] != null) r.weight = w[r.k];
        });
    };
})(typeof window !== 'undefined' ? window : this);
