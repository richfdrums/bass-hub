# iPad Port Plan

**Status:** planning only. No code has been written. All product decisions are settled;
feasibility spikes remain **on hold** (see [Deferred spikes](#deferred-spikes)).

**Goal:** ship Bass Hub as an iPad app that shares the React UI and data layer with the
existing macOS Electron app, following the pattern already proven in
`~/Code/lakefront-search` (Capacitor 8 + Swift Package Manager + app-local Swift plugins
+ a platform-agnostic backend).

---

## Decisions

| # | Decision | Choice |
|---|---|---|
| 1 | iPad navigation | **Collapsible sidebar → icon rail** (same nav component as desktop, collapsed on iPad) |
| 2 | Images | **Remote-first**: scrape and store the TW image URL, no copy. Local override (camera/library) is **P2**. See [Phase 4](#phase-4--remote-images) |
| 3 | Data movement | **No sync engine.** Manual snapshot exchange only: iPad imports once, iPad can export a snapshot back to the Mac. **iPad is authoritative; desktop is read-only by convention.** See [Phase 6](#phase-6--data-movement-manual-snapshots) |
| 4 | Signing | Free Personal Team, **7-day reinstalls** accepted |
| 5 | TypeScript | Incremental — typed seams now, components later, see [TypeScript](#typescript) |
| 6 | Bundle ID / name | `com.richfredericks.basshub` / "Bass Hub" |
| 7 | Branching | `feat/ipad-capacitor` off `main`, Mac app kept green throughout |
| 8 | Spikes | **On hold** |

---

## Why this is bigger than the Lakefront port

Lakefront was already shaped for two shells: `src/core/` held every network and database
call, and the renderer only ever touched a typed `window.api`. Bass Hub has no such seam:

- `src/db.js:5` calls `app.getPath('userData')` and opens `better-sqlite3` **at import
  time**, synchronously.
- `src/main.js` holds all scraping, file I/O, and dialog work inline in 21 `ipcMain.handle`
  handlers (plus `getFilePath`, which uses `webUtils` rather than IPC — 22 API methods
  total).
- Gear photos are absolute filesystem paths rendered as `file://` URLs, which only works
  because the `BrowserWindow` sets `webSecurity: false`.

So roughly 540 lines of backend have to become platform-agnostic and asynchronous before
an iPad shell can reuse any of it. The photo pipeline gets *simpler* rather than harder:
scraped images become remote URLs, so nothing is downloaded or copied (Phase 4).

**Estimate: 7.5–10.5 focused working days**, of which ~2 are the UI/layout pass and ~1–2 are
on-device verification.

---

## What carries over unchanged

| Layer | Status |
|---|---|
| `src/components/*.jsx` (~2,400 lines) | Reusable; needs image-URL and responsive edits only |
| `src/index.css` (1,864 lines) | Reusable; needs the iPad layout pass (Phase 5) |
| All `window.fishingApi.*` call sites | Unchanged — the iPad assigns `window.fishingApi` in-process (22 methods today, 21 once `download-image` is deleted) |
| SQL schema, CRUD SQL, `gearColumns` whitelist | Unchanged except one added `image_url` column, and all async |
| Cheerio scraping selectors | Unchanged — Cheerio 1.1.2 ships a browser build (`dist/browser/index.js`) that Vite resolves automatically |
| Tide (NOAA) and weather (Open-Meteo) widgets | Unchanged — both are CORS-friendly and get routed through native HTTP anyway |

## What must be rebuilt

| Today | iPad reality | Work |
|---|---|---|
| `better-sqlite3`, sync, imports `electron` | System SQLite via native plugin | Port Lakefront's `SqlitePlugin.swift` + async `SqlDatabase` seam |
| `ipcMain.handle` × 21 + `preload.js` | No IPC — one JS process | Extract a `backend` object; desktop keeps IPC, iPad calls it directly |
| `axios` + `cheerio` in main | Renderer can't cross-origin fetch | Move scraper to shared code; `fetch` is patched by CapacitorHttp → native URLSession |
| `save-image` (native dialog + `fs.copyFileSync`) | No file paths from `<input type=file>` | **P2** — desktop keeps it as-is; iPad override comes later |
| `download-image` (`fs.createWriteStream`) | Not needed at all | **Deleted** — the scrape stores the remote image URL instead |
| `file://${image_path}` + `webSecurity:false` | Remote URLs render fine in WKWebView; local files don't | New `image_url` column + a `GearImage` component with placeholder fallback |
| `export-database` / `import-database` + `app.relaunch()` | No dialogs, no relaunch | **Manual snapshot exchange** — Phase 6 |
| `process.env.GOOGLE_MAPS_API_KEY` (dotenv) | No env at runtime | DB setting only |
| `-webkit-app-region: drag`, 260px sidebar, zero `@media` queries | Touch, safe areas, icon rail | Phase 5 |

---

## Target architecture

```
src/renderer.jsx + src/components/      ← unchanged UI, calls window.fishingApi only
        │
        ├─ desktop: src/preload.js ──IPC──▶ src/main.js (shell only: window, menus, dialogs)
        │                                       │
        └─ iPad:    src/ios/main.jsx ────────▶ src/core/backend.js
                                                 ├─ src/core/db.js       (async CRUD, SQL only)
                                                 ├─ src/core/extract.js  (fetch + cheerio)
                                                 ├─ src/core/imageUrl.ts (remote URL helpers)
                                                 └─ src/core/platform.js (the seams)
                                                        │
                              ┌─────────────────────────┴─────────────────────────┐
                     src/main/platform/*                              src/ios/platform/*
                     (better-sqlite3)                                 (SqlitePlugin)
```

`src/core/` must not import `electron`, Node built-ins, or Capacitor. That rule is what
makes the same code run in both shells — enforce it with two tsconfigs (node + web) that
both include `src/core/`, exactly as Lakefront does.

### Platform seams

Keep it to **two**, with a third only if P2 overrides or the Phase 6 snapshot exchange need one:

1. **`SqlDatabase`** — `exec / run / all / get / transaction`, async, positional `?`
   params. Copy Lakefront's implementation: iOS SQLite bindings are async and not all
   support named params, and `transaction()` must be serialized because SQLite can't nest.
2. **`Http`** — implicit. Call global `fetch` everywhere: it's Node's in Electron main and
   is patched to URLSession by CapacitorHttp on iPad, so neither needs CORS workarounds.

Deferred until needed:

3. **`FileStore`** — only for P2 image overrides (`writeImage`, `convertFileSrc`) or the
   Phase 6 snapshot exchange. Removing the download pipeline means v1 needs neither.

### File-level change map

| File | Change |
|---|---|
| `src/core/platform.ts` | **new** — seams + platform registry |
| `src/core/db.ts` | **new** — async port of `src/db.js` (schema, migrations, CRUD); adds the `image_url` column + `gearColumns` entry |
| `src/core/backend.ts` | **new** — the 21-method API object (`download-image` is gone) |
| `src/core/extract.ts` | **new** — `extract-gear-details` + `fetch-page-title`; returns the image URL, downloads nothing |
| `src/core/imageUrl.ts` | **new** — URL normalization + `withWidth(url, nw)` for the TW resize endpoint |
| `src/core/snapshot.ts` | **new** — snapshot validation (`integrity_check`, `user_version`) + rolling local backups |
| `src/shared/api.ts` | **new** — the `window.fishingApi` type (single source of truth) |
| `src/db.ts` → `src/main/platform/electronDb.ts` | better-sqlite3 adapter implementing `SqlDatabase` |
| `src/main.js` | keep window/lifecycle; each handler becomes `backend.method(...)` |
| `src/preload.js` | unchanged surface, typed against `shared/api.ts` |
| `src/ios/index.html`, `src/ios/main.jsx` | **new** — Capacitor entry (`viewport-fit=cover`) |
| `src/ios/platform/*.ts` | **new** — `iosDb.ts`, `plugins.ts` |
| `vite.ios.config.ts` | **new** — root `src/ios`, `base: './'`, `target: 'safari16'`, outDir `dist/ios` |
| `capacitor.config.json` | **new** — appId, `webDir: "dist/ios"`, `CapacitorHttp: { enabled: true }` |
| `forge.config.js` | add `packagerConfig.ignore` for `dist/ios/**`, `ios/**`, `capacitor.config.json` |
| `ios/App/App/SqlitePlugin.swift` | **new** — ported from Lakefront, plus `close()` / `reopen()` for snapshot import |
| `ios/App/App/AppBridgeViewController.swift` | **new** — registers app-local plugins |
| `src/components/GearImage.jsx` | **new** — override → remote → placeholder, `onError`, lazy, fixed aspect ratio |
| `src/components/GearCatalog.jsx:42,384`, `GearCard.jsx:16`, `GearForm.jsx:92` | `file://` → `<GearImage>` |
| `src/components/Sidebar.jsx` | collapse toggle, `aria-label`/`title` on nav items, collapsed state |
| `src/index.css` | Phase 5 layout work (rail width, safe areas, touch targets) |
| `src/renderer.jsx:99` | hide `.titlebar-drag-region` on iPad |

---

## Phases

### Phase 1 — Shared core

- [ ] `src/core/platform.ts` with the `SqlDatabase` seam + platform registry
- [ ] `src/core/db.ts`: schema `CREATE TABLE IF NOT EXISTS` + the `ALTER TABLE` migrations
      (currently `src/db.js:76–108`) run inside an async `init()`; add `image_url`
- [ ] `src/main/platform/electronDb.ts` wraps `better-sqlite3`
- [ ] `src/core/backend.ts` implements all 21 methods (`saveImage` stays desktop-only)
- [ ] `PRAGMA user_version = 1` set after migrations; opening a newer version is refused
- [ ] Rolling local backups: on launch, snapshot the DB into `backups/`, keep the last 5
      (invisible; no UI)
- [ ] `src/main.js` reduced to shell duties + one-line IPC handlers
- [ ] `src/renderer.jsx` reuses its existing `isLoading` gate to wait for `init()`

**Risk:** an un-awaited call surfaces as `[object Promise]` in the UI. Mitigate with the
TypeScript seams (below) and by clicking through all five views on desktop.

### Phase 2 — Scraper + network in shared code

- [ ] `src/core/extract.ts`: plain `fetch`, same headers, Cheerio **browser** build
- [ ] Port the brand list and the category cascade **literally** — it is the most brittle
      code in the app and nothing about it should change in this pass
- [ ] `fetch-page-title` moves alongside it
- [ ] The scrape returns `extracted_image_url` and nothing else — no download step
- [ ] Confirm Cheerio bundles for the web target (`cheerio/slim` or a Vite alias if its
      transitive deps misbehave)

### Phase 3 — Capacitor scaffold

- [ ] `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli` (8.5.x). `@capacitor/filesystem`
      and `@capacitor/share` are needed for Phase 6; `@capacitor/camera` only for P2
- [ ] `capacitor.config.json`, `vite.ios.config.ts`, `src/ios/index.html`, `src/ios/main.jsx`
- [ ] `npx cap add ios`; copy `SqlitePlugin.swift` + `AppBridgeViewController.swift`;
      register both in `project.pbxproj` (Capacitor only auto-registers npm plugins)
- [ ] `npm run build:ios` → `vite build -c vite.ios.config.ts && cap sync ios`
- [ ] Forge ignore rules so `dist/ios` and `ios/` never land in the Mac asar

### Phase 4 — Remote images

> **Settled.** Scraped images are referenced in place; nothing is downloaded or copied.
> Local overrides (camera / photo library) are **P2**.

**Verified live (2026-10-24)** — TW's image CDN serves to any referrer:

| Check | Result |
|---|---|
| Image host | `img.tacklewarehouse.com`, via a resize endpoint: `/watermark/rs.php?path=BCH-BONE-1.jpg&nw=455` |
| No referer / `capacitor://localhost` / `file://` / TW referer | `200 image/jpeg` in all four cases |
| Cookies or auth | None required |
| `nw=455` vs `nw=900` | 7 KB vs 18 KB |
| Bad path | `404 text/html` → `onError` fires cleanly |
| `img.main_image` still matches | Yes, and its `src` is already absolute |

- [ ] Add `gear.image_url TEXT`; **keep** `image_path` for user overrides. Add both to the
      `gearColumns` whitelist (the documented footgun in `AGENTS.md`)
- [ ] Resolution order, in one place: `image_path` (override) → `image_url` (remote) →
      placeholder. Existing rows keep their downloaded files and still render on desktop
      (the only place `file://` survives); the iPad only ever sees `image_url` or the
      placeholder until P2
- [ ] `GearImage.jsx`: inline SVG placeholder (theme-aware via `currentColor`), `onError` →
      placeholder (and reset state when `src` changes, or a recycled `<img>` sticks),
      `loading="lazy"`, fixed aspect-ratio box, `referrerPolicy="no-referrer"`
- [ ] `withWidth(url, nw)` in `core/imageUrl.ts`: cards request `nw=455`, the detail and
      lightbox views ~`nw=900`; leave non-TW URLs untouched
- [ ] `processUrl` stores `extracted_image_url` into `image_url`; delete the `downloadImage`
      call and the `download-image` handler (`main.js:197–224`)
- [ ] Capability flag (`canPickImages`) so the upload zone doesn't render on iPad until P2

**Tradeoff:** the catalog is no longer usable offline — images show placeholders instead.
Accepted for now; revisit with a "cache on view" pass only if it bothers you in practice.

**P2 — local override:** camera (`@capacitor/camera`, `CameraSource.Prompt` = camera or
library) or photo picker writes a file and sets `image_path`, which wins over `image_url`.
Needs `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription`, the `FileStore` seam,
and `convertFileSrc` (unproven here, but out of the v1 critical path).

### Phase 5 — iPad layout & touch

- [ ] **Collapsible sidebar → icon rail.** `Sidebar.jsx` gets a collapse toggle in
      `.sidebar-header`; a `.sidebar.collapsed` class drives `width: 260px` → ~72pt
      (`index.css:45`). Hide the `.label` span (it exists in the markup but has no CSS
      rule today, so this is one line), center `.nav-icon`, and add `title` + `aria-label`
      to each `.nav-item` because the labels disappear. Persist the choice in
      `localStorage` (works in both shells) rather than the async `settings` table.
- [ ] Auto-collapse below ~900pt via a media query, with a manual toggle overriding it
- [ ] Verify `.nav-item` (12px/16px padding) still yields a ≥44pt touch target in the
      rail, and that the footer Settings button matches
- [ ] `.sidebar-header` is both the drag handle and the logo + "Bass Hub" wordmark
      (`index.css:52`). On iPad it needs `env(safe-area-inset-top)` and the wordmark must
      hide when collapsed; decide what the rail shows instead
- [ ] Hide `.titlebar-drag-region` (`index.css:1374`) on iPad — it is 48px tall,
      `z-index: 9999`, `pointer-events: auto`, and would swallow taps across the top edge
- [ ] `viewport-fit=cover` + `env(safe-area-inset-*)` on the main scroll area; `100dvh`
      instead of `100vh`; `overscroll-behavior: none`; disable double-tap zoom and
      long-press callout
- [ ] Form inputs need `font-size: 16px` minimum or iOS zooms on focus
- [ ] Replace `alert()` / `confirm()` (11 call sites) with the existing `Modal` at least
      for destructive actions
- [ ] Touch equivalents for hover-only affordances
- [ ] `UIRequiresFullScreen = true` for v1, which sidesteps split-view widths down to
      ~320pt; revisit if multitasking is wanted

### Phase 6 — Data movement (manual snapshots)

> **Decided.** No sync engine, no app-owned iCloud container, and no live database in a
> synced folder. The folder is where snapshots *travel*, not where the database lives.
> **The iPad is authoritative; the desktop is read-only by convention** (a convention, not
> something enforced in code). If data ever needs to go back to the Mac, it goes through the
> same snapshot exchange.

**Why not a live DB in iCloud Drive:** SQLite needs POSIX advisory locks and atomic
renames, which file providers don't guarantee; iCloud can evict files to dataless
placeholders; and two writers produce a "conflicted copy," not a merge. On top of that,
iCloud containers are a paid-account capability, so with free signing a user-picked
location is the only option anyway. **Why not CloudKit:** weeks of work, schema churn, and
it needs the paid account — wrong trade for one user and two devices.

**Shape:** each app keeps its own DB in its own container. Moving data means copying a
complete, closed file in or out — never opening one in place.

- [ ] **iPad import:** document picker (`Filesystem.pickFiles()`, or a small
      `UIDocumentPickerViewController` plugin if that's awkward) → copy to a temp file →
      validate (`PRAGMA integrity_check` + `user_version`) → close the live handle →
      replace → reopen → reload the webview
- [ ] **iPad export:** copy the container DB to a temp file → Share sheet
      (`@capacitor/share`) → iCloud Drive / AirDrop / Files
- [ ] **Confirm before overwrite**, using the app's `Modal`, naming the incoming contents
      ("214 gear items, 12 trips, 38 links") and what they replace
- [ ] **First-run prompt** when the DB is empty: "Bring your data over from your Mac?"
- [ ] **Settings → Data** card: "Export snapshot" / "Import snapshot" + last-import date.
      Deliberately the only data-movement UI in the app.
- [ ] **Desktop:** keep both existing handlers so the iPad can push a snapshot back. Fix
      the import to close the DB before copying (today it copies over an open handle and
      relaunches)

**Migration path:** Desktop Settings → Export → save into iCloud Drive → iPad Settings →
Import snapshot → pick that file. To refresh the Mac later, reverse it: iPad → Export
snapshot → import on the Mac.

**Known limitation, accepted:** this is whole-file replacement, not a merge. Because the
desktop is read-only by convention, divergence is unlikely — but anything entered on the
Mac after an import is lost on the next one. That's the price of no sync engine, and it's
the right trade for a single-user app used 99% on the iPad.

**Deferred:** a remembered "sync folder" (security-scoped bookmark) and any automatic pull.
Only worth building if manual sharing proves tedious in practice.

**Note for P2:** local image overrides live in the app container and do **not** travel with
a snapshot. Keeping them out of the synced path is what preserves the portable-DB property
from Phase 4.

### Phase 7 — Icon, signing, install

- [ ] 1024² opaque PNG from `src/assets/logo.png` (the Mac icon is an `.icns` with
      transparent corners, which iOS rejects); script for AppIcon + LaunchScreen
- [ ] `UIDeviceFamily = [2]` (iPad only), min iOS 16, all four orientations,
      light status bar content
- [ ] Free Personal Team signing (`DEVELOPMENT_TEAM`) → 7-day installs; add the reinstall
      steps to `README.md` (reuse Lakefront's wording)
- [ ] First install from Xcode: `npx cap open ios`, pick the iPad, ⌘R

### Phase 8 — Verification

- [ ] `src/ios/smokeTest.js` behind `VITE_SMOKE_TEST=1`, exercising every
      `window.fishingApi` method, plus an export → validate → import round trip, and logging
      `[smoke] PASS/FAIL`; read with `xcrun simctl launch --console-pty` (or
      `xcrun devicectl device process launch --console` on device)
- [ ] Real-device pass for what a simulator can't prove: Maps embeds, Tackle Warehouse
      scraping, remote image loading + placeholders, keyboard behavior

---

## TypeScript

**Recommendation: incremental — typed seams now, components later.** Not a blocker for the
port, and not a full migration up front.

Rationale:

- The port's genuine bug risk is concentrated at the seams: 21 methods going async, two
  platform adapters, an image-URL contract. Types catch exactly those mistakes.
- Converting ~2,400 lines of components first would be 2–4 days with zero user-visible
  benefit and no test suite to catch regressions.
- Vite 5 transpiles `.ts`/`.tsx` natively, so the only additions are `typescript`,
  `@types/react`, and two tsconfigs — no build changes.

Concretely:

1. Phase 1 writes `src/core/**`, `src/shared/api.ts`, `src/ios/**`, and
   `src/main/platform/**` as `.ts`/`.tsx`.
2. `tsconfig.json` with `allowJs: true`, `checkJs: false`, plus `tsconfig.node.json` and
   `tsconfig.web.json` that both include `src/core/` (that's what enforces "no
   `electron`/Node/Capacitor imports in core").
3. `src/env.d.ts` declares `window.fishingApi: Api`, so `.jsx` components get autocomplete
   and typo-checking in the editor even while unchecked.
4. Convert components to `.tsx` opportunistically — most naturally during Phase 5, since
   the layout pass touches every one of them anyway.
5. `npm run typecheck` becomes the one automated gate, as in Lakefront.

If you'd rather have full TS before starting, that's defensible, but I'd schedule it as
its own branch/PR before `feat/ipad-capacitor`, not interleaved with the port.

---

## Risks

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Maps key referrer restrictions** | Mac keys are usually locked to `file://`/localhost; the iPad origin is `capacitor://localhost`, so the Embed API iframes (`FishingTrips.jsx:30`, `TripForm.jsx:47`) may be rejected | Add a `capacitor://localhost` referrer rule (or an unrestricted key) in Cloud Console; verify before Phase 5 |
| **Tackle Warehouse from WKWebView** | The scrape moves from Chromium to URLSession: different TLS fingerprint and UA handling | Manual fetch on device early in Phase 2; keep the desktop path as fallback |
| **Cheerio in the web bundle** | Node-flavoured transitive deps can break a Vite build | Build `vite.ios.config.ts` with just the scraper before the rest |
| **Remote images offline** | The catalog loses its images with no network — a regression from today's local copies | Accepted; placeholder is graceful. "Cache on view" only if it annoys you in practice |
| **TW adds hotlink protection** | Images would break for every scraped item at once | Verified open today; placeholder + the existing "Open product page" link is the fallback |
| **Snapshot import overwrites everything** | Whole-file replacement, no merge; anything entered on the Mac since the last exchange is lost | Desktop is read-only by convention; the confirm dialog names exactly what is being replaced |
| **Schema skew on import** | An older build opening a newer DB would misread it | `PRAGMA user_version` guard in Phase 1; validate before replacing |
| **Async DB conversion breadth** | 21 handlers, mechanical but wide | One atomic commit for Phase 1; click through all views |
| **Forge packaging** | `dist/ios` and `ios/` would bloat or break the Mac asar | `packagerConfig.ignore` in Phase 3 |
| **Existing rows with local images** | Old absolute paths keep working on the Mac, but would not resolve if a DB were moved to the iPad | Left alone deliberately; the portable-DB note in Phase 6 is the reason it matters |

---

## Testing

There is no test suite, linter, or typecheck today (`npm run lint` is an `echo`). The
smoke test in Phase 8 is the primary verification path, backed by a manual pass on the
simulator and then a real iPad. Desktop verification stays as it is now: `npm start` and
exercise the affected view.

---

## Deferred spikes

Both are on hold per your instruction:

1. Google Maps Embed API iframe inside WKWebView, with the existing key.
2. A Tackle Warehouse product page fetched from WKWebView through CapacitorHttp.

Not a spike: the image hotlinking question was answered directly (Phase 4) — TW's CDN
serves to `capacitor://localhost` and `file://` referrers with no cookies.

---

## Open questions

- Should the rail auto-collapse in portrait only, or stay wherever the user last put it?
  (Proposal: auto-collapse under ~900pt, manual toggle wins until the next rotation.)
- What does the collapsed `.sidebar-header` show — just the toggle, or a small mark?
- Is split-view multitasking wanted later? (`UIRequiresFullScreen` is the v1 shortcut.)

---

## Effort summary

| Phase | Estimate |
|---|---|
| 1 — Shared core | 1–1.5 d |
| 2 — Scraper + network | 1–1.5 d |
| 3 — Capacitor scaffold | 1 d |
| 4 — Remote images | 0.5 d |
| 5 — Layout & touch | 1.5–2 d |
| 6 — Data movement (snapshots) | 1–1.5 d |
| 7 — Icon, signing, install | 0.5 d |
| 8 — Verification | 1–2 d |
| **Total** | **7.5–10.5 d** |
