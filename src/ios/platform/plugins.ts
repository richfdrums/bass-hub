// JS bindings for the app-local native plugins in ios/App/App/. Capacitor
// only auto-registers npm plugins, so these are registered by hand in
// AppBridgeViewController.swift.

import { registerPlugin } from '@capacitor/core';
import type { SqlValue } from '../../core/platform';

export interface SqlitePlugin {
  /** Opens (creating if needed) a DB in Application Support; returns its path. */
  open(opts: { name: string }): Promise<{ path: string }>;
  exec(opts: { sql: string }): Promise<void>;
  run(opts: { sql: string; params: SqlValue[] }): Promise<{ changes: number; lastInsertRowid: number }>;
  all(opts: { sql: string; params: SqlValue[] }): Promise<{ rows: Record<string, unknown>[] }>;
}

export const Sqlite = registerPlugin<SqlitePlugin>('Sqlite');
