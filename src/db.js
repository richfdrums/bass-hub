import Database from 'better-sqlite3';
import path from 'node:path';
import { app } from 'electron';

const dbPath = path.join(app.getPath('userData'), 'fishing_hub_v6.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS gear (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    description TEXT,
    image_path TEXT,
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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quick_links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Migration: Add count column if it doesn't exist
try {
  db.prepare('ALTER TABLE gear ADD COLUMN count INTEGER DEFAULT 1').run();
} catch (e) {
  // Column already exists, ignore error
}

// Migration: Add links column to trips if it doesn't exist
try {
  db.prepare('ALTER TABLE trips ADD COLUMN links TEXT').run();
} catch (e) {
  // Column already exists
}

// Migration: Add map_query column to trips
try {
  db.prepare('ALTER TABLE trips ADD COLUMN map_query TEXT').run();
} catch (e) {
  // Column already exists
}

// Migration: Add category to quick_links
try {
  db.prepare('ALTER TABLE quick_links ADD COLUMN category TEXT DEFAULT "Other"').run();
} catch (e) {
  // Column already exists
}

// Migration: Add category to quick_links (Fixing quotes)
try {
  db.prepare("ALTER TABLE quick_links ADD COLUMN category TEXT DEFAULT 'Other'").run();
} catch (e) {
  // Column already exists or other error
}

const gearColumns = [
  'category', 'brand', 'model', 'description', 'image_path', 'color', 'is_wishlist', 'count', 'url',
  'length', 'power', 'action', 'type', 'size',
  'gear_ratio', 'lure_type', 'weight', 'line_type',
  'test', 'spool_size', 'terminal_type', 'sub_type',
  'terminal_size', 'terminal_weight'
];

export default {
  // ... (Gear CRUD) ...
  getGear: () => db.prepare('SELECT * FROM gear ORDER BY category, brand').all(),
  addGear: (gear) => {
    const presentColumns = gearColumns.filter(col => gear[col] !== undefined);
    const placeholders = presentColumns.map(() => '?').join(', ');
    const values = presentColumns.map(col => gear[col]);

    return db.prepare(`INSERT INTO gear (${presentColumns.join(', ')}) VALUES (${placeholders})`).run(...values);
  },
  updateGear: (id, gear) => {
    const presentColumns = gearColumns.filter(col => gear[col] !== undefined);
    const setClause = presentColumns.map(col => `${col} = ?`).join(', ');
    const values = presentColumns.map(col => gear[col]);
    values.push(id);

    return db.prepare(`UPDATE gear SET ${setClause} WHERE id = ?`).run(...values);
  },
  deleteGear: (id) => db.prepare('DELETE FROM gear WHERE id = ?').run(id),

  // Trips CRUD
  getTrips: () => {
    const trips = db.prepare('SELECT * FROM trips ORDER BY start_date ASC').all();
    return trips.map(t => ({ ...t, links: t.links ? JSON.parse(t.links) : [] }));
  },
  addTrip: (trip) => db.prepare('INSERT INTO trips (location, lat, lng, start_date, end_date, notes, total_cost, links, map_query) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(trip.location, trip.lat, trip.lng, trip.start_date, trip.end_date, trip.notes, trip.total_cost, JSON.stringify(trip.links || []), trip.map_query),
  updateTrip: (id, trip) => db.prepare('UPDATE trips SET location = ?, lat = ?, lng = ?, start_date = ?, end_date = ?, notes = ?, total_cost = ?, links = ?, map_query = ? WHERE id = ?').run(trip.location, trip.lat, trip.lng, trip.start_date, trip.end_date, trip.notes, trip.total_cost, JSON.stringify(trip.links || []), trip.map_query, id),
  deleteTrip: (id) => db.prepare('DELETE FROM trips WHERE id = ?').run(id),

  // Links CRUD
  getLinks: () => db.prepare('SELECT * FROM quick_links ORDER BY category, title').all(),
  addLink: (link) => db.prepare('INSERT INTO quick_links (title, url, category) VALUES (?, ?, ?)').run(link.title, link.url, link.category || 'Other'),
  updateLink: (id, link) => db.prepare('UPDATE quick_links SET title = ?, url = ?, category = ? WHERE id = ?').run(link.title, link.url, link.category || 'Other', id),
  deleteLink: (id) => db.prepare('DELETE FROM quick_links WHERE id = ?').run(id),

  // Settings
  getSetting: (key) => db.prepare('SELECT value FROM settings WHERE key = ?').get(key),
  setSetting: (key, value) => db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
};
