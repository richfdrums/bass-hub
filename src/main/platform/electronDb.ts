// better-sqlite3 behind the async SqlDatabase seam. Every call is synchronous
// underneath; the async signatures keep core/ portable to the iOS binding.

import Database from 'better-sqlite3';
import type { RunResult } from '../../shared/api';
import type { SqlDatabase, SqlValue } from '../../core/platform';

export function openElectronDb(path: string): SqlDatabase {
  const db = new Database(path);

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
  };
}
