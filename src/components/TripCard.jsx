import React from 'react';

const TripCard = ({ trip, onTitleClick, onEdit, onDelete }) => {
    return (
        <div className="gear-card refined">
            <div className="card-content">
                <div className="card-header">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="brand-tag">{trip.start_date}</span>
                        {trip.end_date && <span className="brand-tag">to {trip.end_date}</span>}
                    </div>
                    <h4 onClick={() => onTitleClick(trip)} style={{ cursor: 'pointer' }} className="card-title-link">{trip.location}</h4>
                </div>
                <div className="card-specs">
                    {(trip.map_query || trip.lat) && (
                        <p style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <a
                                href={trip.map_query 
                                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(trip.map_query)}` 
                                    : `https://www.google.com/maps/search/?api=1&query=${trip.lat},${trip.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}
                                title={trip.map_query || `${trip.lat}, ${trip.lng}`}
                            >
                                📍 {trip.map_query ? trip.map_query : `${trip.lat.toFixed(4)}, ${trip.lng.toFixed(4)}`}
                            </a>
                        </p>
                    )}
                    {trip.total_cost > 0 && <p className="cost-pill" style={{ color: 'var(--text-dim)', fontSize: '0.85rem' }}>${trip.total_cost.toFixed(2)}</p>}
                </div>
                <p className="description">{trip.notes}</p>
                <div className="card-actions">
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
        </div>
    );
};

export default TripCard;
