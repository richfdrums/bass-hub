# Bass Hub — Agent Guide

Local-first app for bass anglers: gear inventory (owned + wishlist), trip planning/logging, quick links, and tide/weather dashboard widgets. One React UI runs in two shells: Electron on macOS (`src/main.js` + `src/preload.ts`) and Capacitor on iPad (`src/ios/`). `README.md` is user-facing; `CLAUDE.md` has a longer architecture write-up; `docs/ipad-port.md` explains the iPad port and what was verified.

## Commands

- `npm start` — Electron Forge + Vite. The renderer hot-reloads, but changes to `src/main.js`, `src/preload.ts`, `src/core/`, or Vite/Forge config require a full restart.
- `npm run package` — builds `out/Bass Hub-darwin-arm64/Bass Hub.app` (see `.claude/skills/package-app` for the full packaging workflow).
- `npm run make` — distributables; macOS zip is the primary target, squirrel/deb/rpm makers are also configured.
- `npm run typecheck` — `tsc` over the Node and web projects. Run it after touching `src/core/`, `src/shared/`, `src/ios/`, or any `.tsx`. The `.jsx` components are unchecked.
- `npm run build:ios` — Vite build to `dist/ios` + `cap sync ios`. Then `xcodebuild` or `npx cap open ios`.
- `npm run assets:ios` — regenerates the iOS icon and launch image from `src/assets/logo.png`.
- `npm run lint` — a no-op `echo`. There are no tests. Verify changes by running the app and exercising the affected view.
- Fresh worktree: run `npm install` first. Forge rebuilds the `better-sqlite3` native module for Electron on `start`/`package`.

## Architecture

- **Two shells, one core.** `src/core/` is platform-agnostic: `db.ts` (schema, migrations, CRUD), `backend.ts` (the `CoreApi` object), `extract.ts` (scraper), `platform.ts` (the `SqlDatabase` seam). It runs against `better-sqlite3` in Electron (`src/main/platform/electronDb.ts`) and against a Swift plugin on iPad (`ios/App/App/SqlitePlugin.swift` ← `src/ios/platform/iosDb.ts`).
- `src/shared/api.ts` is the single source of truth for `window.fishingApi` (`CoreApi` + `DesktopApi` + optional `SnapshotApi`). Each shell installs an implementation: `src/preload.ts` for Electron, `src/ios/main.tsx` in-process for the iPad.
- Adding IPC on desktop touches three files: helper in `src/core/` → `ipcMain.handle('kebab-case', ...)` in `src/main.js` → `contextBridge` method in `src/preload.ts`. On iPad there is no IPC: add it to `backend` (shared) or to `src/ios/platform/`. Components call `window.fishingApi.*` directly; there is no state library, so each top-level view loads its own data.
- No router. `src/App.jsx` holds `activeTab`; cross-view navigation uses one-shot flags/IDs in `App` state plus an `on...Handled` callback that clears them. `src/renderer.jsx` is a thin desktop entry that renders the same `App`.
- `src/core/db.ts` is opened by the shell, not at import: Electron in `whenReady`, iPad in `src/ios/main.tsx`. The database is `fishing_hub_v6.db` in `app.getPath('userData')` on the Mac and in `Library/Application Support` on the iPad; the name is repeated in `DbPaths.swift` — change both if it moves.
- Schema is `CREATE TABLE IF NOT EXISTS`; later columns go through `ensureColumn()` (checks `PRAGMA table_info` first), not blind `ALTER TABLE`. Gear inserts/updates use the `gearColumns` whitelist: a new gear column must be added to the schema/migration **and** that array, or it is silently dropped. `PRAGMA user_version = 1` is written after migrations and a newer database is refused at startup.
- `trips.links` is a JSON string parsed in `getTrips`. `gear` is one wide table with category-specific nullable columns; `is_wishlist` separates owned gear from the wishlist.
- **Gear images** resolve in `src/components/GearImage.tsx`: `image_path` (local file, desktop override) → `image_url` (hotlinked product image) → nothing. `image_path` is a bare absolute path rendered as `file://`, which is why the BrowserWindow sets `webSecurity: false`; don't re-enable it without reworking image display. The iPad has no local files yet, so its entry point overrides the resolver to `null` and rows fall through to `image_url`.
- Native modules: `better-sqlite3` is externalized in `vite.main.config.mjs` and copied along with `bindings` / `file-uri-to-path` by `vite-plugin-static-copy`; `plugin-auto-unpack-natives` unpacks it from the asar. A new native dependency needs the same treatment or it will fail only in packaged builds. `dist/ios` and `ios/` never reach the Mac asar.
- Styling is one plain-CSS file, `src/index.css`, using dark-theme variables. The window uses `titleBarStyle: 'hiddenInset'`; `.titlebar-drag-region` in `App` is the drag area.
- **iPad-only code** is scoped by `<html data-platform="ios">` (set statically in `src/ios/index.html`) for CSS, and by `IS_IOS` from `src/shared/platform.ts` in JS. Swift plugins are registered by hand in `AppBridgeViewController.swift` (Capacitor only auto-registers npm plugins) and added to `project.pbxproj` by ID.

## Feature gotchas

- **Maps key**: `settings.google_maps_api_key` (set in Settings) takes precedence over `GOOGLE_MAPS_API_KEY` from `.env` (dotenv, loaded in main only). `App.jsx` waits for the key and only wraps the app in `<APIProvider>` when it is non-empty, so every map view needs a no-key fallback. A newly saved key only takes effect after an app restart. The iPad build bakes the `.env` key in at build time (`__MAPS_KEY__` in `vite.ios.config.mjs`) — never commit it.
- **Trip maps** are Google Maps **Embed API** iframes (`trips.map_query`, falling back to lat/lng), so the Cloud project needs the Embed API enabled in addition to Maps JS. `@vis.gl/react-google-maps` is only used for `APIProvider` in `App.jsx`; don't reintroduce interactive `<Map>` components without a no-key guard.
- **Smart Extract** (`src/core/extract.ts`): global `fetch` + cheerio (no axios — `fetch` is the one HTTP seam that works in Electron main and through CapacitorHttp). Tackle Warehouse selectors first, then `itemprop`/OpenGraph fallbacks. Brand comes from a hardcoded brand list, category from an ordered keyword cascade. It returns `extracted_image_url` and `GearCatalog.jsx` stores it as `image_url`; nothing is downloaded. Scrapers are brittle — retest against a real product URL when touching them.
- **Tides**: `TideWidget.jsx` calls NOAA CO-OPS directly from the renderer for hardcoded station 8635299.
- **Weather**: `WeatherWidget.jsx` calls Open-Meteo directly from the renderer. Locations are hardcoded in `LOCATIONS`; the selected one persists in `settings.weather_location`.
- **Dashboard masonry**: `Dashboard.jsx` sets each widget's `gridRowEnd` from its measured height. Dashboard widgets must size to content — percentage heights break the layout (see the `.dashboard .grid > *` comment in `index.css`).
- **Desktop backup/restore** uses native dialogs; restore validates the file (`integrity_check` + `user_version`), closes the DB, overwrites it, and calls `app.relaunch()`. Builds are unsigned.
- **iPad snapshots** (`ios/App/App/SnapshotPlugin.swift`): export closes → copies → reopens → share sheet; import is two steps (`pick` validates without touching anything, `replace` swaps the file) with a confirm modal in between. There is no sync — the iPad is authoritative by convention. Both platforms keep the last five invisible backups in `Application Support/backups`.
