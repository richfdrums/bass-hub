import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LOCATIONS = {
    'bowling-green': { name: 'Bowling Green, VA', lat: 38.0496, lon: -77.3466 },
    'annandale': { name: 'Annandale, VA', lat: 38.8304, lon: -77.1964 }
};
const DEFAULT_LOCATION = 'bowling-green';
const SETTING_KEY = 'weather_location';

// WMO weather codes (Open-Meteo) -> icon type + short description
const describeCode = (code, isDay) => {
    if (code === 0) return { icon: isDay ? 'sun' : 'moon', text: isDay ? 'Sunny' : 'Clear' };
    if (code === 1) return { icon: isDay ? 'sun' : 'moon', text: isDay ? 'Mostly Sunny' : 'Mostly Clear' };
    if (code === 2) return { icon: 'partly', text: 'Partly Cloudy' };
    if (code === 3) return { icon: 'cloud', text: 'Cloudy' };
    if (code === 45 || code === 48) return { icon: 'fog', text: 'Fog' };
    if (code >= 51 && code <= 57) return { icon: 'rain', text: 'Drizzle' };
    if (code === 61) return { icon: 'rain', text: 'Light Rain' };
    if (code === 63) return { icon: 'rain', text: 'Rain' };
    if (code === 65) return { icon: 'rain', text: 'Heavy Rain' };
    if (code === 66 || code === 67) return { icon: 'rain', text: 'Freezing Rain' };
    if (code >= 71 && code <= 77) return { icon: 'snow', text: 'Snow' };
    if (code >= 80 && code <= 82) return { icon: 'rain', text: 'Showers' };
    if (code === 85 || code === 86) return { icon: 'snow', text: 'Snow Showers' };
    if (code >= 95) return { icon: 'storm', text: 'Thunderstorms' };
    return { icon: 'cloud', text: 'Unknown' };
};

const WeatherIcon = ({ type, isDay = true, size = 22 }) => {
    const cloud = <path d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 7 9.5 4.25 4.25 0 0 0 7 18z" />;
    let content;
    switch (type) {
        case 'sun':
            content = (
                <g className="wx-sun">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </g>
            );
            break;
        case 'moon':
            content = <path className="wx-moon" d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />;
            break;
        case 'partly':
            content = (
                <>
                    {isDay ? (
                        <g className="wx-sun">
                            <circle cx="8" cy="8" r="3" />
                            <path d="M8 2v1.5M2 8h1.5M3.76 3.76l1.06 1.06M12.24 3.76l-1.06 1.06" />
                        </g>
                    ) : (
                        <path className="wx-moon" d="M12 9.5A4.5 4.5 0 1 1 6.5 3.5a3.5 3.5 0 0 0 5.5 6z" />
                    )}
                    <g className="wx-cloud">{cloud}</g>
                </>
            );
            break;
        case 'fog':
            content = <path className="wx-cloud" d="M4 9h16M3 13h18M5 17h14" />;
            break;
        case 'rain':
            content = (
                <>
                    <g className="wx-cloud" transform="translate(0 -3)">{cloud}</g>
                    <path className="wx-rain" d="M8 18l-1 3M12 18l-1 3M16 18l-1 3" />
                </>
            );
            break;
        case 'snow':
            content = (
                <>
                    <g className="wx-cloud" transform="translate(0 -3)">{cloud}</g>
                    <path className="wx-snow" d="M8 19.5h.01M12 21h.01M16 19.5h.01M10 22.5h.01M14 22.5h.01" />
                </>
            );
            break;
        case 'storm':
            content = (
                <>
                    <g className="wx-cloud" transform="translate(0 -3)">{cloud}</g>
                    <path className="wx-bolt" d="M13 15l-3 4h3l-2 4" />
                </>
            );
            break;
        default:
            content = <g className="wx-cloud">{cloud}</g>;
    }
    return (
        <svg className="wx-icon" viewBox="0 0 24 24" width={size} height={size} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {content}
        </svg>
    );
};

const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const toCompass = (deg) => (deg == null ? '' : COMPASS[Math.round(deg / 22.5) % 16]);

// Open-Meteo returns local times as "YYYY-MM-DDTHH:MM"; parse without UTC shifting
const parseLocalDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};
const addDays = (dateStr, n) => {
    const date = parseLocalDate(dateStr);
    date.setDate(date.getDate() + n);
    const pad = (v) => String(v).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};
