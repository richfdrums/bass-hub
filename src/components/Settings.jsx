import React, { useState, useEffect } from 'react';

const Settings = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [mapsKey, setMapsKey] = useState('');
    const [isSavingKey, setIsSavingKey] = useState(false);

    useEffect(() => {
        const fetchKey = async () => {
            const key = await window.fishingApi.getMapsApiKey();
            setMapsKey(key);
        };
        fetchKey();
    }, []);

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
                            <h2>Database Management</h2>
                            <p>Export your data for safekeeping or restore from a previous backup.</p>
                        </div>
                    </div>

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
                </section>

                <section className="settings-section info">
                    <h2>About Bass Hub</h2>
                    <p>Version 1.0.0</p>
                    <p>A premium local-first organizer for serious anglers.</p>
                </section>
            </div>
        </div>
    );
};

export default Settings;
