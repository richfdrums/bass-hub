# Bass Hub - Project Context for AI Agents

## Overview
**Bass Hub** is a specialized desktop application designed for bass fishing enthusiasts. It allows users to track their fishing gear inventory, plan and log fishing trips, and organize useful web resources. The application is built as a standalone local-first tool using Electron.

## Technology Stack
-   **Runtime**: Electron (Node.js + Chromium), packaged with Electron Forge
-   **Frontend**: React (via Vite), Plain CSS
-   **Database**: SQLite (`better-sqlite3`) - Local data storage
-   **Maps & Location**: Google Maps Platform (Maps JS + Places via `@vis.gl/react-google-maps`, Maps Embed API)
-   **Tides**: NOAA CO-OPS Tides & Currents API
-   **Utilities**: `cheerio` & `axios` (Web scraping for product extraction)

## Architecture & patterns

### 1. Process Separation
-   **Main Process (`src/main.js`)**:
    -   Handles application lifecycle and window creation.
    -   Manages SQLite database connections (`src/db.js`).
    -   Executes "heavy" operations like web scraping for the Smart Extract feature, image downloads, and page-title fetching.
    -   Handles database backup/restore via native file dialogs.
    -   Resolves the Google Maps API key: the `google_maps_api_key` row in the `settings` table takes precedence over `GOOGLE_MAPS_API_KEY` in `.env`. The key is stored as plain text (not encrypted).
-   **Renderer Process (`src/renderer.jsx`)**:
    -   React-based UI. No router: `App` holds an `activeTab` state and switches between views.
    -   Communicates with Main via `window.fishingApi` (Context Bridge).
    -   **Critical**: Waits for the Maps API key from Main before rendering, then wraps the app in `<APIProvider>` *only* if a key exists.

### 2. Data Persistence
-   Data is stored in a local SQLite file (`fishing_hub_v6.db` in Electron's `userData` directory).
-   Gear images are copied/downloaded into `userData/gear_images/`; the absolute path is stored in `gear.image_path`.
-   **Schema**:
    -   `gear`: Inventory items (Rods, Reels, Lures, Fishing Line, Terminal Tackle). One wide table with category-specific columns; `is_wishlist` separates owned gear from the wishlist.
    -   `trips`: Fishing logs with location data (lat/lng, `map_query`) and a `links` column stored as JSON.
    -   `quick_links`: Bookmarks for external sites, grouped by `category`.
    -   `settings`: App configuration (e.g., Google Maps API Key).
-   **Migrations**: Schema changes are added in `db.js` as `ALTER TABLE ... ADD COLUMN` wrapped in try/catch. New gear columns must also be added to the `gearColumns` whitelist.

### 3. Key Features
-   **Smart Extract**: Users paste a product URL -> Main scrapes the page (Tackle Warehouse-specific selectors first, then `itemprop`/OpenGraph fallbacks) and infers brand and category -> Auto-fills the Gear Form and downloads the product image. Logic resides in `main.js`.
-   **Map Integration**:
    -   Trip pages display maps using Google Maps Embed API iframes (driven by `trips.map_query`, falling back to lat/lng).
    -   The trip form uses `@vis.gl/react-google-maps` (with Places autocomplete) for picking a location.
    -   Includes fallback UI ("Map Unavailable") if the user hasn't provided an API key.
-   **Tide Predictions**: Dashboard widget showing high/low tides for NOAA station 8635299 (Port Royal, Rappahannock River).
-   **Backup & Restore**: Settings can export the DB file or restore from one (restore overwrites the DB and relaunches the app).

## Directory Structure
-   `src/`
    -   `assets/`: Images and branding (Logo, App Icon).
    -   `components/`: Reusable React components.
        -   `Dashboard.jsx`: Landing view with summary widgets and `TideWidget.jsx`.
        -   `GearCatalog.jsx`: Main inventory view; handles "Smart Extract" flows.
        -   `FishingTrips.jsx`: Management of past/future trips.
        -   `QuickLinks.jsx`: Bookmark management.
        -   `Settings.jsx`: Google Maps API key and database backup/restore.
    -   `db.js`: Database initialization, schema definitions, and helper methods.
    -   `main.js`: IPC handlers and backend logic.
    -   `preload.js`: Defines the `window.fishingApi` bridge.
    -   `renderer.jsx`: App entry point; handles API key loading state.

## Development & Build
-   **Run Locally**: `npm start`
-   **Package**: `npm run package`
-   **Build Distributable**: `npm run make`
    -   Primary target: macOS `.zip` (Squirrel, deb, and rpm makers are also configured).
    -   **Important**: `better-sqlite3` is external in `vite.main.config.mjs` and copied into the build (with `bindings` and `file-uri-to-path`) via `vite-plugin-static-copy`; `plugin-auto-unpack-natives` unpacks it from the asar.
-   No tests or linter are configured.

## Common Tasks & Rules
-   **Adding IPC**: Add DB helper in `db.js` (if needed), handler in `main.js`, expose in `preload.js` whitelist, consume in React components.
-   **Styling**: Use `index.css` for app-wide variables (colors, fonts). Maintain the dark/premium aesthetic.
-   **Icons**: The app uses a custom "Squircle" icon. The sidebar logo is `src/assets/logo.png`; the packaged app icon is `src/assets/icon.icns`.

## recent_history.md
*(Agent Note: Check this file if present for specific user session context)*
