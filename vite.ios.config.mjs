// Web build for the iPad (Capacitor) app. Same React renderer as the
// Electron app, with src/ios/main.jsx standing in for Electron's main
// process + preload. Output goes to dist/ios (Capacitor's webDir), which is
// deliberately outside Electron Forge's out/ so it is never packaged.

import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  root: resolve('src/ios'),
  base: './',
  define: {
    __MAPS_KEY__: JSON.stringify(process.env.GOOGLE_MAPS_API_KEY || ''),
  },
  plugins: [react()],
  build: {
    outDir: resolve('dist/ios'),
    emptyOutDir: true,
    target: 'safari16',
  },
});
