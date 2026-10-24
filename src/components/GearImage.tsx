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
import type { GearItem } from '../shared/api';

type Resolver = (filePath: string) => string | null;

// Desktop: file:// URLs load directly (webSecurity is off).
let resolveLocalPath: Resolver = (path) => `file://${path}`;

/** Called once by the iPad entry point, which has no local image files yet. */
export function setLocalImageResolver(resolver: Resolver): void {
    resolveLocalPath = resolver;
}

export function gearImageSrc(item: Partial<GearItem> | null | undefined): string | null {
    if (!item) return null;
    if (item.image_path) {
        const local = resolveLocalPath(item.image_path);
        if (local) return local;
    }
    if (item.image_url) return item.image_url;
    return null;
}

interface GearImageProps {
    item: Partial<GearItem> | null | undefined;
    className?: string;
    alt?: string;
    onClick?: () => void;
}

const GearImage = ({ item, className, alt, onClick }: GearImageProps) => {
    const src = gearImageSrc(item);
    if (!src) return null;

    return (
        <div className={className} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
            <img src={src} alt={alt ?? item?.model ?? ''} loading="lazy" />
        </div>
    );
};

export default GearImage;
