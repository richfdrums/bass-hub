import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TideWidget = () => {
    // Default to current date in local time
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [tideData, setTideData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTides = async (dateStr) => {
        setIsLoading(true);
        setError(null);

        // Convert YYYY-MM-DD to YYYYMMDD
        const formattedDate = dateStr.replace(/-/g, '');
        const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=NOS.COOPS.TAC.WL&begin_date=${formattedDate}&end_date=${formattedDate}&datum=MLLW&station=8635299&time_zone=lst_ldt&units=english&interval=hilo&format=json`;

        try {
            const response = await axios.get(url);
            if (response.data && response.data.predictions) {
                setTideData(response.data.predictions);
            } else {
                setTideData([]);
                if (response.data.error) {
                    setError('No predictions for ' + dateStr);
                } else {
                    setError('No data found.');
                }
            }
        } catch (err) {
            console.error('Error fetching tides:', err);
            setError('Failed to connect to NOAA.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (selectedDate) fetchTides(selectedDate);
    }, [selectedDate]);

    const handleDateChange = (e) => {
        setSelectedDate(e.target.value);
    };

    const formatTideTime = (timeStr) => {
        // Prepare for parse "YYYY-MM-DD HH:MM"
        const date = new Date(timeStr.replace(' ', 'T'));
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="widget tide-widget" onClick={(e) => e.stopPropagation()}>
            <div className="widget-header">
                <h3>Port Royal Tides</h3>
                <div className="tide-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={handleDateChange}
                        className="tide-date-input"
                    />
                    <button className="widget-action" onClick={() => fetchTides(selectedDate)} title="Refresh">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '14px', height: '14px' }}>
                            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.85.83 6.72 2.25L21 8m0-5v5h-5" />
                        </svg>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Fetching tides...</p>
                </div>
            ) : error ? (
                <div className="error-container" style={{ padding: '20px 0', textAlign: 'center' }}>
                    <p className="error-text" style={{ marginBottom: '10px' }}>{error}</p>
                    <button className="btn-secondary" onClick={() => fetchTides(selectedDate)}>Retry</button>
                </div>
            ) : tideData.length > 0 ? (
                <div className="tide-list">
                    {tideData.map((tide, index) => (
                        <div key={index} className="tide-item">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span className={`tide-type ${tide.type === 'H' ? 'high' : 'low'}`}>
                                    {tide.type === 'H' ? 'High' : 'Low'}
                                </span>
                                <span className="tide-time">
                                    {formatTideTime(tide.t)}
                                </span>
                            </div>
                            <span className="tide-value">
                                {parseFloat(tide.v).toFixed(1)} ft
                            </span>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="empty-text">No tide predictions found.</p>
            )}

            <p className="station-info">Station: 8635299</p>
        </div>
    );
};

export default TideWidget;
