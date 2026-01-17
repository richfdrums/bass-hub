# Bass Hub - Project Context for AI Agents

## Overview
**Bass Hub** is a specialized desktop application designed for bass fishing enthusiasts. It allows users to track their fishing gear inventory, plan and log fishing trips, and organize useful web resources. The application is built as a standalone local-first tool using Electron.

## Technology Stack
-   **Runtime**: Electron (Node.js + Chromium)
-   **Frontend**: React (via Vite), Plain CSS
-   **Database**: SQLite (`better-sqlite3`) - Local data storage
-   **Maps & Location**: Google Maps Platform (Maps JS, Places, Geocoding)
-   **Utilities**: `cheerio` & `axios` (Web scraping for product extraction)

## Architecture & patterns

### 1. Process Separation
-   **Main Process (`src/main.js`)**:
    -   Handles application lifecycle and window creation.
    -   Manages SQLite database connections (`src/db.js`).
    -   Executes "heavy" operations like web scraping for the Smart Extract feature.
    -   Secure settings management (encrypted API keys/store).
-   **Renderer Process (`src/renderer.jsx`)**:
    -   React-based UI.
    -   Communicates with Main via `window.fishingApi` (Context Bridge).
    -   **Critical**: Wraps the app in `<APIProvider>` for Google Maps, but *only* loads it once the API key is retrieved from the DB.

### 2. Data Persistence
-   Data is stored in a local SQLite file (`fishing.db`).
-   **Schema**:
    -   `gear`: Inventory items (Rods, Reels, Lures, etc.).
    -   `trips`: Fishing logs with location data (lat/lng).
    -   `quick_links`: Bookmarks for external sites.
    -   `settings`: App configuration (e.g., Google Maps API Key).

### 3. Key Features
-   **Smart Extract**: Users paste a product URL -> App scrapes OpenGraph metadata -> Auto-fills the Gear Form. Logic resides in `main.js`.
-   **Map Integration**:
    -   Trip pages display maps using `@vis.gl/react-google-maps`.
    -   Includes fallback UI ("Map not configured") if the user hasn't provided an API key.

## Directory Structure
-   `src/`
    -   `assets/`: Images and branding (Logo, App Icon).
    -   `components/`: Reusable React components.
        -   `GearCatalog.jsx`: Main inventory view; handles "Smart Extract" flows.
        -   `FishingTrips.jsx`: Management of past/future trips.
        -   `Settings.jsx`: UI for managing the Google Maps API key.
    -   `db.js`: Database initialization, schema definitions, and helper methods.
    -   `main.js`: IPC handlers and backend logic.
    -   `preload.js`: Defines the `window.fishingApi` bridge.
    -   `renderer.jsx`: App entry point; handles API key loading state.

## Development & Build
-   **Run Locally**: `npm start`
-   **Build Distributable**: `npm run make`
    -   Target: macOS (ARM64) `.app` / `.zip`.
    -   **Important**: Uses `vite-plugin-static-copy` to handle native modules (`better-sqlite3`) correctly during packaging.

## Common Tasks & Rules
-   **Adding IPC**: Add handler in `main.js`, expose in `preload.js` whitelist, consume in React components.
-   **Styling**: Use `index.css` for app-wide variables (colors, fonts). Maintain the dark/premium aesthetic.
-   **Icons**: The app uses a custom "Squircle" icon. Source is `src/assets/logo.png`.

## recent_history.md
*(Agent Note: Check this file if present for specific user session context)*
