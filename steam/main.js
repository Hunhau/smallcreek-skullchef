'use strict';

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const steam = require('./steam-backend');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#1a1030',
    show: false,
    autoHideMenuBar: true,
    title: 'Skullchef',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: !app.isPackaged
    }
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  steam.initSteam();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.on('quit-app', () => app.quit());

ipcMain.on('steam:get-available', (e) => { e.returnValue = steam.isAvailable(); });
ipcMain.on('steam:get-inventory-ready', (e) => { e.returnValue = steam.isInventoryReady(); });

ipcMain.handle('steam:activate', (_e, apiName) => steam.activateAchievement(apiName));
ipcMain.handle('steam:set-stat', (_e, name, value) => steam.setStat(name, value));
ipcMain.handle('steam:store-stats', () => steam.storeStats());
ipcMain.handle('steam:sync-after-load', (_e, gameAch) => steam.syncAfterLoad(gameAch));
ipcMain.handle('steam:grant-item', (_e, item) => steam.grantItem(item));
ipcMain.handle('steam:get-inventory', () => steam.getInventory());
