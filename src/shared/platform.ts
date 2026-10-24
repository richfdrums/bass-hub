// Which shell are we running in? Set statically by each entry HTML file
// (<html data-platform="ios">), so it is available before first paint and
// needs no async setup.
//
// Use this for presentation and capability differences only. Anything that
// touches data belongs behind the Api seam in src/shared/api.ts.

export type PlatformName = 'desktop' | 'ios';

function readPlatform(): PlatformName {
  if (typeof document === 'undefined') return 'desktop';
  return document.documentElement.dataset.platform === 'ios' ? 'ios' : 'desktop';
}

export const PLATFORM: PlatformName = readPlatform();

export const IS_IOS = PLATFORM === 'ios';
