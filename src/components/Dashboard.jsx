import React, { useState, useEffect } from 'react';
import TideWidget from './TideWidget';
import WeatherWidget from './WeatherWidget';
import ConditionsStrip from './ConditionsStrip';

const getLocalDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
};

const Dashboard = ({ setActiveTab, navigateToSmartAdd, navigateToTripDetail }) => {
    const [stats, setStats] = useState({ ownedCount: 0, wishlistCount: 0, tripCount: 0, linkCount: 0 });
    const [nextTrip, setNextTrip] = useState(null);
    const [daysUntil, setDaysUntil] = useState(null);
    const [weatherLocation, setWeatherLocation] = useState(null);

    useEffect(() => {
        const loadStats = async () => {
            const gear = await window.fishingApi.getGear();
            const trips = await window.fishingApi.getTrips();
            const links = await window.fishingApi.getLinks();

            setStats({
                ownedCount: gear.filter(g => !g.is_wishlist).length,
                wishlistCount: gear.filter(g => g.is_wishlist).length,
                tripCount: trips.length,
                linkCount: links.length
            });

            // Calculate next trip logic
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const futureTrips = trips
                .filter(t => t.start_date && getLocalDate(t.start_date) >= today)
                .sort((a, b) => getLocalDate(a.start_date) - getLocalDate(b.start_date));

            if (futureTrips.length > 0) {
                const next = futureTrips[0];
                const tripDate = getLocalDate(next.start_date);
                const diffTime = tripDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                setNextTrip(next);
                setDaysUntil(diffDays);
            } else {
                setNextTrip(null);
                setDaysUntil(null);
            }
        };
        loadStats();
    }, []);

    const handleTripsClick = () => {
        if (nextTrip) {
            navigateToTripDetail(nextTrip.id);
        } else {
            setActiveTab('trips');
        }
    };

    const todayLabel = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
    const nextTripDate = nextTrip
        ? getLocalDate(nextTrip.start_date).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
        : null;

    return (
        <div className="dashboard">
            <div className="view-header">
                <div className="view-title">
                    <span className="view-eyebrow">{todayLabel}</span>
                    <h1>Dashboard</h1>
                </div>
                <button className="btn-outline" onClick={navigateToSmartAdd}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="btn-icon">
                        <path d="M12 4v16m8-8H4" />
                    </svg>
                    Smart Add
                </button>
            </div>

            <ConditionsStrip locationKey={weatherLocation} />

            <section className="stat-row">
                <div className="widget stat-tile" onClick={() => setActiveTab('gear')}>
                    <span className="stat-label">Gear owned</span>
                    <p className="big-number">{stats.ownedCount}</p>
                    <span className="stat-sub">{stats.wishlistCount} on the wishlist</span>
                </div>
                <div className="widget stat-tile" onClick={handleTripsClick}>
                    <span className="stat-label">{nextTrip ? 'Next trip' : 'Fishing trips'}</span>
                    {nextTrip ? (
                        <p className="big-number accent">
                            {daysUntil === 0 ? 'Today' : daysUntil}
                            {daysUntil > 0 && <span className="stat-unit">{daysUntil === 1 ? 'day' : 'days'}</span>}
                        </p>
                    ) : (
                        <p className="big-number">{stats.tripCount}</p>
                    )}
                    <span className="stat-sub">{nextTrip ? `${nextTrip.location} · ${nextTripDate}` : 'logged adventures'}</span>
                </div>
                <div className="widget stat-tile" onClick={() => setActiveTab('links')}>
                    <span className="stat-label">Quick links</span>
                    <p className="big-number">{stats.linkCount}</p>
                    <span className="stat-sub">saved resources</span>
                </div>
            </section>

            <section className="dashboard-panels">
                <WeatherWidget onLocationChange={setWeatherLocation} />
                <TideWidget />
            </section>
        </div>
    );
};

export default Dashboard;
