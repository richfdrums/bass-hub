import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LOCATIONS, DEFAULT_LOCATION, toCompass, formatClock, HPA_TO_INHG } from './WeatherWidget';
import { tidePredictionsUrl } from './TideWidget';

const trendArrow = { rising: '↑', falling: '↓', steady: '→' };

// "11:20 PM" -> ["11:20", "PM"]
const splitClock = (text) => {
    const [time, meridiem = ''] = text.split(' ');
    return [time, meridiem];
};

const ymd = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
};

/**
 * Instrument-style readouts across the top of the Dashboard: current air,
 * wind, pressure trend, the next tide and sunset. Weather follows the location
 * picked in the weather widget; tides are the Port Royal station.
 */
const ConditionsStrip = ({ locationKey }) => {
    const [weather, setWeather] = useState(null);
    const [nextTide, setNextTide] = useState(null);

    useEffect(() => {
        // Wait for the weather widget to report its saved location
        if (!locationKey) return;
        const loc = LOCATIONS[locationKey] || LOCATIONS[DEFAULT_LOCATION];
        const params = new URLSearchParams({
            latitude: loc.lat,
            longitude: loc.lon,
            current: 'temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,pressure_msl',
            hourly: 'pressure_msl',
            daily: 'sunset',
            past_hours: '3',
            forecast_hours: '1',
            forecast_days: '1',
            temperature_unit: 'fahrenheit',
            wind_speed_unit: 'mph',
            timezone: 'America/New_York'
        });

        let cancelled = false;
        axios.get(`https://api.open-meteo.com/v1/forecast?${params.toString()}`)
            .then(({ data }) => {
                if (cancelled || !data.current) return;
                const { current, hourly, daily } = data;
                // Same threshold as the forecast's day trend, over the last 3 hours
                const before = hourly?.pressure_msl?.[0];
                let trend = null;
                if (before != null && current.pressure_msl != null) {
                    const diff = (current.pressure_msl - before) * HPA_TO_INHG;
                    trend = diff > 0.03 ? 'rising' : diff < -0.03 ? 'falling' : 'steady';
                }
                setWeather({
                    temp: current.temperature_2m,
                    windSpeed: current.wind_speed_10m,
                    windDir: current.wind_direction_10m,
                    gusts: current.wind_gusts_10m,
                    pressure: current.pressure_msl != null ? current.pressure_msl * HPA_TO_INHG : null,
                    trend,
                    sunset: daily?.sunset?.[0]
                });
            })
            .catch((err) => console.error('Error fetching current conditions:', err));

        return () => { cancelled = true; };
    }, [locationKey]);

    useEffect(() => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        let cancelled = false;
        axios.get(tidePredictionsUrl(ymd(today), ymd(tomorrow), 'hilo'))
            .then(({ data }) => {
                if (cancelled) return;
                const now = Date.now();
                const next = (data.predictions || []).find((p) => new Date(p.t.replace(' ', 'T')).getTime() > now);
                setNextTide(next || null);
            })
            .catch((err) => console.error('Error fetching next tide:', err));

        return () => { cancelled = true; };
    }, []);

    const cells = [
        { label: 'AIR', value: weather ? Math.round(weather.temp) : '—', unit: '°F' },
        {
            label: 'WIND',
            value: weather ? `${toCompass(weather.windDir)} ${Math.round(weather.windSpeed)}` : '—',
            unit: weather && weather.gusts != null ? `G${Math.round(weather.gusts)} MPH` : 'MPH'
        },
        {
            label: 'BARO',
            value: weather?.pressure != null ? weather.pressure.toFixed(2) : '—',
            unit: `IN ${weather?.trend ? trendArrow[weather.trend] : ''}`
        }
    ];

    if (nextTide) {
        const time = new Date(nextTide.t.replace(' ', 'T')).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const [clock, meridiem] = splitClock(time);
        cells.push({
            label: 'NEXT TIDE',
            value: `${nextTide.type === 'H' ? 'H' : 'L'} ${clock}${meridiem.charAt(0)}`,
            unit: `${parseFloat(nextTide.v).toFixed(1)} FT`
        });
    } else {
        cells.push({ label: 'NEXT TIDE', value: '—', unit: '' });
    }

    const [sunsetClock, sunsetMeridiem] = weather?.sunset ? splitClock(formatClock(weather.sunset)) : ['—', ''];
    cells.push({ label: 'SUNSET', value: sunsetClock, unit: sunsetMeridiem });

    return (
        <section className="conditions-strip" aria-label="Current conditions">
            {cells.map((cell) => (
                <div key={cell.label} className="condition">
                    <span className="condition-label">{cell.label}</span>
                    <span className="condition-value">
                        {cell.value} <span className="condition-unit">{cell.unit}</span>
                    </span>
                </div>
            ))}
        </section>
    );
};

export default ConditionsStrip;
