// Editor support for the .jsx components: window.fishingApi is typed in
// src/shared/api.ts and implemented by each shell (src/preload.ts for
// Electron, src/ios/main.tsx for the iPad).

import type { Api } from './shared/api';

declare global {
  interface Window {
    fishingApi: Api;
  }

  /** Google Maps key baked in at build time (vite.ios.config.mjs). */
  const __MAPS_KEY__: string;
  /** package.json version, injected at build time. */
  const __APP_VERSION__: string;
}

export {};
