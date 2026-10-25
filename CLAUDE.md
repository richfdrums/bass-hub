# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Bass Hub is a local-first app for bass anglers: gear inventory (owned + wishlist), trip planning/logging, quick links, and tide/weather dashboard widgets. One React UI runs in two shells: Electron on macOS and Capacitor on iPad. `AGENTS.md` is the shorter guide; `docs/ipad-port.md` explains the iPad port, its decisions and what was verified.

## Commands

- `npm start` — run in dev (Electron Forge + Vite dev server with HMR for the renderer)
- `npm run package` — package the app (`out/`)
- `npm run make` — build distributables (macOS zip is the primary target; squirrel/deb/rpm makers are also configured)
- `npm run typecheck` — `tsc` over the Node and web projects; run after touching `src/core/`, `src/shared/`, `src/ios/` or any `.tsx`
- `npm run build:ios` — Vite build to `dist/ios` + `cap sync ios`; then `xcodebuild` or `npx cap open ios`
- `npm run assets:ios` — regenerate the iOS icon and launch image from `src/assets/logo.png`

There is no test suite and no linter (`npm run lint` is a no-op echo). Verify changes by running the app — and for the iPad, by building and launching it in the simulator.

## Architecture

**Two shells, one core.** `src/core/` holds everything platform-neutral: `db.ts` (schema, migrations, CRUD), `backend.ts` (the `CoreApi` object), `extract.ts` (the scraper), `platform.ts` (the `SqlDatabase` seam). It runs on `better-sqlite3` in Electron (`src/main/platform/electronDb.ts`) and on a Swift plugin on iPad (`ios/App/App/SqlitePlugin.swift`, wrapped by `src/ios/platform/iosDb.ts`).

**Build**: Electron Forge's Vite plugin (`forge.config.js`) builds three bundles — `src/main.js` (`vite.main.config.mjs`), `src/preload.ts` (`vite.preload.config.mjs`), and the renderer from `index.html` → `src/renderer.jsx` (`vite.renderer.config.mjs`). `better-sqlite3` is marked external in the main config and copied (along with its `bindings` / `file-uri-to-path` deps) into the build via `vite-plugin-static-copy`; `plugin-auto-unpack-natives` unpacks it from the asar. Adding another native module requires the same treatment. The iPad build is a separate Vite config (`vite.ios.config.mjs`) writing to `dist/ios`, which never reaches the Mac asar.

**API surface** (`src/shared/api.ts`): `CoreApi` (everything shared), `DesktopApi` (file dialogs, `saveImage`, Maps key) and `SnapshotApi` (iPad snapshot exchange). Each shell installs an implementation on `window.fishingApi`: `src/preload.ts` over IPC for Electron, `src/ios/main.tsx` in-process for the iPad. Components call `window.fishingApi.*` directly; there is no state library — each top-level view loads its own data.

**IPC flow on desktop** (three files must stay in sync when adding a feature):
1. `src/core/` — SQLite access behind the async `SqlDatabase` seam, or the relevant helper.
2. `src/main.js` — `ipcMain.handle('kebab-case-channel', ...)`, usually one line into `backend`.
3. `src/preload.ts` — exposes `window.fishingApi.camelCaseMethod` via `contextBridge`, one `ipcRenderer.invoke` per channel.

On iPad there is no IPC: add the method to `backend` (shared) or to `src/ios/platform/`, then to the object built in `src/ios/main.tsx`.

**Navigation**: No router. `src/App.jsx` holds `activeTab` state and switches between top-level views in `src/components/`; `src/renderer.jsx` is a thin desktop entry that renders the same `App`. Cross-view navigation (e.g. Dashboard → Smart Add, Dashboard → a specific trip) is done with one-shot flags/IDs in `App` state passed down as props plus an `on...Handled` callback that clears them.

