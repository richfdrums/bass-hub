# Bass Hub — Agent Guide

Local-first Electron + React desktop app for bass anglers: gear inventory (owned + wishlist), trip planning/logging, quick links, and tide/weather dashboard widgets. `README.md` is user-facing; `CLAUDE.md` has a longer architecture write-up that is still accurate.

## Commands

- `npm start` — Electron Forge + Vite. The renderer hot-reloads, but changes to `src/main.js`, `src/preload.js`, `src/db.js`, or Vite/Forge config require a full restart.
- `npm run package` — builds `out/Bass Hub-darwin-arm64/Bass Hub.app` (see `.claude/skills/package-app` for the full packaging workflow).
- `npm run make` — distributables; macOS zip is the primary target, squirrel/deb/rpm makers are also configured.
- `npm run lint` — a no-op `echo`. There are no tests, no linter, no TypeScript. Verify changes by running the app and exercising the affected view.
- Fresh worktree: run `npm install` first. Forge rebuilds the `better-sqlite3` native module for Electron on `start`/`package`.

## Architecture

- Forge's Vite plugin (`forge.config.js`) builds three bundles: main (`src/main.js`), preload (`src/preload.js`), and renderer (`index.html` → `src/renderer.jsx`).
- Adding IPC touches three files: helper in `src/db.js` → `ipcMain.handle('kebab-case', ...)` in `src/main.js` → `contextBridge` method in `src/preload.js`. Components call `window.fishingApi.*` directly; there is no state library, so each top-level view loads its own data.
- No router. `src/renderer.jsx` holds `activeTab`; cross-view navigation uses one-shot flags/IDs in `App` state plus an `on...Handled` callback that clears them.
- `src/db.js` opens `fishing_hub_v6.db` in `app.getPath('userData')` at import time. The same filename is hardcoded again in `main.js` export/import handlers — change both if it ever moves.
- Schema is `CREATE TABLE IF NOT EXISTS` at module load; later changes are `ALTER TABLE ... ADD COLUMN` in try/catch below it. Gear inserts/updates use the `gearColumns` whitelist: a new gear column must be added to both the migration and that array, or it is silently dropped.
- `trips.links` is a JSON string parsed in `getTrips`. `gear` is one wide table with category-specific nullable columns; `is_wishlist` separates owned gear from the wishlist.
- Gear images are copied/downloaded into `userData/gear_images/` with the absolute path in `gear.image_path`. The renderer displays them as `file://` URLs, which is why the BrowserWindow sets `webSecurity: false`; don't re-enable it without reworking image display.
- Native modules: `better-sqlite3` is externalized in `vite.main.config.mjs` and copied along with `bindings` / `file-uri-to-path` by `vite-plugin-static-copy`; `plugin-auto-unpack-natives` unpacks it from the asar. A new native dependency needs the same treatment or it will fail only in packaged builds.
- Styling is one plain-CSS file, `src/index.css`, using dark-theme variables. The window uses `titleBarStyle: 'hiddenInset'`; `.titlebar-drag-region` in `App` is the drag area.

## Feature gotchas

- **Maps key**: `settings.google_maps_api_key` (set in Settings) takes precedence over `GOOGLE_MAPS_API_KEY` from `.env` (dotenv, loaded in main only). `renderer.jsx` waits for the key and only wraps the app in `<APIProvider>` when it is non-empty, so every map view needs a no-key fallback. A newly saved key only takes effect after an app restart.
- **Trip maps** are Google Maps **Embed API** iframes (`trips.map_query`, falling back to lat/lng), so the Cloud project needs the Embed API enabled in addition to Maps JS. `@vis.gl/react-google-maps` is only used for `APIProvider` in `renderer.jsx`; don't reintroduce interactive `<Map>` components without a no-key guard.
- **Smart Extract** (`extract-gear-details` in `main.js`): axios + cheerio scrape with Tackle Warehouse selectors first, then `itemprop`/OpenGraph fallbacks. Brand comes from a hardcoded brand list, category from an ordered keyword cascade; `GearCatalog.jsx` then calls `download-image`. Scrapers are brittle — retest against a real product URL when touching them.
- **Tides**: `TideWidget.jsx` calls NOAA CO-OPS directly from the renderer for hardcoded station 8635299.
- **Weather**: `WeatherWidget.jsx` calls Open-Meteo directly from the renderer. Locations are hardcoded in `LOCATIONS`; the selected one persists in `settings.weather_location`.
- **Dashboard masonry**: `Dashboard.jsx` sets each widget's `gridRowEnd` from its measured height. Dashboard widgets must size to content — percentage heights break the layout (see the `.dashboard .grid > *` comment in `index.css`).
- **Backup/restore** uses native dialogs; restore overwrites the DB file and calls `app.relaunch()`. The packaged app shares the same `userData` database, and builds are unsigned.
