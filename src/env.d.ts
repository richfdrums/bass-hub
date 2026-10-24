// Editor support for the .jsx components: window.fishingApi is typed in
// src/shared/api.ts and implemented by each shell's preload/entry point.

import type { Api } from './shared/api';

declare global {
  interface Window {
    fishingApi: Api;
  }
}

export {};
