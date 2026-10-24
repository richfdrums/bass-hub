// Desktop shell of the shared API: every call crosses IPC to src/main.js.
// The iPad implements the same interface in-process (src/ios/main.jsx).

import { contextBridge, ipcRenderer, webUtils } from 'electron';
import type { Api } from './shared/api';

const api: Api = {
  getGear: () => ipcRenderer.invoke('get-gear'),
  addGear: (gear) => ipcRenderer.invoke('add-gear', gear),
  updateGear: (id, gear) => ipcRenderer.invoke('update-gear', id, gear),
  deleteGear: (id) => ipcRenderer.invoke('delete-gear', id),
  saveImage: (filePath) => ipcRenderer.invoke('save-image', filePath),
  extractGearDetails: (url) => ipcRenderer.invoke('extract-gear-details', url),
  getFilePath: (file) => webUtils.getPathForFile(file),

  getTrips: () => ipcRenderer.invoke('get-trips'),
  addTrip: (trip) => ipcRenderer.invoke('add-trip', trip),
  updateTrip: (id, trip) => ipcRenderer.invoke('update-trip', id, trip),
  deleteTrip: (id) => ipcRenderer.invoke('delete-trip', id),

  getLinks: () => ipcRenderer.invoke('get-links'),
  addLink: (link) => ipcRenderer.invoke('add-link', link),
  updateLink: (id, link) => ipcRenderer.invoke('update-link', id, link),
  deleteLink: (id) => ipcRenderer.invoke('delete-link', id),
  fetchPageTitle: (url) => ipcRenderer.invoke('fetch-page-title', url),
  getMapsApiKey: () => ipcRenderer.invoke('get-maps-api-key'),
  exportDatabase: () => ipcRenderer.invoke('export-database'),
  importDatabase: () => ipcRenderer.invoke('import-database'),
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  updateSetting: (key, value) => ipcRenderer.invoke('update-setting', key, value),
};

contextBridge.exposeInMainWorld('fishingApi', api);
