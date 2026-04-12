import React, { useState } from 'react';
import { Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import PlaceAutocomplete from './PlaceAutocomplete';
import MapHandler from './MapHandler';

const TripForm = ({
    newTrip,
    setNewTrip,
    tempLink,
    setTempLink,
    selectedPlace,
    setSelectedPlace,
    markerPosition,
    setMarkerPosition,
    onSubmit,
    onCancel,
    editingId,
    mapsApiKey
}) => {
    const defaultCenter = { lat: 39.8283, lng: -98.5795 };

    const addLink = () => {
        if (!tempLink) return;
        setNewTrip(prev => ({
            ...prev,
            links: [...(prev.links || []), tempLink]
        }));
        setTempLink('');
    };

    const removeLink = (index) => {
        setNewTrip(prev => ({
            ...prev,
            links: prev.links.filter((_, i) => i !== index)
        }));
    };

    const onPlaceSelect = (place) => {
        setSelectedPlace(place);

        const locationName = place.name || place.formatted_address || '';
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();

        if (lat && lng) {
            setMarkerPosition({ lat, lng });
            setNewTrip(prev => ({
                ...prev,
                location: locationName,
                lat: lat,
                lng: lng
            }));
        } else {
            setNewTrip(prev => ({
                ...prev,
                location: locationName
            }));
        }
    };

    const handleMapClick = (ev) => {
        const { latLng } = ev.detail;
        if (latLng) {
            const lat = latLng.lat;
            const lng = latLng.lng;
            setMarkerPosition({ lat, lng });
            setNewTrip(prev => ({ ...prev, lat, lng }));
        }
    };

    const mapCenter = markerPosition || defaultCenter;

    return (
        <form onSubmit={onSubmit}>
            <div className="form-cols" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div className="map-search-section">
                        <label className="label" style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
                            Map Address/Query String:
                        </label>
                        <input
                            placeholder="e.g. Lake Casitas, CA"
                            value={newTrip.map_query || ''}
                            onChange={e => setNewTrip({ ...newTrip, map_query: e.target.value })}
                            style={{ width: '100%' }}
                        />
                    </div>

                    <div className="map-container" style={{ height: '250px', width: '100%', borderRadius: '8px', overflow: 'hidden', marginTop: '10px', border: '1px solid var(--border)', background: '#111' }}>
                        {mapsApiKey && newTrip.map_query ? (
                            <iframe
                                width="100%"
                                height="100%"
                                style={{ border: 0 }}
                                loading="lazy"
                                allowFullScreen
                                referrerPolicy="no-referrer-when-downgrade"
                                src={`https://www.google.com/maps/embed/v1/place?key=${mapsApiKey}&q=${encodeURIComponent(newTrip.map_query)}`}
                            ></iframe>
                        ) : (
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: '40px', height: '40px', marginBottom: '10px', opacity: 0.5 }}>
                                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <p style={{ fontSize: '0.85rem' }}>Map Preview Unavailable</p>
                                <p style={{ fontSize: '0.75rem', marginTop: '5px' }}>Enter an address query and ensure your API key is configured.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="trip-details-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <input
                        placeholder="Location Name"
                        value={newTrip.location}
                        onChange={e => setNewTrip({ ...newTrip, location: e.target.value })}
                        required
                        style={{ width: '100%' }}
                    />

                    <div className="date-row" style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Start Date</label>
                            <input
                                type="date"
                                value={newTrip.start_date}
                                onChange={e => setNewTrip({ ...newTrip, start_date: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>End Date</label>
                            <input
                                type="date"
                                value={newTrip.end_date}
                                onChange={e => setNewTrip({ ...newTrip, end_date: e.target.value })}
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <div style={{ position: 'relative' }}>
                            <span className="prefix" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }}>$</span>
                            <input
                                type="number"
                                placeholder="Total Cost"
                                value={newTrip.total_cost}
                                onChange={e => setNewTrip({ ...newTrip, total_cost: parseFloat(e.target.value) || 0 })}
                                style={{ width: '100%', paddingLeft: '25px' }}
                            />
                        </div>
                    </div>

                    <textarea
                        placeholder="Trip Notes & Memories..."
                        value={newTrip.notes}
                        onChange={e => setNewTrip({ ...newTrip, notes: e.target.value })}
                        style={{ flex: 1, minHeight: '100px', resize: 'vertical' }}
                    />

                    <div className="links-section">
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '4px', display: 'block' }}>Related Links</label>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                            <input
                                placeholder="https://..."
                                value={tempLink}
                                onChange={e => setTempLink(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addLink())}
                                style={{ flex: 1 }}
                            />
                            <button type="button" onClick={addLink} className="btn-secondary" style={{ padding: '8px 12px' }}>Add</button>
                        </div>
                        <div className="links-list" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {newTrip.links && newTrip.links.map((link, idx) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '6px 10px', borderRadius: '4px', fontSize: '0.85rem' }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>{link}</span>
                                    <button type="button" onClick={() => removeLink(idx)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: '1' }}>&times;</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="btn-icon">
                        <path d="M5 13l4 4L19 7" />
                    </svg>
                    {editingId ? 'Update Trip' : 'Save Trip'}
                </button>
            </div>
        </form>
    );
};

export default TripForm;
