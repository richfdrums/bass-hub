---
name: package-app
description: Build a packaged Bass Hub macOS app (.app) with `npm run package` and report where it landed. Use when the user asks to package, build, or get a new build of the app. Does not install it or make a distributable zip.
---

# Package Bass Hub

Builds `out/Bass Hub-darwin-arm64/Bass Hub.app` via Electron Forge. Packaging only — do not copy the app into `/Applications`, and do not run `npm run make` unless the user explicitly asks for a zip/distributable.

## Steps

1. **Check the checkout.** Run `git status --short --branch` and tell the user which branch/commit is being packaged. If there are uncommitted changes, mention that they will be included in the build.
2. **Make sure dependencies exist.** If `node_modules/` is missing (e.g. in a fresh worktree), run `npm install` first. `better-sqlite3` is a native module; Forge rebuilds it for Electron during packaging.
3. **Package.** Run `npm run package` from the repo root. It takes a minute or two — run it in the background (or with a long timeout) and wait for it to finish.
4. **Verify.** Confirm the command exited 0 and that `out/Bass Hub-darwin-arm64/Bass Hub.app` exists with a modification time from this run (`ls -ld`). If it failed, show the last ~25 lines of output and stop.
5. **Report.** Give the full path to the `.app`, the branch/commit it was built from, and remind the user:
   - Quit any running Bass Hub before replacing a copy in `/Applications`.
   - The packaged app uses the same `fishing_hub_v6.db` in Electron's userData dir, so existing data carries over.
   - The build is unsigned; on another Mac, right-click → Open the first time.

`out/` is gitignored and each run overwrites the previous build there. Leave other folders in `out/` alone.
