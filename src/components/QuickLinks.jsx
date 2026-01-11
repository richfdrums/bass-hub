import React, { useState, useEffect } from 'react';
import Modal from './Modal';

const QuickLinks = () => {
    const [links, setLinks] = useState([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [newLink, setNewLink] = useState({ title: '', url: '', category: 'Other' });

    const CATEGORIES = ['Retail', 'Knowledge Base', 'Video', 'News', 'Destination', 'Other'];

    const loadLinks = async () => {
        const data = await window.fishingApi.getLinks();
        setLinks(data);
    };

    useEffect(() => {
        loadLinks();
    }, []);

    const handleAdd = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await window.fishingApi.updateLink(editingId, newLink);
            } else {
                await window.fishingApi.addLink(newLink);
            }
            setNewLink({ title: '', url: '', category: 'Other' });
            setEditingId(null);
            setShowAddForm(false);
            loadLinks();
        } catch (error) {
            console.error('Save failed:', error);
            alert(`Failed to save link: ${error.message}`);
        }
    };

    const handleEdit = (link) => {
        setNewLink({ title: link.title, url: link.url, category: link.category || 'Other' });
        setEditingId(link.id);
        setShowAddForm(true);
    };

    const openNewForm = () => {
        setNewLink({ title: '', url: '', category: 'Other' });
        setEditingId(null);
        setShowAddForm(true);
    };

    const handleUrlBlur = async () => {
        if (!newLink.url || newLink.title) return;

        try {
            // Optional: You could set a 'loading' state here to show a spinner
            const title = await window.fishingApi.fetchPageTitle(newLink.url);
            if (title) {
                setNewLink(prev => ({ ...prev, title }));
            }
        } catch (e) {
            // Silent fail
        }
    };

    const handleDelete = async (id) => {
        if (confirm('Delete this link?')) {
            await window.fishingApi.deleteLink(id);
            loadLinks();
        }
    };

    // Helper to group links by category
    const groupedLinks = links.reduce((acc, link) => {
        const cat = link.category || 'Other';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(link);
        return acc;
    }, {});

    return (
        <div className="quick-links">
            <div className="view-header">
                <h1>Links & Resources</h1>
                <button className="btn-primary" onClick={openNewForm}>+ Add Link</button>
            </div>

            <Modal
                isOpen={showAddForm}
                onClose={() => setShowAddForm(false)}
                title={editingId ? 'Edit Link' : 'Add New Link'}
            >
                <form onSubmit={handleAdd}>
                    <select
                        value={newLink.category}
                        onChange={e => setNewLink({ ...newLink, category: e.target.value })}
                        style={{ width: '100%', marginBottom: '10px', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)' }}
                    >
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <input
                        placeholder="Title (e.g. Bass Pro Shops, Weather.com)"
                        value={newLink.title}
                        onChange={e => setNewLink({ ...newLink, title: e.target.value })}
                        required
                    />
                    <input
                        placeholder="URL (https://...)"
                        value={newLink.url}
                        onChange={e => setNewLink({ ...newLink, url: e.target.value })}
                        onBlur={handleUrlBlur}
                        required
                    />
                    <div className="form-actions">
                        <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary">{editingId ? 'Update Link' : 'Save Link'}</button>
                    </div>
                </form>
            </Modal>


            <div className="links-container">
                {links.length === 0 ? (
                    <p className="empty-state">No links saved yet.</p>
                ) : (
                    CATEGORIES.map(category => (
                        groupedLinks[category] && (
                            <div key={category} className="link-group-module">
                                <h3 className="link-group-title">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
                                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    {category}
                                </h3>
                                <div className="link-list-refined">
                                    {groupedLinks[category].map(link => (
                                        <div key={link.id} className="link-row-refined">
                                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-title-refined" title={link.url}>
                                                {link.title}
                                            </a>
                                            <div className="link-actions-refined">
                                                <button className="btn-edit" onClick={() => handleEdit(link)} title="Edit">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                                                        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button className="btn-delete" onClick={() => handleDelete(link.id)} title="Delete">
                                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="action-icon">
                                                        <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))
                )}
            </div>
        </div>
    );
};

export default QuickLinks;
