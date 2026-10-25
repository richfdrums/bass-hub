import React, { useRef } from 'react';
import { gearImageSrc } from './GearImage';

const CATEGORIES = {
    RODS: 'Rods',
    REELS: 'Reels',
    LURES: 'Lures',
    LINE: 'Fishing Line',
    TERMINAL: 'Terminal Tackle'
};

const LURE_TYPES = ['Worm', 'Frog', 'Creature', 'Stickbait', 'Soft Jerkbait', 'Hard Jerkbait', 'Glide Bait', 'Crankbait', 'Topwater', 'Buzzbait', 'Spinnerbait', 'Swimbait', 'Jig'];
const LINE_TYPES = ['Monofilament', 'Flourocarbon', 'Braid', 'Copolymer'];
const REEL_TYPES = ['Baitcast', 'Spinning'];
const ROD_TYPES = ['Casting', 'Spinning'];
const TERMINAL_TYPES = ['Hook', 'Weight', 'Jighead'];
const HOOK_SUBTYPES = ['EWG', 'Offset', 'Straight Shank', 'Dropshot'];
const WEIGHT_SUBTYPES = ['Worm / Flipping', 'Dropshot'];

const GearForm = ({
    formData,
    setFormData,
    activeCategory,
    onCategoryChange,
    dragActive,
    handleDrag,
    handleDrop,
    handleFile,
    isExtracting,
    extractError,
    isUrlPasted,
    processUrl,
    onRefreshImage,
    isRefreshingImage,
    imageRefreshError,
    onSubmit,
    onCancel,
    editingId
}) => {
    const fileInputRef = useRef(null);

    const statusToggle = (
        <div className="list-toggle-group" style={{ marginTop: 0, marginBottom: '15px' }}>
            <label>Inventory Status</label>
            <div className="segmented-control">
                <button
                    type="button"
                    className={formData.is_wishlist ? '' : 'active'}
                    onClick={() => setFormData({ ...formData, is_wishlist: 0 })}
                >
                    Owned
                </button>
                <button
                    type="button"
                    className={formData.is_wishlist ? 'active' : ''}
                    onClick={() => setFormData({ ...formData, is_wishlist: 1 })}
                >
                    Wishlist
                </button>
            </div>
        </div>
    );

    const commonFields = (
        <>
            {statusToggle}
            <input placeholder="Brand" value={formData.brand || ''} onChange={e => setFormData({ ...formData, brand: e.target.value })} />
            <input placeholder="Model/Name" value={formData.model || ''} onChange={e => setFormData({ ...formData, model: e.target.value })} />
            <input
                type="number"
                placeholder="Count"
                min="1"
                value={formData.count || 1}
                onChange={e => setFormData({ ...formData, count: parseInt(e.target.value) || 1 })}
            />
        </>
    );

    const imageUpload = (
        <div
            className={`image-upload-zone ${dragActive ? 'active' : ''} ${formData.image_path || formData.image_url ? 'has-image' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current.click()}
        >
            <input
                ref={fileInputRef}
                type="file"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
                accept="image/*"
            />
            {gearImageSrc(formData) ? (
                <div className="preview-container">
                    <img src={gearImageSrc(formData)} alt="Preview" />
                    <button type="button" className="remove-img" onClick={(e) => { e.stopPropagation(); setFormData({ ...formData, image_path: null, image_url: null }) }}>×</button>
                </div>
            ) : (
                <div className="upload-placeholder">
                    <svg className="camera-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                        <path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                </div>
            )}
        </div>
    );

    // Backfills image_url from the product page — the fix for gear imported
    // from the Mac, whose image_path points at a file this device cannot read.
    const canRefreshImage = /^https?:\/\//i.test(formData.url || '');

    const imageRefresh = canRefreshImage ? (
        <div className="image-refresh">
            <button
                type="button"
                className="btn-refresh-image"
                onClick={onRefreshImage}
                disabled={isRefreshingImage || isExtracting}
            >
                {isRefreshingImage ? (
                    <span className="spinner" />
                ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                )}
                {isRefreshingImage ? 'Refreshing image…' : 'Refresh image from product URL'}
            </button>
            {imageRefreshError && <p className="error-text">{imageRefreshError}</p>}
        </div>
    ) : null;

    const description = (
        <textarea placeholder="Description" value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
    );

    const urlField = (
        <div className="url-input-wrapper">
            <input
                placeholder="Product URL"
                value={formData.url || ''}
                onChange={e => setFormData({ ...formData, url: e.target.value })}
                onKeyDown={e => {
                    if (e.key === 'Enter' && isUrlPasted) {
                        e.preventDefault();
                        processUrl(formData.url);
                    }
                }}
            />
            {!isExtracting && isUrlPasted && (
                <div className="smart-extract-callout animated" onClick={() => processUrl(formData.url)}>
                    <span>✨ Smart Extract details from this URL?</span>
                    <button type="button" className="btn-text">Extract</button>
                </div>
            )}
            {isExtracting && (
                <div className="smart-extract-callout extraction-active">
                    <div className="extraction-loader">
                        <div className="spinner"></div>
                        <span>Extracting details...</span>
                    </div>
                </div>
            )}
            {extractError && <p className="error-text">{extractError}</p>}
        </div>
    );

    const colorField = (
        <input placeholder="Color" value={formData.color || ''} onChange={e => setFormData({ ...formData, color: e.target.value })} />
    );

    let categoryFields = null;

    switch (activeCategory) {
        case CATEGORIES.RODS:
            categoryFields = (
                <>
                    <select value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                        <option value="">Select Rod Type</option>
                        {ROD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {commonFields}
                    <div className="row">
                        <input placeholder={`Length (e.g. 7'0")`} value={formData.length || ''} onChange={e => setFormData({ ...formData, length: e.target.value })} />
                        <input placeholder="Power" value={formData.power || ''} onChange={e => setFormData({ ...formData, power: e.target.value })} />
                        <input placeholder="Action" value={formData.action || ''} onChange={e => setFormData({ ...formData, action: e.target.value })} />
                    </div>
                    {description}
                </>
            );
            break;
        case CATEGORIES.REELS:
            categoryFields = (
                <>
                    <select value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                        <option value="">Select Reel Type</option>
                        {REEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {commonFields}
                    <div className="row">
                        <input placeholder="Size" value={formData.size || ''} onChange={e => setFormData({ ...formData, size: e.target.value })} />
                        <input placeholder="Gear Ratio" value={formData.gear_ratio || ''} onChange={e => setFormData({ ...formData, gear_ratio: e.target.value })} />
                    </div>
                    {description}
                </>
            );
            break;
        case CATEGORIES.LURES:
            categoryFields = (
                <>
                    <select value={formData.lure_type || ''} onChange={e => setFormData({ ...formData, lure_type: e.target.value })}>
                        <option value="">Select Lure Type</option>
                        {LURE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {commonFields}
                    <div className="row">
                        <input placeholder="Length" value={formData.length || ''} onChange={e => setFormData({ ...formData, length: e.target.value })} />
                        <input placeholder="Weight" value={formData.weight || ''} onChange={e => setFormData({ ...formData, weight: e.target.value })} />
                        {colorField}
                    </div>
                    {description}
                </>
            );
            break;
        case CATEGORIES.LINE:
            categoryFields = (
                <>
                    <select value={formData.line_type || ''} onChange={e => setFormData({ ...formData, line_type: e.target.value })}>
                        <option value="">Select Line Type</option>
                        {LINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {commonFields}
                    <div className="row">
                        <input placeholder="Test (lb)" value={formData.test || ''} onChange={e => setFormData({ ...formData, test: e.target.value })} />
                        <input placeholder="Spool Size" value={formData.spool_size || ''} onChange={e => setFormData({ ...formData, spool_size: e.target.value })} />
                        {colorField}
                    </div>
                    {description}
                </>
            );
            break;
        case CATEGORIES.TERMINAL:
            categoryFields = (
                <>
                    <select value={formData.terminal_type || ''} onChange={e => setFormData({ ...formData, terminal_type: e.target.value, sub_type: '', terminal_size: '', terminal_weight: '' })}>
                        <option value="">Select Terminal Type</option>
                        {TERMINAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {formData.terminal_type === 'Hook' && (
                        <select value={formData.sub_type || ''} onChange={e => setFormData({ ...formData, sub_type: e.target.value })}>
                            <option value="">Select Hook Type</option>
                            {HOOK_SUBTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                    {formData.terminal_type === 'Weight' && (
                        <select value={formData.sub_type || ''} onChange={e => setFormData({ ...formData, sub_type: e.target.value })}>
                            <option value="">Select Weight Type</option>
                            {WEIGHT_SUBTYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    )}
                    {commonFields}
                    <div className="row">
                        <input placeholder="Size" value={formData.terminal_size || ''} onChange={e => setFormData({ ...formData, terminal_size: e.target.value })} />
                        <input placeholder="Weight" value={formData.terminal_weight || ''} onChange={e => setFormData({ ...formData, terminal_weight: e.target.value })} />
                    </div>
                    {description}
                </>
            );
            break;
        default:
            break;
    }

    // New items pick their category here (the catalog may be showing "All").
    // An existing item keeps its category: its other columns belong to it.
    const categoryPicker = !editingId && onCategoryChange && (
        <div className="list-toggle-group" style={{ marginTop: 0 }}>
            <label htmlFor="gear-category">Category</label>
            <select id="gear-category" style={{ width: '100%' }} value={activeCategory} onChange={e => onCategoryChange(e.target.value)}>
                {Object.values(CATEGORIES).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
        </div>
    );

    return (
        <form onSubmit={onSubmit}>
            {imageUpload}
            {imageRefresh}
            {categoryPicker}
            {categoryFields}
            {urlField}
            <div className="form-actions">
                <button type="button" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={isExtracting}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="btn-icon">
                        <path d="M5 13l4 4L19 7" />
                    </svg>
                    {editingId ? 'Update' : 'Save'}
                </button>
            </div>
        </form>
    );
};

export default GearForm;
