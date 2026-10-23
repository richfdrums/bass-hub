import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import started from 'electron-squirrel-startup';
import axios from 'axios';
import * as cheerio from 'cheerio';
import db from './db.js';
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
ipcMain.handle('get-gear', () => db.getGear());
ipcMain.handle('add-gear', (event, gear) => db.addGear(gear));
ipcMain.handle('update-gear', (event, id, gear) => db.updateGear(id, gear));
ipcMain.handle('delete-gear', (event, id) => db.deleteGear(id));

ipcMain.handle('extract-gear-details', async (event, url) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    const $ = cheerio.load(response.data);

    const title = $('title').text() || $('h1').first().text();

    // Target the specific description div for TW, otherwise fallback to meta tags
    let description = '';
    const descElement = $('[itemprop="description"]');
    if (descElement.length) {
      // Get text from paragraphs to preserve structure, excluding h2/headings
      description = descElement.find('p').map((i, el) => $(el).text().trim()).get().join('\n\n');
      if (!description) description = descElement.text().trim();
    }

    if (!description) {
      description = $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') || '';
    }

    // Clean up excessive whitespace but preserve newlines
    description = description.replace(/[^\S\r\n]+/g, ' ').trim();

    // Brand Extraction
    let brand = $('#main_content meta[itemprop="brand"]').attr('content') || // Tackle Warehouse underscored meta
      $('#main-content meta[itemprop="brand"]').attr('content') || // Hyphenated meta
      $('.brand-name').text().trim() ||
      $('.desc_top-head-brand').text().replace('Shop All', '').trim() || // TW description link
      $('[itemprop="brand"]').attr('content') || // General meta itemprop
      $('[itemprop="brand"]').text().trim() ||
      $('[itemprop="brand"] [itemprop="name"]').text().trim() ||
      $('meta[property="og:brand"]').attr('content') || '';

    const brands = [
      'Shimano', 'Daiwa', 'St. Croix', 'Abu Garcia', 'Lew\'s', 'Gary Yamamoto',
      'Strike King', 'Megabass', 'Berkley', 'Rapala', 'Zoom', 'G.Loomis',
      'Dobyns', 'Fenwick', 'Pflueger', 'Okuma', '13 Fishing', 'Jackall',
      'Keitech', 'Z-Man', 'Missile Baits', 'Lunker City', 'Reaction Innovations',
      'NetBait', 'Roboworm', 'V&M', 'Zoom Bait', 'Owner'
    ];

    if (!brand) {
      brand = brands.find(b => title.toLowerCase().includes(b.toLowerCase())) || '';
    }

    // Model - extract from title (remove brand)
    let model = title.split('|')[0].split('-')[0].trim();
    if (brand) {
      model = model.replace(new RegExp(brand, 'gi'), '').trim();
    }

    // Image Extraction
    let imageUrl = $('img.main_image').attr('src') || // Tackle Warehouse specific
      $('[itemprop="image"]').attr('src') ||
      $('[itemprop="image"]').attr('content') ||
      $('meta[property="og:image"]').attr('content') ||
      $('link[rel="image_src"]').attr('href') || '';

    if (imageUrl && !imageUrl.startsWith('http')) {
      const baseUrl = new URL(url).origin;
      imageUrl = new URL(imageUrl, baseUrl).href;
    }

    // Enhanced Category Detection
    let category = 'Lures'; // Default
    const breadcrumbs = $('.breadcrumb').text().toLowerCase() || // Common class
      $('.desc_top-head-breadcrumb').text().toLowerCase() || // TW specific
      $('#breadcrumb').text().toLowerCase() || '';

    const urlStr = url.toLowerCase();
    const modelLower = model.toLowerCase();
    const titleLower = title.toLowerCase();
    const descriptionLower = description.toLowerCase();

    // Combine for broad search, but we will prioritize specific areas
    const searchableContent = (title + ' ' + description + ' ' + breadcrumbs).toLowerCase();

    // LURE KEYWORDS (Check Model/Title first as high signal)
    const lureKeywords = ['bait', 'lure', 'jerkbait', 'crankbait', 'swimbait', 'frog', 'worm', 'stickbait', 'creature', 'minnow', 'topwater', 'popper'];
    const isLureModel = lureKeywords.some(k => modelLower.includes(k)) || lureKeywords.some(k => titleLower.includes(k));

    // TERMINAL KEYWORDS
    const terminalKeywords = ['hook', 'weight', 'jighead', 'sinker', 'terminal tackle', 'split shot'];
    const isTerminalModel = terminalKeywords.some(k => modelLower.includes(k)) || (terminalKeywords.some(k => titleLower.includes(k)) && !isLureModel);

    // 1. Check Rods (Highly specific)
    if (modelLower.includes('rod') || titleLower.includes('rod') || breadcrumbs.includes('rod')) {
      category = 'Rods';
    }
    // 2. Check Reels (Highly specific)
    else if (modelLower.includes('reel') || titleLower.includes('reel') || breadcrumbs.includes('reel')) {
      category = 'Reels';
    }
    // 3. Priority Signal: Is the Model/Title explicitly a Lure? (Overrides description-based Terminal matches)
    else if (isLureModel) {
      category = 'Lures';
    }
    // 4. Priority Signal: Is the Model/Title explicitly Terminal?
    else if (isTerminalModel) {
      category = 'Terminal Tackle';
    }
    // 5. Fallback: Check Description for Line keywords
    else if (
      searchableContent.includes('braid') ||
      searchableContent.includes('flouro') ||
      searchableContent.includes('fluorocarbon') ||
      searchableContent.includes('monofilament') ||
      searchableContent.includes('leader') ||
      searchableContent.includes('copolymer') ||
      (searchableContent.includes('line') && !isLureModel)
    ) {
      category = 'Fishing Line';
    }
    // 6. Deep Fallback: Check full content for Terminal (hooks in description)
    else if (terminalKeywords.some(k => searchableContent.includes(k))) {
      category = 'Terminal Tackle';
    }
    // 7. Final Default
    else {
      category = 'Lures';
    }

    return {
      success: true,
      data: {
        category,
        brand,
        model,
        description: description.substring(0, 2000) + (description.length > 2000 ? '...' : ''),
        url,
        extracted_image_url: imageUrl
      }
    };
  } catch (error) {
    console.error('Extraction failed:', error);
    return { success: false, error: 'Could not fetch page details.' };
  }
});