const formatClock = (isoStr) => {
    if (!isoStr) return '—';
    const [datePart, timePart] = isoStr.split('T');
    const [h, min] = timePart.split(':').map(Number);
    const date = parseLocalDate(datePart);
    date.setHours(h, min);
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

const HPA_TO_INHG = 0.02953;

// Build per-day rows, deriving day (6a–6p) and night (6p–6a) halves from hourly data
const buildForecast = (data) => {
    const { daily, hourly } = data;
    const hourIndex = {};
    hourly.time.forEach((t, i) => { hourIndex[t] = i; });

    const collect = (dateStr, startHour, count) => {
        const indices = [];
        for (let k = 0; k < count; k++) {
            const hour = startHour + k;
            const day = hour >= 24 ? addDays(dateStr, 1) : dateStr;
            const key = `${day}T${String(hour % 24).padStart(2, '0')}:00`;
            if (hourIndex[key] !== undefined) indices.push(hourIndex[key]);
        }
        return indices;
    };
    const maxOf = (arr, idx) => {
        const vals = idx.map((i) => arr[i]).filter((v) => v != null);
        return vals.length ? Math.max(...vals) : null;
    };
    const minOf = (arr, idx) => {
        const vals = idx.map((i) => arr[i]).filter((v) => v != null);
        return vals.length ? Math.min(...vals) : null;
    };

    return daily.time.map((dateStr, i) => {
        const dayIdx = collect(dateStr, 6, 12);
        const nightIdx = collect(dateStr, 18, 12);

        const morningIdx = hourIndex[`${dateStr}T06:00`];
        const eveningIdx = hourIndex[`${dateStr}T18:00`];
        const morningP = morningIdx !== undefined ? hourly.pressure_msl[morningIdx] : null;
        const eveningP = eveningIdx !== undefined ? hourly.pressure_msl[eveningIdx] : null;
        let pressure = null;
        if (morningP != null) {
            const value = morningP * HPA_TO_INHG;
            let trend = null;
            if (eveningP != null) {
                const diff = (eveningP - morningP) * HPA_TO_INHG;
                trend = diff > 0.03 ? 'rising' : diff < -0.03 ? 'falling' : 'steady';
            }
            pressure = { value, trend };
        }

        return {
            date: dateStr,
            code: daily.weather_code[i],
            high: daily.temperature_2m_max[i],
            low: daily.temperature_2m_min[i],
            precip: daily.precipitation_probability_max[i],
            windSpeed: daily.wind_speed_10m_max[i],
            windGusts: daily.wind_gusts_10m_max[i],
            windDir: daily.wind_direction_10m_dominant[i],
            sunrise: daily.sunrise[i],
            sunset: daily.sunset[i],
            pressure,
            day: {
                code: maxOf(hourly.weather_code, dayIdx) ?? daily.weather_code[i],
                temp: daily.temperature_2m_max[i],
                precip: maxOf(hourly.precipitation_probability, dayIdx)
            },
            night: {
                code: maxOf(hourly.weather_code, nightIdx) ?? daily.weather_code[i],
                temp: nightIdx.length ? minOf(hourly.temperature_2m, nightIdx) : daily.temperature_2m_min[i],
                precip: maxOf(hourly.precipitation_probability, nightIdx)
            }
        };
    });
};

const fmtTemp = (v) => (v == null ? '—' : `${Math.round(v)}°`);
const fmtPct = (v) => (v == null ? '—' : `${Math.round(v)}%`);

const WeatherWidget = () => {
    const [locationKey, setLocationKey] = useState(null);
    const [forecast, setForecast] = useState([]);
    const [expandedDate, setExpandedDate] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadLocation = async () => {
            let saved = null;
            try {
                saved = await window.fishingApi.getSetting(SETTING_KEY);
            } catch (err) {
                console.error('Error loading weather location:', err);
            }
            setLocationKey(LOCATIONS[saved] ? saved : DEFAULT_LOCATION);
        };
        loadLocation();
    }, []);

    const fetchWeather = async (key) => {
        const loc = LOCATIONS[key];
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
            latitude: loc.lat,
            longitude: loc.lon,
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,sunrise,sunset',
            hourly: 'temperature_2m,precipitation_probability,weather_code,pressure_msl',
            temperature_unit: 'fahrenheit',
            wind_speed_unit: 'mph',
            timezone: 'America/New_York',
            forecast_days: '10'
        });
        const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

        try {
            const response = await axios.get(url);
            if (response.data && response.data.daily) {
                setForecast(buildForecast(response.data));
            } else {
                setForecast([]);
                setError('No forecast data found.');
            }
        } catch (err) {
            console.error('Error fetching weather:', err);
            setError('Failed to connect to Open-Meteo.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (locationKey) fetchWeather(locationKey);
    }, [locationKey]);

    const handleLocationChange = (e) => {
        const key = e.target.value;
        setLocationKey(key);
        setExpandedDate(null);
        window.fishingApi.updateSetting(SETTING_KEY, key);
    };

    const toggleDay = (date) => {
        setExpandedDate((current) => (current === date ? null : date));
    };

    const formatDayLabel = (dateStr, index) => {
        const date = parseLocalDate(dateStr);
        const weekday = index === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
        return { weekday, date: `${date.getMonth() + 1}/${date.getDate()}` };
    };

    const renderHalf = (label, half, isDay) => {
        const { icon, text } = describeCode(half.code, isDay);
        return (
            <div className="weather-half">
                <span className="weather-half-label">{label}</span>
                <WeatherIcon type={icon} isDay={isDay} size={20} />
                <span className="weather-half-temp">{fmtTemp(half.temp)}</span>
                <span className="weather-half-desc">{text}</span>
                <span className="weather-precip">{fmtPct(half.precip)}</span>
            </div>
        );
    };

    const trendArrow = { rising: '↑', falling: '↓', steady: '→' };

    return (
        <div className="widget weather-widget" onClick={(e) => e.stopPropagation()}>
            <div className="widget-header">
                <h3>Weather</h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <select
                        className="weather-location-select"
                        value={locationKey || DEFAULT_LOCATION}
                        onChange={handleLocationChange}
                    >
                        {Object.entries(LOCATIONS).map(([key, loc]) => (
                            <option key={key} value={key}>{loc.name}</option>
                        ))}
                    </select>
                    <button className="widget-action" onClick={() => locationKey && fetchWeather(locationKey)} title="Refresh">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" style={{ width: '14px', height: '14px' }}>
                            <path d="M21 12a9 9 0 11-9-9c2.52 0 4.85.83 6.72 2.25L21 8m0-5v5h-5" />
                        </svg>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Fetching forecast...</p>
                </div>
            ) : error ? (
                <div className="error-container" style={{ padding: '20px 0', textAlign: 'center' }}>
                    <p className="error-text" style={{ marginBottom: '10px' }}>{error}</p>
                    <button className="btn-secondary" onClick={() => fetchWeather(locationKey)}>Retry</button>
                </div>
            ) : forecast.length > 0 ? (
                <div className="weather-list">
                    {forecast.map((day, index) => {
                        const label = formatDayLabel(day.date, index);
                        const { icon, text } = describeCode(day.code, true);
                        const isOpen = expandedDate === day.date;
                        return (
                            <div key={day.date} className={`weather-day ${isOpen ? 'open' : ''}`}>
                                <div className="weather-row" onClick={() => toggleDay(day.date)} title={text}>
                                    <div className="weather-date">
                                        <span className="weather-weekday">{label.weekday}</span>
                                        <span className="weather-md">{label.date}</span>
                                    </div>
                                    <WeatherIcon type={icon} />
                                    <span className="weather-temps">
                                        <span className="weather-high">{fmtTemp(day.high)}</span>
                                        <span className="weather-low"> / {fmtTemp(day.low)}</span>
                                    </span>
                                    <span className="weather-precip">{fmtPct(day.precip)}</span>
                                </div>
                                {isOpen && (
                                    <div className="weather-details">
                                        {renderHalf('Day', day.day, true)}
                                        {renderHalf('Night', day.night, false)}
                                        <div className="weather-stats">
                                            <div>
                                                <span className="weather-stat-label">Wind</span>
                                                <span>{Math.round(day.windSpeed)} mph {toCompass(day.windDir)}, gusts {Math.round(day.windGusts)}</span>
                                            </div>
                                            <div>
                                                <span className="weather-stat-label">Pressure</span>
                                                <span>
                                                    {day.pressure
                                                        ? `${day.pressure.value.toFixed(2)} inHg ${day.pressure.trend ? `${trendArrow[day.pressure.trend]} ${day.pressure.trend}` : ''}`
                                                        : '—'}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="weather-stat-label">Sun</span>
                                                <span>↑ {formatClock(day.sunrise)} · ↓ {formatClock(day.sunset)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="empty-text">No forecast available.</p>
            )}

            <p className="station-info">Open-Meteo · {LOCATIONS[locationKey || DEFAULT_LOCATION].name}</p>
        </div>
    );
};

export default WeatherWidget;
