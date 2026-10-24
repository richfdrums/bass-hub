// One place that decides which image to show for a gear item, so the same
// rule applies to cards, the detail article, and the form preview:
//
//   image_path (local copy, desktop override)  >  image_url (hotlinked)  >  nothing
//
// image_path is a bare absolute path with no scheme. The desktop renderer
// loads those as file:// URLs (webSecurity is off); the iPad has no local
// files until P2, so its entry point overrides the resolver. Components never
// need to know which platform they are on.

import React from 'react';

let resolveLocalPath = (path) => `file://${path}`;

/** Called once by the iPad entry point. Desktop keeps the file:// default. */
export function setLocalImageResolver(resolver) {
    resolveLocalPath = resolver;
}

export function gearImageSrc(item) {
    if (!item) return null;
    if (item.image_path) return resolveLocalPath(item.image_path);
    if (item.image_url) return item.image_url;
    return null;
}

const GearImage = ({ item, className, alt, onClick }) => {
    const src = gearImageSrc(item);
    if (!src) return null;

    return (
        <div className={className} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
            <img src={src} alt={alt ?? item.model} loading="lazy" />
        </div>
    );
};

export default GearImage;
