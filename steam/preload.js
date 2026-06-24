'use strict';

const { contextBridge, ipcRenderer } = require('electron');

function syncFlag(channel) {
  try { return !!ipcRenderer.sendSync(channel); } catch (e) { return false; }
}

const steamState = {
  available: syncFlag('steam:get-available'),
  inventoryReady: syncFlag('steam:get-inventory-ready')
};

contextBridge.exposeInMainWorld('electronAPI', {
  platform: 'steam',
  quitApp: () => ipcRenderer.send('quit-app')
});

contextBridge.exposeInMainWorld('steamworks', {
  get available() { return steamState.available; },
  get inventoryReady() { return steamState.inventoryReady; },
  activateAchievement(apiName) {
    if (!steamState.available || !apiName) return false;
    ipcRenderer.invoke('steam:activate', apiName).catch(() => {});
    return true;
  },
  setStat(name, value) {
    if (!steamState.available) return false;
    ipcRenderer.invoke('steam:set-stat', name, value).catch(() => {});
    return true;
  },
  storeStats() {
    if (!steamState.available) return false;
    ipcRenderer.invoke('steam:store-stats').catch(() => {});
    return true;
  },
  syncAfterLoad(gameAch) {
    if (!steamState.available || !gameAch) return false;
    ipcRenderer.invoke('steam:sync-after-load', gameAch).catch(() => {});
    return true;
  },
  grantItem(item) {
    if (!steamState.inventoryReady) return item;
    return ipcRenderer.invoke('steam:grant-item', item).catch(() => item);
  },
  getInventory() {
    if (!steamState.inventoryReady) return {};
    return {};
  }
});
