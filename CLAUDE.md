# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Bass Hub is a local-first Electron + React desktop app for bass anglers: gear inventory (owned + wishlist), trip planning/logging, quick links, and a NOAA tide widget. See `AGENTS.md` for the original project brief; where it disagrees with this file, this file reflects the current code.

## Commands

- `npm start` — run in dev (Electron Forge + Vite dev server with HMR for the renderer)
- `npm run package` — package the app (`out/`)
- `npm run make` — build distributables (macOS zip is the primary target; squirrel/deb/rpm makers are also configured)

There is no test suite and no linter (`npm run lint` is a no-op echo). Verify changes by running the app.

## Architecture

**Build**: Electron Forge's Vite plugin (`forge.config.js`) builds three bundles — `src/main.js` (`vite.main.config.mjs`), `src/preload.js` (`vite.preload.config.mjs`), and the renderer from `index.html` → `src/renderer.jsx` (`vite.renderer.config.mjs`). `better-sqlite3` is marked external in the main config and copied (along with its `bindings` / `file-uri-to-path` deps) into the build via `vite-plugin-static-copy`; `plugin-auto-unpack-natives` unpacks it from the asar. Adding another native module requires the same treatment.

**IPC flow** (three files must stay in sync when adding a feature):
1. `src/db.js` — SQLite access (better-sqlite3, synchronous). Exports a plain object of CRUD helpers.
2. `src/main.js` — `ipcMain.handle('kebab-case-channel', ...)` handlers; most delegate straight to `db.js`. Network work (scraping, image download, page-title fetch) and file dialogs also live here.
3. `src/preload.js` — exposes `window.fishingApi.camelCaseMethod` via `contextBridge`, one `ipcRenderer.invoke` per channel.
Components call `window.fishingApi.*` directly; there is no state library — each top-level view loads its own data.

**Navigation**: No router. `src/renderer.jsx` holds `activeTab` state and switches between top-level views in `src/components/`. Cross-view navigation (e.g. Dashboard → Smart Add, Dashboard → a specific trip) is done with one-shot flags/IDs in `App` state passed down as props plus an `on...Handled` callback that clears them.

**Database** (`src/db.js`):
- File is `fishing_hub_v6.db` in Electron's `userData` dir (the path is also hardcoded in the export/import handlers in `main.js`).
- Schema is `CREATE TABLE IF NOT EXISTS` at module load; schema changes are added as `ALTER TABLE ... ADD COLUMN` wrapped in try/catch below it (errors on already-existing columns are swallowed).
- `gear` is a single wide table with category-specific nullable columns (rod/reel/lure/line/terminal). Inserts/updates are driven by the `gearColumns` whitelist — a new gear column must be added to both the schema migration and `gearColumns`.
- `trips.links` is stored as a JSON string and parsed in `getTrips`.
- Import-restore overwrites the DB file and relaunches the app.

**Images**: Gear images are copied/downloaded into `userData/gear_images/` and the absolute path is stored in `gear.image_path`. The renderer displays them via local file paths, which is why `webSecurity: false` is set on the BrowserWindow.

**Smart Extract** (`extract-gear-details` in `main.js`): axios + cheerio scrape of a product URL with selectors tuned for Tackle Warehouse first, then generic `itemprop`/OpenGraph fallbacks. Brand falls back to a hardcoded brand list matched against the title; category is inferred by an ordered keyword cascade (Rods → Reels → Lures → Terminal Tackle → Fishing Line). The renderer (`GearCatalog.jsx`) then calls `download-image` for the extracted image URL.

**Maps**: The Google Maps key is resolved in `get-maps-api-key` — `settings` table (`google_maps_api_key`, set from the Settings view) takes precedence over `GOOGLE_MAPS_API_KEY` in `.env` (loaded by `dotenv` in main). `renderer.jsx` waits for the key before rendering and only wraps the app in `<APIProvider>` if a key exists. Trip display uses the Google Maps **Embed API** iframes (`trips.map_query`, falling back to lat/lng); `TripForm` still uses `@vis.gl/react-google-maps` with `PlaceAutocomplete`/`MapHandler` for picking a location. Components must handle the no-key case.

**Tides**: `TideWidget.jsx` calls the NOAA CO-OPS API directly from the renderer for a hardcoded station (8635299).

## Conventions

- Styling is plain CSS in `src/index.css` (CSS variables for the dark theme); keep the dark/premium look. Some components use inline styles.
- The window uses `titleBarStyle: 'hiddenInset'`; the `.titlebar-drag-region` element in `App` provides the drag area.
