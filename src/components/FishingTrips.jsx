import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import TripCard from './TripCard';
import TripForm from './TripForm';

const TripDetail = ({ trip, onBack, onEdit, onDelete, apiKey }) => {
    return (
        <div className="gear-detail-view">
            <button className="btn-back" onClick={onBack}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Trips
            </button>

            <article className="gear-article">
                <header className="article-header">
                    <div className="article-meta">
                        <span className="brand-pill">{trip.start_date}</span>
                        {trip.end_date && <span className="brand-pill">to {trip.end_date}</span>}
                        {trip.total_cost > 0 && <span className="category-pill" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderColor: 'rgba(16, 185, 129, 0.2)' }}>${trip.total_cost.toFixed(2)}</span>}
                    </div>
                    <h1 className="article-title">{trip.location}</h1>
                </header>

                <div className="article-content">
                    {(trip.map_query || (trip.lat && trip.lng)) && (
                        <div className="article-image" style={{ height: '400px', position: 'relative', background: '#111' }}>
                            {apiKey ? (
                                <iframe
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    loading="lazy"
                                    allowFullScreen
                                    referrerPolicy="no-referrer-when-downgrade"
                                    src={trip.map_query 
                                        ? `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodeURIComponent(trip.map_query)}` 
                                        : `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${trip.lat},${trip.lng}&zoom=14`}
                                ></iframe>
                            ) : (
                                <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center', color: 'var(--text-dim)', background: 'rgba(255,255,255,0.02)' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ width: '64px', height: '64px', marginBottom: '15px', opacity: 0.3 }}>
                                        <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                        <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <h3>Map Unavailable</h3>
                                    <p style={{ maxWidth: '300px', fontSize: '0.9rem', marginTop: '10px' }}>Please configure your Google Maps API Key in Settings to view trip locations on the map.</p>
                                </div>
                            )}
                        </div>
                    )}

                    <section className="article-specs">
                        <h3>Location Details</h3>
                        <div className="specs-grid">
                            {trip.map_query ? (
                                <div className="spec-item" style={{ gridColumn: '1 / -1' }}><span>{trip.map_query}</span></div>
                            ) : trip.lat && trip.lng ? (
                                <>
                                    <div className="spec-item"><label>Latitude</label><span>{trip.lat?.toFixed(6)}</span></div>
                                    <div className="spec-item"><label>Longitude</label><span>{trip.lng?.toFixed(6)}</span></div>
                                </>
                            ) : (
                                <div className="spec-item" style={{ gridColumn: '1 / -1' }}><label>Status</label><span>No detailed location data</span></div>
                            )}
                        </div>
                    </section>

                    {trip.notes && (
                        <section className="article-body">
                            <h3>Journal / Notes</h3>
                            <p>{trip.notes}</p>
                        </section>
                    )}

                    {trip.links && trip.links.length > 0 && (
                        <section className="article-specs">
                            <h3>Related Links</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {trip.links.map((link, i) => (
                                    <a key={i} href={link} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                                            <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        {link}
                                    </a>
                                ))}
                            </div>
                        </section>
                    )}

                    <div className="article-actions">
                        {trip.lat && (
                            <a href={`https://www.google.com/maps/search/?api=1&query=${trip.lat},${trip.lng}`} target="_blank" rel="noopener noreferrer" className="btn-link" title="Open in Google Maps">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </a>
                        )}
                        <button className="btn-edit" onClick={() => onEdit(trip)} title="Edit">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button className="btn-delete" onClick={() => onDelete(trip.id)} title="Delete">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                </div>
            </article>
        </div>
    );
};

const FishingTrips = ({ selectedTripId, onTripSelectionHandled, mapsApiKey }) => {
    const [trips, setTrips] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [selectedTrip, setSelectedTrip] = useState(null);
    const [tempLink, setTempLink] = useState('');

    const [newTrip, setNewTrip] = useState({
        location: '',
        start_date: '',
        end_date: '',
        notes: '',
        total_cost: 0,
        lat: null,
        lng: null,
        links: [],
        map_query: ''
    });


    const loadTrips = async () => {
        const data = await window.fishingApi.getTrips();
        setTrips(data);
    };

    useEffect(() => {
        loadTrips();
    }, []);

    useEffect(() => {
        if (selectedTripId && trips.length > 0) {
            const trip = trips.find(t => t.id === parseInt(selectedTripId));
            if (trip) {
                setSelectedTrip(trip);
                onTripSelectionHandled();
            }
        }
    }, [selectedTripId, trips, onTripSelectionHandled]);

    const handleAdd = async (e) => {
        e.preventDefault();

        if (editingId) {
            await window.fishingApi.updateTrip(editingId, newTrip);
            if (selectedTrip && selectedTrip.id === editingId) {
                setSelectedTrip({ ...selectedTrip, ...newTrip });
            }
        } else {
            await window.fishingApi.addTrip(newTrip);
        }

        // Reset form
        setNewTrip({ location: '', start_date: '', end_date: '', notes: '', total_cost: 0, lat: null, lng: null, links: [], map_query: '' });
        setTempLink('');
        setEditingId(null);
        setShowAddForm(false);
        loadTrips();
    };

    const handleEdit = (trip) => {
        setEditingId(trip.id);
        setNewTrip({
            location: trip.location,
            start_date: trip.start_date,
            end_date: trip.end_date,
            notes: trip.notes,
            total_cost: trip.total_cost,
            lat: trip.lat,
            lng: trip.lng,
            links: trip.links || [],
            map_query: trip.map_query || ''
        });

        setSelectedTrip(null);
        setShowAddForm(true);
    };

    const openNewTripForm = () => {
        setEditingId(null);
        setNewTrip({ location: '', start_date: '', end_date: '', notes: '', total_cost: 0, lat: null, lng: null, links: [], map_query: '' });
        setTempLink('');
        setShowAddForm(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this trip?')) {
            await window.fishingApi.deleteTrip(id);
            setSelectedTrip(null);
            loadTrips();
        }
    };

    if (selectedTrip) {
        return (
            <TripDetail
                trip={selectedTrip}
                onBack={() => setSelectedTrip(null)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                apiKey={mapsApiKey}
            />
        );
    }

    return (
        <div className="fishing-trips">
            <div className="view-header">
                <h1>Fishing Trips</h1>
                <button className="btn-primary" onClick={openNewTripForm}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="btn-icon">
                        <path d="M12 4v16m8-8H4" />
                    </svg>
                    Plan/Log Trip
                </button>
            </div>

            <Modal
                isOpen={showAddForm}
                onClose={() => setShowAddForm(false)}
                title={editingId ? 'Edit Trip' : 'New Trip'}
                size="large"
            >
                <TripForm
                    newTrip={newTrip}
                    setNewTrip={setNewTrip}
                    tempLink={tempLink}
                    setTempLink={setTempLink}
                    onSubmit={handleAdd}
                    onCancel={() => setShowAddForm(false)}
                    editingId={editingId}
                    mapsApiKey={mapsApiKey}
                />
            </Modal>

            <div className="trip-list">
                {trips.length === 0 ? (
                    <p className="empty-state">No trips recorded yet. Ready to go fishing?</p>
                ) : (
                    <div className="trip-grid">
                        {trips.map(trip => (
                            <TripCard
                                key={trip.id}
                                trip={trip}
                                onTitleClick={setSelectedTrip}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FishingTrips;
