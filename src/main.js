import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import { backend, initBackend } from './core/backend';
import { openElectronDb } from './main/platform/electronDb';
import { platform } from './core/platform';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hiddenInset', // Premium Mac feel
    trafficLightPosition: { x: 16, y: 16 }, // Offset for cleaner look
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: false, // Allow local image display
    },
    icon: path.join(__dirname, '../../src/assets/icon.icns'),
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();
};

// IPC Handlers
ipcMain.handle('get-gear', () => backend.getGear());
ipcMain.handle('add-gear', (_event, gear) => backend.addGear(gear));
ipcMain.handle('update-gear', (_event, id, gear) => backend.updateGear(id, gear));
ipcMain.handle('delete-gear', (_event, id) => backend.deleteGear(id));

// Scraping lives in src/core/extract.ts; these two just forward to it.
ipcMain.handle('extract-gear-details', (_event, url) => backend.extractGearDetails(url));
ipcMain.handle('fetch-page-title', (_event, url) => backend.fetchPageTitle(url));

ipcMain.handle('save-image', async (event, filePath) => {
  try {
    if (!filePath || typeof filePath !== 'string') {
      console.error('save-image error: Invalid or missing filePath:', filePath);
      return null;
    }

    const imagesDir = path.join(app.getPath('userData'), 'gear_images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const fileName = `${Date.now()}-${path.basename(filePath)}`;
    const destPath = path.join(imagesDir, fileName);

    console.log(`Copying image: ${filePath} -> ${destPath}`);
    fs.copyFileSync(filePath, destPath);
    return destPath;
  } catch (err) {
    console.error('save-image failed:', err);
    return null;
  }
});

ipcMain.handle('get-trips', () => backend.getTrips());
ipcMain.handle('add-trip', (_event, trip) => backend.addTrip(trip));
ipcMain.handle('update-trip', (_event, id, trip) => backend.updateTrip(id, trip));
ipcMain.handle('delete-trip', (_event, id) => backend.deleteTrip(id));

ipcMain.handle('get-links', () => backend.getLinks());
ipcMain.handle('add-link', (_event, link) => {
  try {
    return backend.addLink(link);
  } catch (e) {
    console.error('FAILED TO ADD LINK:', e);
    throw e;
  }
});
ipcMain.handle('update-link', (_event, id, link) => backend.updateLink(id, link));
ipcMain.handle('delete-link', (_event, id) => backend.deleteLink(id));

ipcMain.handle('get-maps-api-key', async () => {
  const dbKey = await backend.getSetting('google_maps_api_key');
  if (dbKey) return dbKey;
  return process.env.GOOGLE_MAPS_API_KEY || '';
});

ipcMain.handle('get-setting', (_event, key) => backend.getSetting(key));

ipcMain.handle('update-setting', (_event, key, value) => backend.updateSetting(key, value));

// Data Backup & Restore Handlers
ipcMain.handle('export-database', async (event) => {
  const dbPath = platform().dbPath;

  const { filePath } = await dialog.showSaveDialog({
    title: 'Export Database Backup',
    defaultPath: path.join(app.getPath('downloads'), `fishing_hub_backup_${new Date().toISOString().split('T')[0]}.db`),
    filters: [{ name: 'SQLite Database', extensions: ['db'] }]
  });

  if (filePath) {
    try {
      fs.copyFileSync(dbPath, filePath);
      return { success: true, path: filePath };
    } catch (err) {
      console.error('Export failed:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, cancelled: true };
});

ipcMain.handle('import-database', async (event) => {
  const dbPath = platform().dbPath;

  const { filePaths } = await dialog.showOpenDialog({
    title: 'Select Backup to Restore',
    filters: [{ name: 'SQLite Database', extensions: ['db'] }],
    properties: ['openFile']
  });

  if (filePaths && filePaths.length > 0) {
    const backupPath = filePaths[0];

    if (!fs.existsSync(backupPath)) {
      return { success: false, error: 'File not found' };
    }

    try {
      const { response } = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Cancel', 'Restore & Restart'],
        defaultId: 0,
        title: 'Confirm Restore',
        message: 'Restoring a backup will overwrite all current data. The application will restart to apply changes.',
        detail: 'Make sure you have a current backup if you want to keep your existing data.'
      });

      if (response === 1) {
        fs.copyFileSync(backupPath, dbPath);
        app.relaunch();
        app.exit(0);
        return { success: true };
      }
    } catch (err) {
      console.error('Import failed:', err);
      return { success: false, error: err.message };
    }
  }
  return { success: false, cancelled: true };
});

app.whenReady().then(async () => {
  // Open and migrate the DB before any window can issue an IPC call.
  const dbPath = path.join(app.getPath('userData'), 'fishing_hub_v6.db');
  await initBackend({
    db: openElectronDb(dbPath),
    appVersion: app.getVersion(),
    dbPath,
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
