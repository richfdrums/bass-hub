// The platform-agnostic API surface. Electron's preload forwards these over
// IPC; the iPad calls them directly in-process. Both shells share this, so a
// change here is automatically available on both.

import type { CoreApi } from '../shared/api';
import { setPlatform, type Platform } from './platform';
import { gear, initSchema, links, settings, trips } from './db';
import { extractGearDetails, extractGearImage, fetchPageTitle } from './extract';

export async function initBackend(platformConfig: Platform): Promise<void> {
  setPlatform(platformConfig);
  await initSchema();
}

export const backend: CoreApi = {
  getGear: () => gear.list(),
  addGear: (item) => gear.add(item),
  updateGear: (id, item) => gear.update(id, item),
  deleteGear: (id) => gear.remove(id),

  getTrips: () => trips.list(),
  addTrip: (trip) => trips.add(trip),
  updateTrip: (id, trip) => trips.update(id, trip),
  deleteTrip: (id) => trips.remove(id),

  getLinks: () => links.list(),
  addLink: (link) => links.add(link),
  updateLink: (id, link) => links.update(id, link),
  deleteLink: (id) => links.remove(id),

  getSetting: (key) => settings.get(key),
  updateSetting: (key, value) => settings.set(key, value),

  extractGearDetails: (url) => extractGearDetails(url),
  refreshGearImage: (url) => extractGearImage(url),
  fetchPageTitle: (url) => fetchPageTitle(url),
};