**Database** (`src/core/db.ts`):
- File is `fishing_hub_v6.db` in Electron's `userData` dir on the Mac and in `Library/Application Support` on the iPad (the name is repeated in `DbPaths.swift`; the export/import handlers in `main.js` use `platform().dbPath`).
- The connection is opened by the shell (`whenReady` in Electron, `src/ios/main.tsx` on iPad) and handed to `initBackend`; nothing opens at import time.
- Schema is `CREATE TABLE IF NOT EXISTS`; later columns are added with `ensureColumn()`, which checks `PRAGMA table_info` first instead of relying on a swallowed `ALTER TABLE` error.
- `gear` is a single wide table with category-specific nullable columns (rod/reel/lure/line/terminal). Inserts/updates are driven by the `gearColumns` whitelist — a new gear column must be added to both the schema/migration and `gearColumns`.
- `trips.links` is stored as a JSON string and parsed in `getTrips`.
- `PRAGMA user_version = 1` is written after migrations; a database with a newer version is refused at startup, and both import paths check it before replacing anything.
- Desktop restore overwrites the DB file and relaunches the app; it validates the file and closes the connection first.

**Images**: `src/components/GearImage.tsx` owns the rule — `image_path` (local file, desktop override) → `image_url` (hotlinked product image) → nothing. Local paths are displayed via `file://`, which is why `webSecurity: false` is set on the BrowserWindow; the iPad entry point overrides the resolver to `null` so rows fall through to `image_url`. Nothing is downloaded: Smart Extract stores the product image URL. A URL that fails to load drops the image instead of showing a broken glyph.

**Smart Extract** (`src/core/extract.ts`): global `fetch` + cheerio scrape of a product URL with selectors tuned for Tackle Warehouse first, then generic `itemprop`/OpenGraph fallbacks. Brand falls back to a hardcoded brand list matched against the title; category is inferred by an ordered keyword cascade (Rods → Reels → Lures → Terminal Tackle → Fishing Line). `fetch` rather than axios because it is the one HTTP seam that works in Electron main and through CapacitorHttp. `fetchPageTitle` lives next to it.

**Maps**: The Google Maps key is resolved in `get-maps-api-key` — `settings` table (`google_maps_api_key`, set from the Settings view) takes precedence over `GOOGLE_MAPS_API_KEY` in `.env` (loaded by `dotenv` in main). `App.jsx` waits for the key before rendering and only wraps the app in `<APIProvider>` if a key exists. The iPad build bakes the `.env` key in at build time (`__MAPS_KEY__`) and reads the settings copy first. Trip display and the trip form both use Google Maps **Embed API** iframes (`trips.map_query`, falling back to lat/lng); there are no interactive map components. Components must handle the no-key case.

**iPad specifics**: the entry point is `src/ios/main.tsx` (opens the DB, installs the API, renders `App`). iOS-only CSS is scoped by `<html data-platform="ios">`, iOS-only JS by `IS_IOS` from `src/shared/platform.ts`. The sidebar starts as an icon rail and expands as an overlay. Swift plugins live in `ios/App/App/` and must be registered in `AppBridgeViewController.swift` and added to `project.pbxproj` by ID (Capacitor only auto-registers npm plugins). Data moves by snapshot exchange only — see `docs/ipad-port.md`.

**Tides**: `TideWidget.jsx` calls the NOAA CO-OPS API directly from the renderer for a hardcoded station (8635299).

**Weather**: `WeatherWidget.jsx` calls Open-Meteo directly from the renderer; locations are hardcoded in `LOCATIONS` and the selection persists in `settings.weather_location`.

## Conventions

- Styling is plain CSS in `src/index.css` (CSS variables for the dark theme); keep the dark/premium look. Some components use inline styles. New iPad rules go in the appended `[data-platform="ios"]` block, not inline.
- The window uses `titleBarStyle: 'hiddenInset'`; the `.titlebar-drag-region` element in `App` provides the drag area (hidden on iPad, where it would swallow taps).
- TypeScript is incremental: `src/core/`, `src/shared/`, `src/ios/`, `src/main/`, `src/preload.ts` and `GearImage.tsx` are typed; the rest of the components are still `.jsx`. Add types at the seams you touch rather than converting files wholesale.
