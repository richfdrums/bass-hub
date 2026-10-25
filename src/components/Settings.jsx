import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { IS_IOS } from '../shared/platform';

const Settings = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [mapsKey, setMapsKey] = useState('');
    const [isSavingKey, setIsSavingKey] = useState(false);
    // iPad only: the snapshot chosen in the picker, awaiting confirmation.
    const [pendingSnapshot, setPendingSnapshot] = useState(null);
    const [lastImport, setLastImport] = useState('');
    // Gear image backfill: the catalog, live progress, and the last outcome.
    const [gear, setGear] = useState([]);
    const [isBackfilling, setIsBackfilling] = useState(false);
    const [backfillProgress, setBackfillProgress] = useState(null);
    const [backfillResult, setBackfillResult] = useState(null);

    useEffect(() => {
        const fetchKey = async () => {
            const key = await window.fishingApi.getMapsApiKey();
            setMapsKey(key);
        };
        fetchKey();
    }, []);

    useEffect(() => {
        if (!IS_IOS) return;
        const fetchLastImport = async () => {
            const value = await window.fishingApi.getSetting('last_snapshot_import');
            setLastImport(value || '');
        };
        fetchLastImport();
    }, []);

    useEffect(() => {
        const loadGear = async () => setGear(await window.fishingApi.getGear());
        loadGear();
    }, []);

    // Only items that have a product URL and no image yet; anything else is
    // either fine already or has no page to read.
    const missingImages = gear.filter((g) => /^https?:\/\//i.test(g.url || '') && !g.image_url);
    const withoutUrl = gear.filter((g) => !/^https?:\/\//i.test(g.url || '')).length;

    /**
     * Walks the catalog one item at a time and re-reads each missing product
     * image. Sequential on purpose: these are someone else's web servers, and
     * one request at a time keeps a 15-item run from looking like a scrape.
     */
    const refreshMissingImages = async () => {
        const targets = gear.filter((g) => /^https?:\/\//i.test(g.url || '') && !g.image_url);
        if (targets.length === 0 || isBackfilling) return;

        setIsBackfilling(true);
        setBackfillResult(null);
        setBackfillProgress({ done: 0, total: targets.length });

        let added = 0;
        const failed = [];

        for (let i = 0; i < targets.length; i += 1) {
            const item = targets[i];
            const result = await window.fishingApi.refreshGearImage(item.url);

            if (result.success) {
                // Partial update: only image_url is written, everything else stays.
                await window.fishingApi.updateGear(item.id, { image_url: result.imageUrl });
                added += 1;
            } else {
                failed.push({
                    label: `${item.brand || ''} ${item.model || ''}`.trim() || `Item #${item.id}`,
                    error: result.error,
                });
            }

            setBackfillProgress({ done: i + 1, total: targets.length });

            if (i < targets.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 300));
            }
        }

        setGear(await window.fishingApi.getGear());
        setBackfillResult({ added, failed });
        setBackfillProgress(null);
        setIsBackfilling(false);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const result = await window.fishingApi.exportDatabase();
            if (result.success) {
                alert(`Backup created successfully!\nLocation: ${result.path}`);
            } else if (!result.cancelled) {
                alert(`Export failed: ${result.error}`);
            }
        } catch (err) {
            alert(`An error occurred: ${err.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImport = async () => {
        setIsImporting(true);
        try {
            const result = await window.fishingApi.importDatabase();
            if (result && !result.success && !result.cancelled) {
                alert(`Import failed: ${result.error}`);
            }
        } catch (err) {
            alert(`An error occurred: ${err.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    const handleExportSnapshot = async () => {
        setIsExporting(true);
        try {
            const result = await window.fishingApi.exportSnapshot();
            if (!result.success) {
                alert(`Export failed: ${result.error}`);
            }
        } catch (err) {
            alert(`An error occurred: ${err.message}`);
        } finally {
            setIsExporting(false);
        }
    };

    const handlePickSnapshot = async () => {
        setIsImporting(true);
        try {
            const result = await window.fishingApi.pickSnapshot();
            if (result.status === 'ready') {
                setPendingSnapshot(result);
            } else if (result.status === 'error') {
                alert(`Import failed: ${result.error}`);
            }
        } catch (err) {
            alert(`An error occurred: ${err.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    const confirmSnapshotImport = async () => {
        if (!pendingSnapshot) return;
        const { path } = pendingSnapshot;
        setPendingSnapshot(null);
        setIsImporting(true);
        try {
            const result = await window.fishingApi.applySnapshot(path);
            if (!result.success) {
                alert(`Import failed: ${result.error}`);
                return;
            }
            await window.fishingApi.updateSetting('last_snapshot_import', new Date().toISOString());
            // Re-runs src/ios/main.tsx against the new file: nothing in memory
            // is worth keeping after a whole-file replacement.
            window.location.reload();
        } catch (err) {
            alert(`An error occurred: ${err.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    const handleSaveMapsKey = async () => {
        setIsSavingKey(true);
        try {
            await window.fishingApi.updateSetting('google_maps_api_key', mapsKey);
            alert('Google Maps API Key saved! Changes will take effect after restarting the app.');
        } catch (err) {
            alert(`Failed to save key: ${err.message}`);
        } finally {
            setIsSavingKey(false);
        }
    };

    return (
        <div className="settings-view">
            <div className="view-header">
                <h1>Settings & Data</h1>
            </div>

            <div className="settings-content">
                <section className="settings-section">
                    <div className="section-header">
                        <div className="section-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                            </svg>
                        </div>
                        <div className="section-info">
                            <h2>Integrations</h2>
                            <p>Configure external services connected to Bass Hub.</p>
                        </div>
                    </div>

                    <div className="settings-actions">
                        <div className="action-card full-width">
                            <h3>Google Maps Platform</h3>
                            <p>Enter your Google Maps API Key to enable location search and interactive map features.</p>
                            <div className="input-with-button">
                                <input
                                    type="password"
                                    value={mapsKey}
                                    onChange={(e) => setMapsKey(e.target.value)}
                                    placeholder="Enter your API key..."
                                    className="settings-input"
                                />
                                <button
                                    className="btn-primary"
                                    onClick={handleSaveMapsKey}
                                    disabled={isSavingKey}
                                >
                                    {isSavingKey ? 'Saving...' : 'Save Key'}
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="settings-section">
                    <div className="section-header">
                        <div className="section-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" />
                                <line x1="16" y1="8" x2="2" y2="22" />
                                <line x1="17.5" y1="15" x2="9" y2="15" />
                            </svg>
                        </div>
                        <div className="section-info">
                            <h2>{IS_IOS ? 'Snapshots' : 'Database Management'}</h2>
                            <p>
                                {IS_IOS
                                    ? 'Move your whole database between this iPad and your Mac. Snapshots travel as ordinary files — nothing syncs automatically.'
                                    : 'Export your data for safekeeping or restore from a previous backup.'}
                            </p>
                        </div>
                    </div>

                    {IS_IOS ? (
                        <div className="settings-actions">
                            <div className="action-card">
                                <h3>Export Snapshot</h3>
                                <p>Share a copy of everything on this iPad — gear, trips, and links — to iCloud Drive, AirDrop, or Files.</p>
                                <button
                                    className="btn-primary"
                                    onClick={handleExportSnapshot}
                                    disabled={isExporting}
                                >
                                    {isExporting ? 'Preparing...' : 'Share Snapshot'}
                                </button>
                            </div>

                            <div className="action-card warning">
                                <h3>Import Snapshot</h3>
                                <p>
                                    Replace everything on this iPad with a snapshot from your Mac.{' '}
                                    <strong>This overwrites the current data — it does not merge.</strong>
                                </p>
                                <button
                                    className="btn-secondary"
                                    onClick={handlePickSnapshot}
                                    disabled={isImporting}
                                >
                                    {isImporting ? 'Working...' : 'Choose Snapshot'}
                                </button>
                                {lastImport && (
                                    <p className="settings-hint">
                                        Last imported {new Date(lastImport).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="settings-actions">
                            <div className="action-card">
                                <h3>Backup Data</h3>
                                <p>Creates a copy of your entire local database (items, trips, and links).</p>
                                <button
                                    className="btn-primary"
                                    onClick={handleExport}
                                    disabled={isExporting}
                                >
                                    {isExporting ? 'Exporting...' : 'Export .db File'}
                                </button>
                            </div>

                            <div className="action-card warning">
                                <h3>Restore Data</h3>
                                <p>Import a previously exported database. <strong>Note: This will overwrite your current data and restart the app.</strong></p>
                                <button
                                    className="btn-secondary"
                                    onClick={handleImport}
                                    disabled={isImporting}
                                >
                                    {isImporting ? 'Importing...' : 'Restore from File'}
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                <section className="settings-section">
                    <div className="section-header">
                        <div className="section-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                        </div>
                        <div className="section-info">
                            <h2>Gear Images</h2>
                            <p>Product photos are hotlinked from the page each item was added from — nothing is stored locally.</p>
                        </div>
                    </div>

                    <div className="settings-actions">
                        <div className="action-card full-width">
                            <h3>Missing Images</h3>
                            <p>
                                {missingImages.length === 0
                                    ? 'Every item with a product URL has an image.'
                                    : `${missingImages.length} ${missingImages.length === 1 ? 'item has' : 'items have'} a product URL but no image yet. Re-reading fetches just the photo and leaves every other field alone.`}
                                {withoutUrl > 0 &&
                                    ` ${withoutUrl} ${withoutUrl === 1 ? 'item has' : 'items have'} no product URL and ${withoutUrl === 1 ? 'is' : 'are'} skipped.`}
                            </p>
                            <button
                                className="btn-primary"
                                onClick={refreshMissingImages}
                                disabled={isBackfilling || missingImages.length === 0}
                            >
                                {isBackfilling ? (
                                    <>
                                        <span className="spinner" />
                                        Refreshing {backfillProgress ? `${backfillProgress.done} of ${backfillProgress.total}` : '...'}
                                    </>
                                ) : missingImages.length === 0 ? (
                                    'All images present'
                                ) : (
                                    `Refresh ${missingImages.length} missing ${missingImages.length === 1 ? 'image' : 'images'}`
                                )}
                            </button>
                            {backfillResult && (
                                <div className="backfill-result">
                                    <p className="settings-hint">
                                        Added {backfillResult.added} {backfillResult.added === 1 ? 'image' : 'images'}
                                        {backfillResult.failed.length > 0 &&
                                            `, ${backfillResult.failed.length} could not be read`}.
                                    </p>
                                    {backfillResult.failed.length > 0 && (
                                        <ul className="backfill-failures">
                                            {backfillResult.failed.map((f) => (
                                                <li key={f.label}>{f.label} — {f.error}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="settings-section info">
                    <h2>About Bass Hub</h2>
                    <p>Version 1.0.0</p>
                    <p>A premium local-first organizer for serious anglers.</p>
                </section>
            </div>

            <Modal
                isOpen={Boolean(pendingSnapshot)}
                onClose={() => setPendingSnapshot(null)}
                title="Replace everything on this iPad?"
            >
                {pendingSnapshot && (
                    <>
                        <p className="snapshot-summary">
                            This snapshot contains{' '}
                            <strong>{pendingSnapshot.summary.gear} gear items</strong>,{' '}
                            <strong>{pendingSnapshot.summary.trips} trips</strong> and{' '}
                            <strong>{pendingSnapshot.summary.links} quick links</strong>.
                        </p>
                        <p className="snapshot-summary">
                            Importing replaces all of that here. It does not merge, and anything
                            entered on this iPad since your last export is lost. A copy of the
                            current database is kept on the device just in case.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setPendingSnapshot(null)}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={confirmSnapshotImport}>
                                Replace and Reload
                            </button>
                        </div>
                    </>
                )}
            </Modal>
        </div>
    );
};

export default Settings;
