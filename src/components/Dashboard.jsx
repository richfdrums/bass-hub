import React, { useState, useEffect } from 'react';
import TideWidget from './TideWidget';
import WeatherWidget from './WeatherWidget';

const Dashboard = ({ setActiveTab, navigateToSmartAdd, navigateToTripDetail }) => {
    const [stats, setStats] = useState({ gearCount: 0, tripCount: 0, linkCount: 0 });
    const [nextTrip, setNextTrip] = useState(null);
    const [daysUntil, setDaysUntil] = useState(null);

    useEffect(() => {
        const loadStats = async () => {
            const gear = await window.fishingApi.getGear();
            const trips = await window.fishingApi.getTrips();
            const links = await window.fishingApi.getLinks();

            setStats({
                gearCount: gear.length,
                tripCount: trips.length,
                linkCount: links.length
            });

            // Calculate next trip logic
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const getLocalDate = (dateStr) => {
                const [y, m, d] = dateStr.split('-').map(Number);
                return new Date(y, m - 1, d);
            };

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

    return (
        <div className="dashboard">
            <div className="grid">
                <div className="widget" onClick={() => setActiveTab('gear')}>
                    <div className="widget-header">
                        <h3>Gear Catalog</h3>
                        <button
                            className="widget-action"
                            onClick={(e) => { e.stopPropagation(); navigateToSmartAdd(); }}
                        >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="btn-icon">
                                <path d="M12 4v16m8-8H4" />
                            </svg>
                            Add
                        </button>
                    </div>
                    <p className="big-number">{stats.gearCount}</p>
                    <p>items in your inventory</p>
                </div>
                <div className="widget" onClick={handleTripsClick}>
                    <h3>Fishing Trips</h3>
                    <p className="big-number">{nextTrip ? daysUntil : stats.tripCount}</p>
                    <p>{nextTrip ? `${daysUntil === 1 ? 'day' : 'days'} until the next adventure` : 'logged adventures'}</p>
                </div>
                <div className="widget" onClick={() => setActiveTab('links')}>
                    <h3>Quick Links</h3>
                    <p className="big-number">{stats.linkCount}</p>
                    <p>useful resources saved</p>
                </div>
                <TideWidget />
                <WeatherWidget />
            </div>
        </div>
    );
};

export default Dashboard;
