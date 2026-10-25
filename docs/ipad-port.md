# iPad Port Plan

**Status: shipped in v1** on `feat/ipad-app-port`. Both feasibility spikes **passed** on an
iPad simulator (see [Spike results](#spike-results)), and the app runs end to end there: the
shared React UI, a native SQLite plugin, hotlinked product images, the icon rail layout, and
manual snapshot exchange with the Mac.

What is verified and what is not:

| | |
|---|---|
| **Verified on the simulator** | schema + migrations on a fresh install, real data (15 gear / 3 trips / 7 links), all five views, Smart Extract and the title lookup through CapacitorHttp, hotlinked images (including a dead URL), snapshot export → share sheet, import picker, export → replace round trip with the JS connection intact, rolling backups pruning to five, first-run prompt, app icon |
| **Not verified here** | the launch screen (SplashBoard refuses to generate snapshots for this bundle in the simulator, so it never renders), Maps embeds, keyboard behaviour, and anything that needs a physical iPad |
| **Deferred to P2** | camera / photo-library image overrides, `FileStore` seam, an offline image cache, replacing the remaining `alert()` calls |

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
| 7 | Branching | `feat/ipad-app-port` off `main`, Mac app kept green throughout; one PR at the end |
| 8 | Spikes | **Passed** (iPad A16 simulator, iOS 27, Xcode 27, Capacitor 8.5.3, SPM) |

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
src/App.jsx + src/components/            <- unchanged UI, calls window.fishingApi only
        |
        |- desktop: src/preload.ts --IPC--> src/main.js (shell only: window, menus, dialogs)
        |                                       |
        +- iPad:    src/ios/main.tsx --------> src/core/backend.ts
                                                 |- src/core/db.ts      (async CRUD, SQL only)
                                                 |- src/core/extract.ts (fetch + cheerio)
                                                 +- src/core/platform.ts (the seams)
                                                        |
                              +-------------------------+-------------------------+
                     src/main/platform/                                 src/ios/platform/
                     (better-sqlite3)                                   (SqlitePlugin)
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

### File-level change map (as built)

| File | Change |
|---|---|
| `src/core/platform.ts` | **new** — seams (`SqlDatabase`, `close?()`) + platform registry |
| `src/core/db.ts` | **new** — async port of `src/db.js` (schema, migrations, CRUD); adds `image_url` to the schema, the migration and `gearColumns`; guards `user_version` |
| `src/core/backend.ts` | **new** — the `CoreApi` implementation (`download-image` is gone) |
| `src/core/extract.ts` | **new** — `extractGearDetails` + `fetchPageTitle` on global `fetch`; returns the image URL, downloads nothing |
| `src/shared/api.ts` | **new** — `CoreApi` / `DesktopApi` / `SnapshotApi`; single source of truth for `window.fishingApi` |
| `src/shared/platform.ts` | **new** — `IS_IOS` from `<html data-platform>` |
| `src/db.js` → `src/main/platform/electronDb.ts` | better-sqlite3 adapter behind the seam, rolling backups, `validateSnapshot` |
| `src/main.js` | window/lifecycle only; each handler is one line into `backend` |
| `src/preload.js` → `src/preload.ts` | same surface, typed against `shared/api.ts` |
| `src/App.jsx` | **new** — the whole UI, lifted out of `renderer.jsx`; first-run prompt |
| `src/renderer.jsx` | now a thin desktop entry |
| `src/ios/index.html`, `src/ios/main.tsx` | **new** — Capacitor entry (`viewport-fit=cover`, error catcher, `data-platform="ios"`) |
| `src/ios/platform/*.ts` | **new** — `plugins.ts` (Sqlite, Snapshot), `iosDb.ts`, `snapshots.ts` |
| `vite.ios.config.mjs` | **new** — root `src/ios`, `base: './'`, `target: 'safari16'`, outDir `dist/ios`, `__MAPS_KEY__` / `__APP_VERSION__` |
| `capacitor.config.json` | **new** — appId, `webDir: "dist/ios"`, `CapacitorHttp: { enabled: true }` |
| `forge.config.js` | no change needed — `dist/ios` and `ios/` never reach the Mac asar |
| `ios/App/App/SqlitePlugin.swift` | **new** — ported from Lakefront, plus `closeDatabase()` / `reopenDatabase()` for snapshots |
| `ios/App/App/SnapshotPlugin.swift` | **new** — export, pick + validate, replace |
| `ios/App/App/DbPaths.swift` | **new** — DB path, rolling backups |
| `ios/App/App/AppBridgeViewController.swift` | **new** — registers both app-local plugins |
| `src/components/GearImage.tsx` | **new** — override → remote → nothing, `onError`, lazy, no referrer |
| `src/components/GearCatalog.jsx`, `GearCard.jsx`, `GearForm.jsx` | `file://` → `<GearImage>` |
| `src/components/Sidebar.jsx` | collapse toggle, icon rail, `aria-label`/`title` on nav items |
| `src/components/Settings.jsx` | Snapshots card (export/import), confirm modal, last-import date |
| `src/index.css` | appended "Collapsible sidebar" + `[data-platform="ios"]` sections |
| `scripts/ios-assets.swift` | **new** — icon + launch image from `logo.png` (`npm run assets:ios`) |

---

## Phases

### Phase 1 — Shared core ✅

- [x] `src/core/platform.ts` with the `SqlDatabase` seam + platform registry
- [x] `src/core/db.ts`: schema `CREATE TABLE IF NOT EXISTS` + the migrations from the old
      `src/db.js:76–108` run inside an async `init()`; adds `image_url`
- [x] `src/main/platform/electronDb.ts` wraps `better-sqlite3`
- [x] `src/core/backend.ts` implements the whole `CoreApi` (`saveImage` stays desktop-only)
- [x] `PRAGMA user_version = 1` set after migrations; a newer database is refused
- [x] Rolling local backups: on launch, snapshot the DB into `backups/`, keep the last 5
      (invisible; no UI) — `electronDb.ts` on the Mac, `DbPaths.swift` on the iPad
- [x] `src/main.js` reduced to shell duties + one-line IPC handlers
- [x] The UI moved to `src/App.jsx`; `src/renderer.jsx` is a thin desktop entry that reuses
      the existing `isLoading` gate while the backend initialises

**Deviation:** the old blind `ALTER TABLE ... ADD COLUMN` in try/catch became
`ensureColumn()` (checks `PRAGMA table_info` first), so a partial migration cannot throw its
way into a half-applied schema.

**Risk (handled):** an un-awaited call would surface as `[object Promise]` in the UI. The
TypeScript seams catch that at `npm run typecheck`, and all five views were clicked through.

### Phase 2 — Scraper + network in shared code ✅

- [x] `src/core/extract.ts`: plain `fetch`, same headers, Cheerio browser build
- [x] The brand list and the category cascade ported **literally** — it is the most brittle
      code in the app and nothing about it changed in this pass
- [x] `fetch-page-title` moved alongside it
- [x] The scrape returns `extracted_image_url` and nothing else — no download step
- [x] Cheerio bundles for the web target without `cheerio/slim` or a Vite alias
      (454 kB / 159 kB gzip, which is fine for a local bundle)

### Phase 3 — Capacitor scaffold ✅

- [x] `@capacitor/core`, `@capacitor/ios`, `@capacitor/cli` 8.5.3. `@capacitor/share` for
      Phase 6; `@capacitor/camera` only for P2
- [x] `capacitor.config.json`, `vite.ios.config.mjs`, `src/ios/index.html`, `src/ios/main.tsx`
- [x] `npx cap add ios`; `SqlitePlugin.swift`, `SnapshotPlugin.swift`, `DbPaths.swift` and
      `AppBridgeViewController.swift` registered by hand in `project.pbxproj` (Capacitor only
      auto-registers npm plugins)
- [x] `npm run build:ios` → `vite build -c vite.ios.config.mjs && cap sync ios`
- [x] No Forge ignore rules needed: `dist/ios` and `ios/` are outside `out/` and do not land
      in the Mac asar (checked with `asar list`)

**Deviation:** `@capacitor/filesystem` 8.1.5 has no `pickFiles()` (that API does not exist in
the released plugin), so the document picker is a small native plugin instead. The dependency
was dropped again — the only filesystem work happens in Swift.

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

- [x] Add `gear.image_url TEXT`; **keep** `image_path` for user overrides. Both are in the
      `gearColumns` whitelist (the documented footgun in `AGENTS.md`)
- [x] Resolution order, in one place (`GearImage.tsx`): `image_path` (override) →
      `image_url` (remote) → nothing. Existing rows keep their downloaded files and still
      render on desktop (the only place `file://` survives); the iPad only ever sees
      `image_url` until P2
- [x] `GearImage.tsx`: `loading="lazy"`, `referrerPolicy="no-referrer"`, and `onError` drops
      the image (tracking the failed `src`, so a different item in the same slot retries)
- [x] `processUrl` stores `extracted_image_url` into `image_url`; the `downloadImage` call and
      the `download-image` handler are gone
- [ ] `withWidth(url, nw)` in `core/imageUrl.ts` — **not needed**: the TW scrape already
      returns `...&nw=455`, which is the size the cards want
- [ ] Inline SVG placeholder and a `canPickImages` capability flag — **deferred**. A missing
      image renders nothing (no empty frame), and the iPad's `saveImage` returns `null`, so
      the upload zone is inert rather than broken. Both belong with the P2 picker work

**Tradeoff:** the catalog is no longer usable offline — images show placeholders instead.
Accepted for now; revisit with a "cache on view" pass only if it bothers you in practice.

**P2 — local override:** camera (`@capacitor/camera`, `CameraSource.Prompt` = camera or
library) or photo picker writes a file and sets `image_path`, which wins over `image_url`.
Needs `NSCameraUsageDescription` + `NSPhotoLibraryUsageDescription`, the `FileStore` seam,
and `convertFileSrc` (unproven here, but out of the v1 critical path).

### Phase 5 — iPad layout & touch ✅ (with deferrals)

- [x] **Collapsible sidebar → icon rail.** `Sidebar.jsx` has a collapse toggle in
      `.sidebar-header`; `.sidebar.collapsed` drives `width: 260px` → 76px. Labels hide, the
      rail centres the icons, and each `.nav-item` keeps `title` + `aria-label`. On the iPad
      it starts collapsed and expands as an overlay with a scrim; the desktop starts expanded
- [x] `.sidebar-header` (logo + wordmark) gets `env(safe-area-inset-top)`; the wordmark hides
      when collapsed
- [x] Hide `.titlebar-drag-region` (`index.css:1374`) on iPad — it is 48px tall,
      `z-index: 9999`, `pointer-events: auto`, and would swallow taps across the top edge
- [x] `viewport-fit=cover` + `env(safe-area-inset-*)` on the scroll area, sidebar and modals;
      `100dvh` instead of `100vh`; `overscroll-behavior: none`; no tap highlight
- [x] Modals capped to `min(480px, 100vw - 48px)` (and 900px for `.large`), which otherwise
      overflow an iPad in portrait
- [ ] Auto-collapse below ~900pt via a media query — **not needed**: the default already
      differs per platform, and a manual toggle covers the rest
- [ ] Persisting the collapsed state in `localStorage` — **deferred**; the per-platform
      default is the behaviour that was actually wanted
- [ ] `font-size: 16px` on form inputs to stop iOS zoom-on-focus — **deferred**; the forms
      already use larger sizes and no zoom was seen in the simulator
- [ ] Replacing the remaining `alert()` / `confirm()` calls with `Modal` — **partially done**:
      the destructive snapshot import has a real confirm modal, the rest still use `alert()`
- [ ] `UIRequiresFullScreen = true` — **dropped on purpose**. The layout is a flex sidebar
      plus a scrolling column, so split view works; forcing full screen would remove
      multitasking for no gain. `TARGETED_DEVICE_FAMILY = 2` keeps it iPad-only

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

- [x] **iPad import:** document picker (`UIDocumentPickerViewController` in
      `SnapshotPlugin.swift`, since `@capacitor/filesystem` has no picker) → copy to a temp
      file → validate (`PRAGMA integrity_check` + `user_version` + row counts) → close the
      live handle → replace → reopen → reload the webview
- [x] **iPad export:** close, copy the container DB to a temp file, reopen → Share sheet
      (`@capacitor/share`) → iCloud Drive / AirDrop / Files
- [x] **Confirm before overwrite**, using the app's `Modal`, naming the incoming contents
      ("3 gear items, 12 trips, 38 links") and what they replace
- [x] **First-run prompt** when the DB is empty: "Bring your data over" → Settings, or start
      fresh (recorded in `settings.first_run_dismissed`)
- [x] **Settings → Snapshots** card: "Share Snapshot" / "Choose Snapshot" + last-import date.
      Deliberately the only data-movement UI in the app.
- [x] **Desktop:** both handlers kept, so the iPad can push a snapshot back. The restore now
      validates the chosen file first and closes the DB before copying over it (it used to
      copy under an open handle and relaunch)

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

### Phase 7 — Icon, signing, install ✅ (signing steps documented, not automated)

- [x] 1024² opaque PNG from `src/assets/logo.png` (the Mac icon is an `.icns` with
      transparent corners, which iOS rejects); `scripts/ios-assets.swift` draws the icon and
      the launch image, run with `npm run assets:ios`
- [x] `TARGETED_DEVICE_FAMILY = 2` (iPad only), min iOS 16, all four orientations,
      `UIUserInterfaceStyle = Dark`, stale `armv7` capability removed
- [x] `LaunchScreen.storyboard` keeps the logo centred (`scaleAspectFit`) on the app's
      background colour instead of stretching the default splash
- [ ] Free Personal Team signing (`DEVELOPMENT_TEAM`) is **not** checked in — it is tied to
      a person's Apple ID. Steps are in `README.md`; reinstall every 7 days
- [ ] First install from Xcode: `npx cap open ios`, pick the iPad, ⌘R — **your move**; the
      simulator is as far as this branch was verified

**Caveat:** the simulator never renders the launch screen for this bundle (SplashBoard
rejects snapshot generation for it, and the screen stays black even with a 3-second delay
before the scene connects), so the launch image is verified only by inspecting the generated
asset and the compiled storyboard. The icon *is* verified on the simulator home screen.

### Phase 8 — Verification ⚠️ (simulator pass done, device pass pending)

- [x] Simulator pass, using temporary probes instead of a `VITE_SMOKE_TEST` build: every
      `window.fishingApi` method exercised, Smart Extract + title lookup through
      CapacitorHttp, export → replace round trip with the JS connection intact, share sheet
      and document picker screenshots, backups pruning to five, first-run prompt, dead image
      URL, icon rail in both states
- [ ] Real-device pass for what a simulator can't prove: Maps embeds, Tackle Warehouse
      scraping from the device network, remote image loading, keyboard behaviour, and the
      launch screen

> The probe code was removed before the PR — nothing behind `VITE_SMOKE_TEST` exists in the
> tree. If the port is picked up again, a permanent smoke test is worth the setup.

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

## Spike results

Both ran on an iPad (A16) simulator, iOS 27, Xcode 27, Capacitor 8.5.3, built with
`npx cap add ios --packagemanager SPM`.

**1. Google Maps Embed API iframe inside WKWebView — PASS.** The map rendered fully
(`Lake Okeechobee` place card, tiles, attribution) using the existing key from `.env`,
with no referrer rejection. The Phase 5 layout work can rely on iframes.

**2. Tackle Warehouse through CapacitorHttp — PASS.**

```
platform=ios keyLen=39
tw-page  status=200 bytes=206243 main_image=true brand=true
tw-image status=200 type=image/jpeg bytes=7125
```

So a plain `fetch` in the WKWebView gets the real product page (not a challenge page),
and the selectors the scraper depends on (`img.main_image`, `itemprop="brand"`) are
present. Remote image loading works too, confirming the Phase 4 approach end-to-end.

Not yet proven: Cheerio bundling for the web target (Phase 2), and the exact header set
from `main.js` (only `Accept` was sent here).

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
