import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import GearCard from './GearCard';
import GearImage from './GearImage';
import GearForm from './GearForm';

const CATEGORIES = {
    RODS: 'Rods',
    REELS: 'Reels',
    LURES: 'Lures',
    LINE: 'Fishing Line',
    TERMINAL: 'Terminal Tackle'
};

const LIST_TYPES = {
    OWNED: 'Owned',
    WISHLIST: 'Wishlist'
};

const GearDetail = ({ item, onBack, onEdit, onDelete }) => {
    return (
        <div className="gear-detail-view">
            <button className="btn-back" onClick={onBack}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                </svg>
                Back to Catalog
            </button>

            <article className="gear-article">
                <header className="article-header">
                    <div className="article-meta">
                        <span className="brand-pill">{item.brand}</span>
                        {item.count > 1 && <span className="count-pill">Quantity: {item.count}</span>}
                        <span className="category-pill">{item.category}</span>
                    </div>
                    <h1 className="article-title">{item.model}</h1>
                </header>

                <div className="article-content">
                    <GearImage item={item} className="article-image" />

                    <section className="article-specs">
                        <h3>Specifications</h3>
                        <div className="specs-grid">
                            {item.category === CATEGORIES.RODS && (
                                <>
                                    <div className="spec-item"><label>Type</label><span>{item.type || '-'}</span></div>
                                    <div className="spec-item"><label>Length</label><span>{item.length || '-'}</span></div>
                                    <div className="spec-item"><label>Power</label><span>{item.power || '-'}</span></div>
                                    <div className="spec-item"><label>Action</label><span>{item.action || '-'}</span></div>
                                </>
                            )}
                            {item.category === CATEGORIES.REELS && (
                                <>
                                    <div className="spec-item"><label>Type</label><span>{item.type || '-'}</span></div>
                                    <div className="spec-item"><label>Size</label><span>{item.size || '-'}</span></div>
                                    <div className="spec-item"><label>Gear Ratio</label><span>{item.gear_ratio || '-'}</span></div>
                                </>
                            )}
                            {item.category === CATEGORIES.LURES && (
                                <>
                                    <div className="spec-item"><label>Type</label><span>{item.lure_type || '-'}</span></div>
                                    <div className="spec-item"><label>Length</label><span>{item.length || '-'}</span></div>
                                    <div className="spec-item"><label>Weight</label><span>{item.weight ? `${item.weight}oz` : '-'}</span></div>
                                    <div className="spec-item"><label>Color</label><span>{item.color || '-'}</span></div>
                                </>
                            )}
                            {item.category === CATEGORIES.LINE && (
                                <>
                                    <div className="spec-item"><label>Type</label><span>{item.line_type || '-'}</span></div>
                                    <div className="spec-item"><label>Test</label><span>{item.test ? `${item.test}lb` : '-'}</span></div>
                                    <div className="spec-item"><label>Spool Size</label><span>{item.spool_size || '-'}</span></div>
                                    <div className="spec-item"><label>Color</label><span>{item.color || '-'}</span></div>
                                </>
                            )}
                            {item.category === CATEGORIES.TERMINAL && (
                                <>
                                    <div className="spec-item"><label>Type</label><span>{item.terminal_type || '-'}</span></div>
                                    {item.sub_type && <div className="spec-item"><label>Sub-Type</label><span>{item.sub_type}</span></div>}
                                    <div className="spec-item"><label>Size</label><span>{item.terminal_size || '-'}</span></div>
                                    <div className="spec-item"><label>Weight</label><span>{item.terminal_weight || '-'}</span></div>
                                </>
                            )}
                        </div>
                    </section>

                    {item.description && (
                        <section className="article-body">
                            <h3>About this Gear</h3>
                            <p>{item.description}</p>
                        </section>
                    )}

                    <div className="article-actions">
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
            </article>
        </div>
    );
};

