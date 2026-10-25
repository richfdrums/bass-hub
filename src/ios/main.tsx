// iPad entry point. This file is the whole "main process": it opens the
// database, wires the shared backend up to window.fishingApi, and renders the
// same <App /> the Electron renderer uses. There is no IPC here — calls go
// straight into src/core/.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../App.jsx';
import { backend, initBackend } from '../core/backend';
import { setLocalImageResolver } from '../components/GearImage.jsx';
import { openIosDb } from './platform/iosDb';
import { snapshots } from './platform/snapshots';
import type { Api } from '../shared/api';

const DB_NAME = 'fishing_hub_v6.db';

function showFatal(message: string) {
  const root = document.getElementById('root');
  if (!root) return;
  root.innerHTML = `
    <div style="padding:64px 24px;font:15px -apple-system,system-ui;color:#e6edf3;background:#0a0a0a;min-height:100vh">
      <h2 style="margin:0 0 12px">Bass Hub could not start</h2>
      <pre style="white-space:pre-wrap;color:#f85149;font:12px ui-monospace,monospace">${message}</pre>
    </div>`;
}

/**
 * The iPad implements the shared CoreApi in-process, adds the snapshot
 * exchange, and stubs out the desktop-only file/dialog methods.
 */
function installApi(path: string): void {
  const api: Api = {
    ...backend,
    ...snapshots,

    // The Maps key is baked into the bundle at build time (see
    // vite.ios.config.mjs); Settings still edits the DB copy, which is read
    // first on the next launch.
    getMapsApiKey: async () => (await backend.getSetting('google_maps_api_key')) || __MAPS_KEY__,

    // Desktop-only until the photo-library override (P2).
    saveImage: async () => null,
    getFilePath: () => '',
    exportDatabase: async () => ({ success: false, error: 'Use Export snapshot on iPad' }),
    importDatabase: async () => ({ success: false, error: 'Use Import snapshot on iPad' }),
  };

  // image_path is a desktop-local file, which this app cannot load. Returning
  // null makes GearImage fall back to image_url (or show nothing at all)
  // instead of a broken/empty image box. The photo-library override (P2) will
  // resolve real paths under the app container here.
  setLocalImageResolver(() => null);

  window.fishingApi = api;
  console.log(`[bass-hub] db at ${path}`);
}

async function start() {
  const { db, path } = await openIosDb(DB_NAME);
  await initBackend({ db, appVersion: __APP_VERSION__, dbPath: path });
  installApi(path);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

start().catch((err) => {
  console.error('[bass-hub] startup failed', err);
  showFatal(err instanceof Error ? err.stack || err.message : String(err));
});
