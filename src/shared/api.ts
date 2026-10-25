// The shape of window.fishingApi. Single source of truth for both shells:
// Electron's preload implements it over IPC, the iPad implements it
// in-process (src/ios/main.jsx). Keep in sync with the ipcMain handlers.

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

export interface GearItem {
  id?: number;
  category: string;
  brand?: string | null;
  model?: string | null;
  description?: string | null;
  /** Local file, user override. Desktop-only until P2. */
  image_path?: string | null;
  /** Remote image URL from the scrape. Preferred over image_path. */
  image_url?: string | null;
  color?: string | null;
  url?: string | null;
  is_wishlist?: number;
  count?: number;
  length?: string | null;
  power?: string | null;
  action?: string | null;
  type?: string | null;
  size?: string | null;
  gear_ratio?: string | null;
  lure_type?: string | null;
  weight?: string | null;
  line_type?: string | null;
  test?: string | null;
  spool_size?: string | null;
  terminal_type?: string | null;
  sub_type?: string | null;
  terminal_size?: string | null;
  terminal_weight?: string | null;
  created_at?: string;
}

export interface Trip {
  id?: number;
  location: string;
  lat?: number | null;
  lng?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
  total_cost?: number | null;
  links: string[];
  map_query?: string | null;
  created_at?: string;
}

export interface QuickLink {
  id?: number;
  title: string;
  url: string;
  category?: string | null;
  created_at?: string;
}

export interface ExtractedGear {
  category: string;
  brand: string;
  model: string;
  description: string;
  url: string;
  extracted_image_url: string;
}

export type ExtractResult =
  | { success: true; data: ExtractedGear }
  | { success: false; error: string };

/** Result of re-scraping just the product image for an existing item. */
export type RefreshImageResult =
  | { success: true; imageUrl: string }
  | { success: false; error: string };

export interface FileResult {
  success: boolean;
  path?: string;
  error?: string;
  cancelled?: boolean;
}

/** Database work shared by both shells. */
export interface CoreApi {
  getGear(): Promise<GearItem[]>;
  addGear(gear: Partial<GearItem>): Promise<RunResult>;
  updateGear(id: number, gear: Partial<GearItem>): Promise<RunResult>;
  deleteGear(id: number): Promise<RunResult>;

  getTrips(): Promise<Trip[]>;
  addTrip(trip: Partial<Trip>): Promise<RunResult>;
  updateTrip(id: number, trip: Partial<Trip>): Promise<RunResult>;
  deleteTrip(id: number): Promise<RunResult>;

  getLinks(): Promise<QuickLink[]>;
  addLink(link: Partial<QuickLink>): Promise<RunResult>;
  updateLink(id: number, link: Partial<QuickLink>): Promise<RunResult>;
  deleteLink(id: number): Promise<RunResult>;

  getSetting(key: string): Promise<string | null>;
  updateSetting(key: string, value: string): Promise<RunResult>;

  /** Scrapes a product page. Network work, but platform-neutral (global fetch). */
  extractGearDetails(url: string): Promise<ExtractResult>;
  /** Re-scrapes only the product image, to backfill or repair `image_url`. */
  refreshGearImage(url: string): Promise<RefreshImageResult>;
  /** Best-effort page title for prefill; '' on failure. */
  fetchPageTitle(url: string): Promise<string>;
}

export interface SnapshotSummary {
  gear: number;
  trips: number;
  links: number;
}

/**
 * Result of choosing a snapshot file. `ready` means it is a valid Bass Hub
 * database this build understands and is staged for `applySnapshot`; nothing
 * has been replaced yet.
 */
export type PickSnapshotResult =
  | { status: 'cancelled' }
  | { status: 'error'; error: string }
  | { status: 'ready'; path: string; summary: SnapshotSummary };

/**
 * Whole-file snapshot exchange. iPad-only for now: the desktop moves data with
 * native open/save dialogs (DesktopApi) and is read-only by convention.
 */
export interface SnapshotApi {
  exportSnapshot(): Promise<FileResult>;
  pickSnapshot(): Promise<PickSnapshotResult>;
  applySnapshot(path: string): Promise<FileResult>;
}

/** Desktop-only extras. The iPad has no file system picker or native dialogs. */
export interface DesktopApi {
  saveImage(filePath: string): Promise<string | null>;
  getFilePath(file: File): string;
  getMapsApiKey(): Promise<string>;
  exportDatabase(): Promise<FileResult>;
  importDatabase(): Promise<FileResult>;
}

export type Api = CoreApi & DesktopApi & Partial<SnapshotApi>;
