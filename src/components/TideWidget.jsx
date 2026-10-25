import React, { useState, useEffect } from 'react';
import axios from 'axios';

// NOAA CO-OPS station for Port Royal; also used by the Dashboard's conditions strip
export const TIDE_STATION = '8635299';

// Dates are YYYYMMDD. Port Royal is a subordinate station: NOAA only publishes
// highs and lows ('hilo') for it, not a 6-minute curve.
export const tidePredictionsUrl = (beginDate, endDate, interval) =>
    `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=NOS.COOPS.TAC.WL&begin_date=${beginDate}&end_date=${endDate}&datum=MLLW&station=${TIDE_STATION}&time_zone=lst_ldt&units=english&interval=${interval}&format=json`;

// "YYYY-MM-DD" shifted by n days, as YYYYMMDD
const shiftDate = (dateStr, n) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d + n);
    const pad = (v) => String(v).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
};

const parseTideTime = (timeStr) => new Date(timeStr.replace(' ', 'T'));

/**
 * Tide height every 6 minutes across one day, joining consecutive highs and
 * lows with a half cosine (the usual approximation between extremes).
 * Returns [{ minute, v }] for the minutes that fall between two extremes.
 */
const interpolateDay = (extremes, dateStr) => {
    const events = extremes.map((e) => ({ at: parseTideTime(e.t).getTime(), v: parseFloat(e.v) }));
    const [y, m, d] = dateStr.split('-').map(Number);
    const midnight = new Date(y, m - 1, d).getTime();
    const points = [];
    for (let minute = 0; minute <= 1440; minute += 6) {
        const at = midnight + minute * 60000;
        const i = events.findIndex((e) => e.at > at);
        if (i <= 0) continue;
        const a = events[i - 1];
        const b = events[i];
        const f = (at - a.at) / (b.at - a.at);
        points.push({ minute, v: a.v + (b.v - a.v) * (1 - Math.cos(Math.PI * f)) / 2 });
    }
    return points;
};

const CHART_W = 240;
const CHART_H = 70;

/**
 * The selected day's tide curve. When the day is today, a dashed line and dot
 * mark the current time.
 */
const TideChart = ({ extremes, dateStr }) => {
    const points = interpolateDay(extremes, dateStr);
    if (points.length < 2) return null;

    const values = points.map((p) => p.v);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;
    const x = (minute) => (minute / 1440) * CHART_W;
    const y = (v) => CHART_H - 6 - ((v - min) / span) * (CHART_H - 14);

    const line = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.minute).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
    const lastX = x(points[points.length - 1].minute).toFixed(1);
    const area = `${line} L${lastX},${CHART_H - 1} L${x(points[0].minute).toFixed(1)},${CHART_H - 1} Z`;

    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    let nowMarker = null;
    if (dateStr === todayStr) {
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const nearest = points.reduce((best, p) =>
            Math.abs(p.minute - nowMin) < Math.abs(best.minute - nowMin) ? p : best);
        nowMarker = { x: x(nowMin), y: y(nearest.v) };
    }

    return (
        <div className="tide-chart">
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} role="img" aria-label="Tide height through the day">
                <line className="tide-baseline" x1="0" y1={CHART_H - 1} x2={CHART_W} y2={CHART_H - 1} />
                <path className="tide-area" d={area} />
                <path className="tide-curve" d={line} />
                {nowMarker && (
                    <>
                        <line className="tide-now-line" x1={nowMarker.x} y1="2" x2={nowMarker.x} y2={CHART_H - 1} />
                        <circle className="tide-now-dot" cx={nowMarker.x} cy={nowMarker.y} r="4" />
                    </>
                )}
            </svg>
            <div className="tide-axis" aria-hidden="true">
                <span>12a</span><span>6a</span><span>12p</span><span>6p</span><span>12a</span>
            </div>
        </div>
    );
};

const TideWidget = () => {
    // Default to current date in local time
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [tideData, setTideData] = useState([]);
    const [extremes, setExtremes] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTides = async (dateStr) => {
        setIsLoading(true);
        setError(null);

        // Convert YYYY-MM-DD to YYYYMMDD
        const formattedDate = dateStr.replace(/-/g, '');
        const url = tidePredictionsUrl(formattedDate, formattedDate, 'hilo');

        // The curve needs the extremes either side of midnight, so it reads one
        // day further each way. It is decoration on top of the high/low list:
        // if it fails, the chart is simply left out.
        axios.get(tidePredictionsUrl(shiftDate(dateStr, -1), shiftDate(dateStr, 1), 'hilo'))
            .then((res) => setExtremes(res.data?.predictions || []))
            .catch(() => setExtremes([]));

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
                <>
                <TideChart extremes={extremes} dateStr={selectedDate} />
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
                </>
            ) : (
                <p className="empty-text">No tide predictions found.</p>
            )}

            <p className="station-info">Station: {TIDE_STATION}</p>
        </div>
    );
};

export default TideWidget;
