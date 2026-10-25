// JS bindings for the app-local native plugins in ios/App/App/. Capacitor
// only auto-registers npm plugins, so these are registered by hand in
// AppBridgeViewController.swift.

import { registerPlugin } from '@capacitor/core';
import type { SqlValue } from '../../core/platform';
import type { PickSnapshotResult } from '../../shared/api';

export interface SqlitePlugin {
  /** Opens (creating if needed) a DB in Application Support; returns its path. */
  open(opts: { name: string }): Promise<{ path: string }>;
  exec(opts: { sql: string }): Promise<void>;
  run(opts: { sql: string; params: SqlValue[] }): Promise<{ changes: number; lastInsertRowid: number }>;
  all(opts: { sql: string; params: SqlValue[] }): Promise<{ rows: Record<string, unknown>[] }>;
}

export interface SnapshotPlugin {
  /** Closes the DB, copies it to a temp file, reopens. Returns the copy's path. */
  exportSnapshot(): Promise<{ path: string }>;
  /** Shows the document picker; validates the choice without replacing anything. */
  pick(): Promise<PickSnapshotResult>;
  /** Swaps in the file from the last successful `pick`. */
  replace(opts: { path: string }): Promise<void>;
}

export const Sqlite = registerPlugin<SqlitePlugin>('Sqlite');
export const Snapshot = registerPlugin<SnapshotPlugin>('Snapshot');
