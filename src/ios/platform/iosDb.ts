import type { SqlDatabase, SqlValue } from '../../core/platform';
import { Sqlite } from './plugins';

// The native side (SqlitePlugin.swift) runs every call on one serial queue
// against a single connection, so BEGIN/COMMIT here bracket exactly the
// statements issued in between — core/db.ts serializes transactions.
export async function openIosDb(name: string): Promise<{ db: SqlDatabase; path: string }> {
  const { path } = await Sqlite.open({ name });

  const all = async <T>(sql: string, params: SqlValue[] = []): Promise<T[]> =>
    (await Sqlite.all({ sql, params })).rows as T[];

  const db: SqlDatabase = {
    async exec(sql) {
      await Sqlite.exec({ sql });
    },
    run(sql, params = []) {
      return Sqlite.run({ sql, params });
    },
    all,
    async get<T>(sql: string, params?: SqlValue[]) {
      return (await all<T>(sql, params))[0];
    },
    async transaction<T>(fn: () => Promise<T>) {
      await Sqlite.exec({ sql: 'BEGIN' });
      try {
        const result = await fn();
        await Sqlite.exec({ sql: 'COMMIT' });
        return result;
      } catch (err) {
        await Sqlite.exec({ sql: 'ROLLBACK' });
        throw err;
      }
    },
  };

  return { db, path };
}
