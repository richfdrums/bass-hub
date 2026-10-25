// SQLite store, shared by both shells. Async all the way down because the
// iOS binding is; the desktop adapter wraps better-sqlite3's sync API.

import { platform } from './platform';
import type { GearItem, QuickLink, RunResult, Trip } from '../shared/api';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS gear (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    description TEXT,
    image_path TEXT,
    image_url TEXT,
    color TEXT,
    url TEXT,
    is_wishlist INTEGER DEFAULT 0,
    count INTEGER DEFAULT 1,

    -- Rod Specific
    length TEXT,
    power TEXT,
    action TEXT,

    -- Reel Specific
    type TEXT,
    size TEXT,
    gear_ratio TEXT,

    -- Lure Specific
    lure_type TEXT,
    weight TEXT,

    -- Line Specific
    line_type TEXT,
    test TEXT,
    spool_size TEXT,

    -- Terminal Specific
    terminal_type TEXT,
    sub_type TEXT,
    terminal_size TEXT,
    terminal_weight TEXT,

    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location TEXT NOT NULL,
    lat REAL,
    lng REAL,
    start_date DATE,
    end_date DATE,
    notes TEXT,
    total_cost REAL DEFAULT 0,
    links TEXT,
    map_query TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quick_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    category TEXT DEFAULT 'Other',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`;

/**
 * Whitelist for gear inserts/updates. A new gear column must be added here
 * *and* to SCHEMA/initSchema, or it is silently dropped.
 */
export const gearColumns = [
  'category', 'brand', 'model', 'description', 'image_path', 'image_url', 'color',
  'is_wishlist', 'count', 'url',
  'length', 'power', 'action', 'type', 'size',
  'gear_ratio', 'lure_type', 'weight', 'line_type',
  'test', 'spool_size', 'terminal_type', 'sub_type',
  'terminal_size', 'terminal_weight',
] as const satisfies readonly (keyof GearItem)[];

/**
 * Adds a column to an existing table only if it isn't there yet. Idempotent,
 * unlike the ALTER TABLE ... try/catch this replaces, and it doesn't hide
 * unrelated errors.
 */
async function ensureColumn(table: string, column: string, declaration: string): Promise<void> {
  const columns = await platform().db.all<{ name: string }>(`PRAGMA table_info(${table})`);
  if (!columns.some((c) => c.name === column)) {
    await platform().db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${declaration}`);
  }
}

/** Bumped whenever the schema changes in a way an older build cannot read. */
const SCHEMA_VERSION = 1;

export async function initSchema(): Promise<void> {
  // Refuse a database written by a newer build instead of silently mangling it.
  const { user_version: version } = (await platform().db.get<{ user_version: number }>(
    'PRAGMA user_version'
  )) ?? { user_version: 0 };
  if (version > SCHEMA_VERSION) {
    throw new Error(
      `This database was written by a newer version of Bass Hub (schema v${version}, ` +
        `this build understands v${SCHEMA_VERSION}). Update the app, or restore an older snapshot.`
    );
  }

  await platform().db.exec(SCHEMA);

  // Columns added after v1 of the schema. Order matters only for readability.
  await ensureColumn('gear', 'count', 'INTEGER DEFAULT 1');
  await ensureColumn('gear', 'image_url', 'TEXT');
  await ensureColumn('trips', 'links', 'TEXT');
  await ensureColumn('trips', 'map_query', 'TEXT');
  await ensureColumn('quick_links', 'category', "TEXT DEFAULT 'Other'");

  await platform().db.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
}

export const gear = {
  list: (): Promise<GearItem[]> =>
    platform().db.all<GearItem>('SELECT * FROM gear ORDER BY category, brand'),

  add: (item: Partial<GearItem>): Promise<RunResult> => {
    const present = gearColumns.filter((col) => item[col] !== undefined);
    const placeholders = present.map(() => '?').join(', ');
    const values = present.map((col) => item[col] as string | number | null);
    return platform().db.run(
      `INSERT INTO gear (${present.join(', ')}) VALUES (${placeholders})`,
      values
    );
  },

  update: (id: number, item: Partial<GearItem>): Promise<RunResult> => {
    const present = gearColumns.filter((col) => item[col] !== undefined);
    const setClause = present.map((col) => `${col} = ?`).join(', ');
    const values = present.map((col) => item[col] as string | number | null);
    return platform().db.run(`UPDATE gear SET ${setClause} WHERE id = ?`, [...values, id]);
  },

  remove: (id: number): Promise<RunResult> =>
    platform().db.run('DELETE FROM gear WHERE id = ?', [id]),
};

type TripRow = Omit<Trip, 'links'> & { links: string | null };

export const trips = {
  list: async (): Promise<Trip[]> => {
    const rows = await platform().db.all<TripRow>(
      'SELECT * FROM trips ORDER BY start_date ASC'
    );
    return rows.map((row) => ({ ...row, links: row.links ? JSON.parse(row.links) : [] }));
  },

  add: (trip: Partial<Trip>): Promise<RunResult> =>
    platform().db.run(
      `INSERT INTO trips (location, lat, lng, start_date, end_date, notes, total_cost, links, map_query)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        trip.location ?? '',
        trip.lat ?? null,
        trip.lng ?? null,
        trip.start_date ?? null,
        trip.end_date ?? null,
        trip.notes ?? null,
        trip.total_cost ?? null,
        JSON.stringify(trip.links ?? []),
        trip.map_query ?? null,
      ]
    ),

  update: (id: number, trip: Partial<Trip>): Promise<RunResult> =>
    platform().db.run(
      `UPDATE trips SET location = ?, lat = ?, lng = ?, start_date = ?, end_date = ?,
         notes = ?, total_cost = ?, links = ?, map_query = ? WHERE id = ?`,
      [
        trip.location ?? '',
        trip.lat ?? null,
        trip.lng ?? null,
        trip.start_date ?? null,
        trip.end_date ?? null,
        trip.notes ?? null,
        trip.total_cost ?? null,
        JSON.stringify(trip.links ?? []),
        trip.map_query ?? null,
        id,
      ]
    ),

  remove: (id: number): Promise<RunResult> =>
    platform().db.run('DELETE FROM trips WHERE id = ?', [id]),
};

export const links = {
  list: (): Promise<QuickLink[]> =>
    platform().db.all<QuickLink>('SELECT * FROM quick_links ORDER BY category, title'),

  add: (link: Partial<QuickLink>): Promise<RunResult> =>
    platform().db.run('INSERT INTO quick_links (title, url, category) VALUES (?, ?, ?)', [
      link.title ?? '',
      link.url ?? '',
      link.category ?? 'Other',
    ]),

  update: (id: number, link: Partial<QuickLink>): Promise<RunResult> =>
    platform().db.run('UPDATE quick_links SET title = ?, url = ?, category = ? WHERE id = ?', [
      link.title ?? '',
      link.url ?? '',
      link.category ?? 'Other',
      id,
    ]),

  remove: (id: number): Promise<RunResult> =>
    platform().db.run('DELETE FROM quick_links WHERE id = ?', [id]),
};

export const settings = {
  get: async (key: string): Promise<string | null> => {
    const row = await platform().db.get<{ value: string | null }>(
      'SELECT value FROM settings WHERE key = ?',
      [key]
    );
    return row ? row.value : null;
  },

  set: (key: string, value: string): Promise<RunResult> =>
    platform().db.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]),
};