const GearCatalog = ({ initialShowSmartAdd, onSmartAddHandled, initialUrl, initialListType, onUrlHandled, initialShowManualForm, onManualHandled }) => {
    const [gear, setGear] = useState([]);
    const [activeCategory, setActiveCategory] = useState(CATEGORIES.RODS);
    const [activeList, setActiveList] = useState(LIST_TYPES.OWNED);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({});
    const [dragActive, setDragActive] = useState(false);
    const [isExtracting, setIsExtracting] = useState(false);
    const [extractError, setExtractError] = useState(null);
    const [isRefreshingImage, setIsRefreshingImage] = useState(false);
    const [imageRefreshError, setImageRefreshError] = useState(null);
    const [lastExtractedUrl, setLastExtractedUrl] = useState('');
    const [lightboxImage, setLightboxImage] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);

    const loadGear = async () => {
        const data = await window.fishingApi.getGear();
        setGear(data);
    };

    useEffect(() => {
        loadGear();
    }, []);

    useEffect(() => {
        if (initialUrl || initialShowSmartAdd || initialShowManualForm) {
            const defaultIsWishlist = initialShowSmartAdd || initialUrl ? 1 : (activeList === LIST_TYPES.WISHLIST ? 1 : 0);

            setFormData(initialUrl ? { url: initialUrl, is_wishlist: 1 } : { is_wishlist: defaultIsWishlist });
            setEditingId(null);
            setShowForm(true);

            if (initialUrl) {
                processUrl(initialUrl, initialListType);
                onUrlHandled();
            }
            if (initialShowSmartAdd) onSmartAddHandled();
            if (initialShowManualForm) onManualHandled();
        }
    }, [initialUrl, initialShowSmartAdd, initialShowManualForm]);

    const handleFile = async (file) => {
        if (file && file.type.startsWith('image/')) {
            const filePath = window.fishingApi.getFilePath ? window.fishingApi.getFilePath(file) : file.path;
            const savedPath = await window.fishingApi.saveImage(filePath);
            setFormData({ ...formData, image_path: savedPath });
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(e.type === 'dragenter' || e.type === 'dragover');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const gearData = {
            ...formData,
            category: activeCategory,
            is_wishlist: formData.is_wishlist !== undefined ? formData.is_wishlist : (activeList === LIST_TYPES.WISHLIST ? 1 : 0)
        };

        if (editingId) {
            await window.fishingApi.updateGear(editingId, gearData);
            if (selectedItem && selectedItem.id === editingId) {
                setSelectedItem({ ...selectedItem, ...gearData });
            }
        } else {
            await window.fishingApi.addGear(gearData);
        }

        resetForm();
        loadGear();
    };

    const resetForm = () => {
        setFormData({ is_wishlist: activeList === LIST_TYPES.WISHLIST ? 1 : 0 });
        setEditingId(null);
        setShowForm(false);
        setExtractError(null);
        setImageRefreshError(null);
        setLastExtractedUrl('');
    };

    const handleEdit = (item) => {
        setFormData(item);
        setEditingId(item.id);
        setSelectedItem(null);
        setExtractError(null);
        setImageRefreshError(null);
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this item?')) {
            await window.fishingApi.deleteGear(id);
            setSelectedItem(null);
            loadGear();
        }
    };

    const processUrl = async (urlToProcess, targetListType) => {
        if (!urlToProcess) return;

        setIsExtracting(true);
        setExtractError(null);

        const result = await window.fishingApi.extractGearDetails(urlToProcess);

        if (result.success) {
            const extractedData = result.data;

            const currentWishlistStatus = formData.is_wishlist !== undefined ? formData.is_wishlist : (activeList === LIST_TYPES.WISHLIST ? 1 : 0);
            const useWishlist = targetListType ? (targetListType === 'Wishlist' ? 1 : 0) : currentWishlistStatus;

            if (targetListType) {
                setActiveList(targetListType === 'Wishlist' ? LIST_TYPES.WISHLIST : LIST_TYPES.OWNED);
            }

            setFormData({
                ...extractedData,
                // Hotlinked, not copied: the URL is stored and rendered directly.
                // A local image_path (user override) still wins if one is set.
                image_url: extractedData.extracted_image_url || null,
                image_path: formData.image_path,
                is_wishlist: useWishlist,
                url: urlToProcess
            });
            setActiveCategory(extractedData.category);
            setEditingId(null);
            setShowForm(true);
            setLastExtractedUrl(urlToProcess);
        } else {
            setExtractError(result.error || 'Could not extract details from this URL.');
        }
        setIsExtracting(false);
    };

    /**
     * Re-reads the product image for the item being edited. Only `image_url` is
     * replaced: a local `image_path` is a deliberate user override and stays.
     */
    const refreshImage = async () => {
        const url = (formData.url || '').trim();
        if (!url) return;

        setIsRefreshingImage(true);
        setImageRefreshError(null);

        const result = await window.fishingApi.refreshGearImage(url);

        if (result.success) {
            setFormData(prev => ({ ...prev, image_url: result.imageUrl }));
        } else {
            setImageRefreshError(result.error || 'Could not refresh the image.');
        }

        setIsRefreshingImage(false);
    };

    const isUrlPasted = formData.url && formData.url.startsWith('http') && !editingId && formData.url !== lastExtractedUrl;

    const filteredGear = gear.filter(g =>
        g.category === activeCategory &&
        (activeList === LIST_TYPES.WISHLIST ? g.is_wishlist === 1 : g.is_wishlist === 0)
    );

    if (selectedItem) {
        return (
            <GearDetail
                item={selectedItem}
                onBack={() => setSelectedItem(null)}
                onEdit={handleEdit}
                onDelete={handleDelete}
            />
        );
    }

    const formTitle = `${editingId ? 'Edit' : 'Add New'} ${activeCategory === CATEGORIES.RODS ? 'Rod' :
        activeCategory === CATEGORIES.REELS ? 'Reel' :
            activeCategory === CATEGORIES.LURES ? 'Lure' :
                activeCategory
        }`;

    return (
        <div className="gear-catalog">
            <div className="view-header">
                <div className="header-left">
                    <h1>Gear Catalog {gear.length > 0 && <span className="title-count">({gear.length})</span>}</h1>
                    <div className="list-toggle">
                        <button
                            className={`toggle-btn ${activeList === LIST_TYPES.OWNED ? 'active' : ''}`}
                            onClick={() => setActiveList(LIST_TYPES.OWNED)}
                        >
                            Owned {gear.filter(g => !g.is_wishlist).length > 0 && <span className="tab-count">({gear.filter(g => !g.is_wishlist).length})</span>}
                        </button>
                        <button
                            className={`toggle-btn ${activeList === LIST_TYPES.WISHLIST ? 'active' : ''}`}
                            onClick={() => setActiveList(LIST_TYPES.WISHLIST)}
                        >
                            Wishlist {gear.filter(g => g.is_wishlist).length > 0 && <span className="tab-count">({gear.filter(g => g.is_wishlist).length})</span>}
                        </button>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="btn-icon">
                            <path d="M12 4v16m8-8H4" />
                        </svg>
                        Add
                    </button>
                </div>
            </div>

            <div className="category-tabs">
                {Object.values(CATEGORIES).map(cat => {
                    const count = gear.filter(g =>
                        g.category === cat &&
                        (activeList === LIST_TYPES.WISHLIST ? g.is_wishlist === 1 : g.is_wishlist === 0)
                    ).length;

                    return (
                        <button
                            key={cat}
                            className={`tab ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                            {count > 0 && <span className="tab-count"> ({count})</span>}
                        </button>
                    );
                })}
            </div>

            <Modal isOpen={showForm} onClose={resetForm} title={formTitle}>
                <GearForm
                    formData={formData}
                    setFormData={setFormData}
                    activeCategory={activeCategory}
                    dragActive={dragActive}
                    handleDrag={handleDrag}
                    handleDrop={handleDrop}
                    handleFile={handleFile}
                    isExtracting={isExtracting}
                    extractError={extractError}
                    isUrlPasted={isUrlPasted}
                    processUrl={processUrl}
                    onRefreshImage={refreshImage}
                    isRefreshingImage={isRefreshingImage}
                    imageRefreshError={imageRefreshError}
                    onSubmit={handleSubmit}
                    onCancel={resetForm}
                    editingId={editingId}
                />
            </Modal>

            <div className="gear-list">
                {filteredGear.length === 0 ? (
                    <p className="empty-state">No {activeCategory} in your {activeList.toLowerCase()} yet.</p>
                ) : (
                    <div className="gear-grid">
                        {filteredGear.map(item => (
                            <GearCard
                                key={item.id}
                                item={item}
                                onImageClick={setLightboxImage}
                                onTitleClick={setSelectedItem}
                                onEdit={handleEdit}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                )}
            </div>

            {lightboxImage && (
                <div className="lightbox-modal" onClick={() => setLightboxImage(null)}>
                    <div className="lightbox-content" onClick={e => e.stopPropagation()}>
                        <img src={lightboxImage} alt="Full size" />
                        <button className="lightbox-close" onClick={() => setLightboxImage(null)}>×</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GearCatalog;
