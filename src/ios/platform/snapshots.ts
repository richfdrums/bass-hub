// iPad implementation of SnapshotApi: native picker/share around the
// SnapshotPlugin, shaped like the rest of window.fishingApi.

import { Share } from '@capacitor/share';
import { Snapshot } from './plugins';
import type { FileResult, PickSnapshotResult, SnapshotApi } from '../../shared/api';

const describe = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

export const snapshots: SnapshotApi = {
  async exportSnapshot(): Promise<FileResult> {
    try {
      const { path } = await Snapshot.exportSnapshot();
      // Share sheet: iCloud Drive, AirDrop, Files — whatever the user picks.
      await Share.share({
        title: 'Bass Hub snapshot',
        url: `file://${path}`,
      });
      return { success: true, path };
    } catch (err) {
      return { success: false, error: describe(err) };
    }
  },

  async pickSnapshot(): Promise<PickSnapshotResult> {
    try {
      return await Snapshot.pick();
    } catch (err) {
      return { status: 'error', error: describe(err) };
    }
  },

  async applySnapshot(path: string): Promise<FileResult> {
    try {
      await Snapshot.replace({ path });
      return { success: true };
    } catch (err) {
      return { success: false, error: describe(err) };
    }
  },
};