ipcMain.handle('download-image', async (event, imageUrl) => {
  try {
    const imagesDir = path.join(app.getPath('userData'), 'gear_images');
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    const fileName = `remote-${Date.now()}.jpg`;
    const destPath = path.join(imagesDir, fileName);

    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream'
    });

    const writer = fs.createWriteStream(destPath);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(destPath));
      writer.on('error', reject);
    });
  } catch (err) {
    console.error('Image download failed:', err);
    return null;
  }
});

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

ipcMain.handle('get-trips', () => db.getTrips());
ipcMain.handle('add-trip', (event, trip) => db.addTrip(trip));
ipcMain.handle('update-trip', (event, id, trip) => db.updateTrip(id, trip));
ipcMain.handle('delete-trip', (event, id) => db.deleteTrip(id));

ipcMain.handle('get-links', () => db.getLinks());
ipcMain.handle('add-link', (event, link) => {
  try {
    return db.addLink(link);
  } catch (e) {
    console.error('FAILED TO ADD LINK:', e);
    throw e;
  }
});
ipcMain.handle('update-link', (event, id, link) => db.updateLink(id, link));
ipcMain.handle('delete-link', (event, id) => db.deleteLink(id));

ipcMain.handle('fetch-page-title', async (event, url) => {
  try {
    // Basic validation / adding protocol if missing
    if (!/^https?:\/\//i.test(url)) {
      url = 'https://' + url;
    }
    const { data } = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0'
      }
    });
    const $ = cheerio.load(data);
    const title = $('title').text();
    return title ? title.trim() : '';
  } catch (err) {
    console.error('Fetch title failed:', err.message);
    return '';
  }
});

ipcMain.handle('get-maps-api-key', () => {
  const dbKey = db.getSetting('google_maps_api_key');
  if (dbKey && dbKey.value) return dbKey.value;
  return process.env.GOOGLE_MAPS_API_KEY || '';
});

ipcMain.handle('get-setting', (event, key) => {
  const row = db.getSetting(key);
  return row ? row.value : null;
});

ipcMain.handle('update-setting', (event, key, value) => {
  return db.setSetting(key, value);
});

// Data Backup & Restore Handlers
ipcMain.handle('export-database', async (event) => {
  const dbPath = path.join(app.getPath('userData'), 'fishing_hub_v6.db');

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
  const dbPath = path.join(app.getPath('userData'), 'fishing_hub_v6.db');

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

app.whenReady().then(() => {
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
