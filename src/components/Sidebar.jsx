import React, { useState } from 'react';
import logo from '../assets/logo.png';
import { IS_IOS } from '../shared/platform';

const TABS = [
    {
        id: 'dashboard',
        label: 'Dashboard',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )
    },
    {
        id: 'gear',
        label: 'Gear Catalog',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        )
    },
    {
        id: 'trips',
        label: 'Trips',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
        )
    },
    {
        id: 'links',
        label: 'Links',
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
        )
    },
];

const SettingsIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
);

/**
 * Collapsible sidebar. On the iPad it starts as an icon rail and expands over
 * the content (the tablet has no room to spend 260px on navigation); on the
 * desktop it starts expanded, as it always was.
 */
const Sidebar = ({ activeTab, setActiveTab }) => {
    const [collapsed, setCollapsed] = useState(IS_IOS);

    const select = (id) => {
        setActiveTab(id);
        // On iPad the expanded sidebar is an overlay, so picking a tab closes it.
        if (IS_IOS) setCollapsed(true);
    };

    return (
        <>
            {IS_IOS && !collapsed && (
                <div className="sidebar-scrim" onClick={() => setCollapsed(true)} />
            )}
            <aside className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`}>
                <div className="sidebar-header">
                    <img src={logo} className="logo-img" alt="Logo" />
                    {!collapsed && <h2>Bass Hub</h2>}
                    <button
                        className="sidebar-toggle"
                        onClick={() => setCollapsed(!collapsed)}
                        aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
                        title={collapsed ? 'Expand navigation' : 'Collapse navigation'}
                    >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
                        </svg>
                    </button>
                </div>
                <nav>
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => select(tab.id)}
                            title={collapsed ? tab.label : undefined}
                            aria-label={tab.label}
                        >
                            <span className="nav-icon">{tab.icon}</span>
                            {!collapsed && <span className="label">{tab.label}</span>}
                        </button>
                    ))}
                </nav>
                <div className="sidebar-footer">
                    <button
                        className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => select('settings')}
                        title={collapsed ? 'Settings' : undefined}
                        aria-label="Settings"
                    >
                        <span className="nav-icon">{SettingsIcon}</span>
                        {!collapsed && <span className="label">Settings</span>}
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
