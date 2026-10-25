import React from 'react';

const SunIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
);

const MoonIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
);

/**
 * Icon-only Light/Dark switch in the top-right corner of the scroll area; it
 * scrolls away with the page. App owns the theme and saves it to settings.
 */
const ThemeToggle = ({ theme, onChange }) => (
    <div className="theme-toggle" role="group" aria-label="Appearance">
        <button
            className={theme === 'light' ? 'active' : ''}
            aria-pressed={theme === 'light'}
            aria-label="Light mode"
            title="Light mode"
            onClick={() => onChange('light')}
        >
            {SunIcon}
        </button>
        <button
            className={theme !== 'light' ? 'active' : ''}
            aria-pressed={theme !== 'light'}
            aria-label="Dark mode"
            title="Dark mode"
            onClick={() => onChange('dark')}
        >
            {MoonIcon}
        </button>
    </div>
);

export default ThemeToggle;
