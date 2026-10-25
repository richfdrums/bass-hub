// better-sqlite3 behind the async SqlDatabase seam. Every call is synchronous
// underneath; the async signatures keep core/ portable to the iOS binding.

import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import type { RunResult } from '../../shared/api';
import type { SqlDatabase, SqlValue } from '../../core/platform';

/** Must match the value src/core/db.ts writes (and SnapshotPlugin.swift checks). */
const SCHEMA_VERSION = 1;

const BACKUP_KEEP = 5;

/**
 * Invisible rolling backups: a copy of the DB next to it on every launch, newest
 * five kept. Same behaviour as the iPad (DbPaths.swift), so a bad import or a
 * bad day is always recoverable by hand.
 */
function backupCurrent(dbPath: string): void {
  try {
    const dir = path.join(path.dirname(dbPath), 'backups');
    fs.mkdirSync(dir, { recursive: true });

    const stamp = new Date().toISOString().replace(/:/g, '-');
    fs.copyFileSync(dbPath, path.join(dir, `basshub-${stamp}.db`));

    const snapshots = fs
      .readdirSync(dir)
      .filter((name) => name.endsWith('.db'))
      .map((name) => ({ name, time: fs.statSync(path.join(dir, name)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    for (const old of snapshots.slice(BACKUP_KEEP)) {
      fs.rmSync(path.join(dir, old.name), { force: true });
    }
  } catch (err) {
    // Backups are best-effort: never block startup on them.
    console.error('Rolling backup failed:', err);
  }
}

export function openElectronDb(dbPath: string): SqlDatabase {
  const db = new Database(dbPath);
  if (fs.existsSync(dbPath)) backupCurrent(dbPath);

  return {
    async exec(sql) {
      db.exec(sql);
    },

    async run(sql: string, params: SqlValue[] = []): Promise<RunResult> {
      const result = db.prepare(sql).run(...params);
      return {
        changes: result.changes,
        lastInsertRowid: Number(result.lastInsertRowid),
      };
    },

    async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
      return db.prepare(sql).all(...params) as T[];
    },

    async get<T>(sql: string, params: SqlValue[] = []): Promise<T | undefined> {
      return db.prepare(sql).get(...params) as T | undefined;
    },

    async transaction<T>(fn: () => Promise<T>): Promise<T> {
      db.exec('BEGIN');
      try {
        const result = await fn();
        db.exec('COMMIT');
        return result;
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },

    async close() {
      db.close();
    },
  };
}

/**
 * Checks a file picked in the restore dialog before it replaces the live DB, so
 * an incompatible snapshot is rejected instead of leaving the app unable to
 * start. Mirrors the iPad's validation in SnapshotPlugin.swift.
 */
export function validateSnapshot(filePath: string): { ok: true } | { ok: false; error: string } {
  let candidate: Database.Database | null = null;
  try {
    candidate = new Database(filePath, { readonly: true, fileMustExist: true });

    const integrity = candidate.pragma('integrity_check', { simple: true });
    if (integrity !== 'ok') return { ok: false, error: 'That file is not a valid SQLite database.' };

    const version = candidate.pragma('user_version', { simple: true }) as number;
    if (version !== SCHEMA_VERSION) {
      return {
        ok: false,
        error: `That snapshot was made by an incompatible version of Bass Hub (schema v${version}, this build expects v${SCHEMA_VERSION}).`,
      };
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: 'That file is not a readable database.' };
  } finally {
    candidate?.close();
  }
}
