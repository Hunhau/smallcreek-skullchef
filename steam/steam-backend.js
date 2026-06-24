'use strict';

const fs = require('fs');
const path = require('path');

let client = null;
let _available = false;
// steamworks.js has no ISteamInventory binding yet — flip when Economy is wired.
const _inventoryReady = false;

function readAppId() {
  const p = path.join(__dirname, 'steam_appid.txt');
  try {
    if (!fs.existsSync(p)) return null;
    const line = fs.readFileSync(p, 'utf8').split(/\r?\n/).find((l) => {
      const t = l.trim();
      return t && !t.startsWith('#');
    });
    if (!line) return null;
    const n = parseInt(line.trim(), 10);
    return Number.isFinite(n) ? n : null;
  } catch (e) {
    return null;
  }
}

function loadAchievementManifest() {
  const p = path.join(__dirname, 'manifest', 'achievements.json');
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    return [];
  }
}

function initSteam() {
  if (_available) return true;
  try {
    const steamworks = require('steamworks.js');
    const appId = readAppId();
    client = appId ? steamworks.init(appId) : steamworks.init();
    _available = !!client;
    try { steamworks.electronEnableSteamOverlay(); } catch (e) {}
    if (_available) {
      console.log('[steam] connected as', client.localplayer.getName());
    }
    return _available;
  } catch (e) {
    console.warn('[steam] init skipped:', e && e.message ? e.message : e);
    _available = false;
    return false;
  }
}

function isAvailable() {
  return _available;
}

function isInventoryReady() {
  return _inventoryReady && _available;
}

function activateAchievement(apiName) {
  if (!client || !apiName) return false;
  try {
    if (client.achievement.isActivated(apiName)) return true;
    return client.achievement.activate(apiName);
  } catch (e) {
    return false;
  }
}

function setStat(name, value) {
  if (!client || !name) return false;
  try {
    return client.stats.setInt(String(name), value | 0);
  } catch (e) {
    return false;
  }
}

function storeStats() {
  if (!client) return false;
  try {
    return client.stats.store();
  } catch (e) {
    return false;
  }
}

function syncAfterLoad(gameAch) {
  if (!client || !gameAch || typeof gameAch !== 'object') return false;
  let synced = 0;
  for (const row of loadAchievementManifest()) {
    if (row.gameKey && gameAch[row.gameKey] && row.apiName) {
      if (activateAchievement(row.apiName)) synced++;
    }
  }
  storeStats();
  return synced;
}

function grantItem(item) {
  // Phase 3: ISteamInventory / GrantPromoItems when Economy is live in panel.
  return item;
}

function getInventory() {
  return {};
}

module.exports = {
  initSteam,
  isAvailable,
  isInventoryReady,
  activateAchievement,
  setStat,
  storeStats,
  syncAfterLoad,
  grantItem,
  getInventory
};
