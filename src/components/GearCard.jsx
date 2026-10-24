import React from 'react';
import GearImage, { gearImageSrc } from './GearImage';

const CATEGORIES = {
    RODS: 'Rods',
    REELS: 'Reels',
    LURES: 'Lures',
    LINE: 'Fishing Line',
    TERMINAL: 'Terminal Tackle'
};

const GearCard = ({ item, onImageClick, onTitleClick, onEdit, onDelete }) => {
    return (
        <div className="gear-card refined">
            <GearImage
                item={item}
                className="card-image"
                onClick={() => onImageClick(gearImageSrc(item))}
            />
            <div className="card-content">
                <div className="card-header">
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span className="brand-tag">{item.brand}</span>
                        {item.count > 1 && <span className="count-badge">×{item.count}</span>}
                    </div>
                    <h4 onClick={() => onTitleClick(item)} style={{ cursor: 'pointer' }} className="card-title-link">{item.model}</h4>
                </div>
                <div className="card-specs">
                    {item.category === CATEGORIES.RODS && (
                        <p><span>{item.type}</span> <span>{item.length}</span> <span>{item.power}</span> <span>{item.action}</span></p>
                    )}
                    {item.category === CATEGORIES.REELS && (
                        <p><span>{item.type}</span> <span>{item.size}</span> <span>{item.gear_ratio}</span></p>
                    )}
                    {item.category === CATEGORIES.LURES && (
                        <p><span>{item.lure_type}</span> <span>{item.length}</span> <span>{item.weight}oz</span> <span>{item.color}</span></p>
                    )}
                    {item.category === CATEGORIES.LINE && (
                        <p><span>{item.line_type}</span> <span>{item.test}lb</span> <span>{item.color}</span></p>
                    )}
                    {item.category === CATEGORIES.TERMINAL && (
                        <p>
                            <span>{item.terminal_type}</span> {item.sub_type && <span>({item.sub_type})</span>}
                            {item.terminal_size && <span>Size: {item.terminal_size}</span>}
                            {item.terminal_weight && <span>{item.terminal_weight}</span>}
                        </p>
                    )}
                </div>
                <p className="description">
                    {(() => {
                        if (!item.description) return '';
                        const firstPara = item.description.split('\n')[0];
                        return firstPara.length > 150 ? firstPara.substring(0, 150).trim() + '...' : firstPara;
                    })()}
                </p>
                <div className="card-actions">
                    {item.url && (
                        <a href={item.url} target="_blank" className="btn-link" title="Open Product Page">
                            <svg viewBox="0 -960 960 960" fill="currentColor" className="action-icon">
                                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h560v-280h80v280q0 33-23.5 56.5T760-120H200Zm188-212-56-56 372-372H560v-80h280v280h-80v-144L388-332Z" />
                            </svg>
                        </a>
                    )}
                    <button className="btn-edit" onClick={() => onEdit(item)} title="Edit">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                    </button>
                    <button className="btn-delete" onClick={() => onDelete(item.id)} title="Delete">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GearCard;
