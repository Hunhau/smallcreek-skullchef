#!/usr/bin/env node
/**
 * Generates Steamworks partner panel drafts from game data.
 * Usage: node tools/generate-steamworks-manifest.js
 * Output: steam/manifest/achievements.json, steam/manifest/itemdefs.json
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'steam', 'manifest');

const ACH_KEYS = [
  'firstClick', 'firstPres', 'firstChamp', 'fullTeam', 'allSpoons',
  'centurion', 'awakened5', 'collector', 'mythicCharm'
];

const ACH_LABELS = {
  firstClick: { en: 'First Stir', es: 'Primer removido' },
  firstPres: { en: 'First Prestige', es: 'Primer prestigio' },
  firstChamp: { en: 'Grand Prix Champion', es: 'Campeón del Grand Prix' },
  fullTeam: { en: 'Full Kitchen Crew', es: 'Equipo completo' },
  allSpoons: { en: 'Sacred Spoon Album', es: 'Álbum de cucharas' },
  centurion: { en: 'Centurion Chef', es: 'Chef centurión' },
  awakened5: { en: 'Five Awakenings', es: 'Cinco despertares' },
  collector: { en: 'Charm Collector', es: 'Coleccionista de amuletos' },
  mythicCharm: { en: 'Mythic Drop', es: 'Amuleto mítico' }
};

function loadCatalog() {
  const catalogPath = path.join(ROOT, 'assets', 'skins', 'catalog.js');
  const src = fs.readFileSync(catalogPath, 'utf8');
  const fn = new Function('window', src + '\nreturn window.SKIN_CATALOG;');
  return fn({}) || [];
}

function steamApiName(key) {
  return 'ACH_' + String(key).replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
}

function itemDefId(skinId, index) {
  return 100000 + index;
}

function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const achievements = ACH_KEYS.map((k) => ({
    apiName: steamApiName(k),
    gameKey: k,
    displayName_en: (ACH_LABELS[k] && ACH_LABELS[k].en) || k,
    displayName_es: (ACH_LABELS[k] && ACH_LABELS[k].es) || k,
    hidden: k === 'mythicCharm',
    notes: 'Create matching achievement in Steamworks → Stats & Achievements'
  }));

  const catalog = loadCatalog();
  const itemdefs = catalog.map((s, i) => ({
    itemdefid: itemDefId(s.id, i),
    gameSkinId: s.id,
    type: 'item',
    name_en: s.name_en || s.id,
    name_es: s.name_es || s.id,
    rarity: s.rarity,
    family: s.family,
    marketable: s.rarity === 'legendary' || s.rarity === 'superleg',
    tradable: true,
    notes: 'Upload icon in Steam Economy; Community Market requires published app + Valve thresholds'
  }));

  const summary = {
    generated: new Date().toISOString(),
    achievementCount: achievements.length,
    itemDefCount: itemdefs.length,
    marketableCount: itemdefs.filter((x) => x.marketable).length,
    nextSteps: [
      'Create app in Steamworks and set steam/steam_appid.txt',
      'Import achievements.json names into Stats & Achievements',
      'Import itemdefs into Steam Inventory / Item Definitions (Phase 2)',
      'Wire steamworks.js native module in steam/preload.js',
      'Rebuild with .\\tools\\build-steam.ps1'
    ]
  };

  fs.writeFileSync(path.join(OUT, 'achievements.json'), JSON.stringify(achievements, null, 2));
  fs.writeFileSync(path.join(OUT, 'itemdefs.json'), JSON.stringify(itemdefs, null, 2));
  fs.writeFileSync(path.join(OUT, 'README.json'), JSON.stringify(summary, null, 2));

  console.log('==> Steamworks manifest written to steam/manifest/');
  console.log('    Achievements:', achievements.length);
  console.log('    Item defs:', itemdefs.length, '(marketable:', summary.marketableCount + ')');
}

main();
