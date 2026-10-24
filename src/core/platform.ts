// The seams between the platform-agnostic backend (src/core/) and whichever
// shell runs it: Electron's main process on macOS, or the Capacitor app on
// iPad. Everything in src/core/ goes through these — never `electron`, Node
// built-ins, or Capacitor directly.
//
// Plain HTTP is deliberately not abstracted: core calls global `fetch`, which
// is Node's in Electron main and is patched by CapacitorHttp to native
// URLSession on iPad (so neither needs CORS workarounds).

import type { RunResult } from '../shared/api';

export type SqlValue = string | number | null;

/**
 * Async because iOS SQLite plugins are; params are positional (`?`) because
 * not every SQLite binding supports named ones.
 */
export interface SqlDatabase {
  /** Runs one or more statements with no params (schema, pragmas). */
  exec(sql: string): Promise<void>;
  run(sql: string, params?: SqlValue[]): Promise<RunResult>;
  all<T>(sql: string, params?: SqlValue[]): Promise<T[]>;
  get<T>(sql: string, params?: SqlValue[]): Promise<T | undefined>;
  /**
   * Runs `fn` inside BEGIN/COMMIT (ROLLBACK on throw). Callers go through
   * core/db.ts, which serializes these: SQLite has no nested transactions.
   */
  transaction<T>(fn: () => Promise<T>): Promise<T>;
}

export interface Platform {
  db: SqlDatabase;
  appVersion: string;
  /** Shown in status/debug info; also what backup/export copies. */
  dbPath: string;
}

let current: Platform | null = null;

export function setPlatform(next: Platform): void {
  current = next;
}

export function platform(): Platform {
  if (!current) throw new Error('Platform not initialized — call initBackend() first');
  return current;
}
