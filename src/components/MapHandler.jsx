import { useEffect } from 'react';
import { useMap } from '@vis.gl/react-google-maps';

const MapHandler = ({ place }) => {
    const map = useMap();

    useEffect(() => {
        if (!map || !place || !place.geometry || !place.geometry.location) return;

        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(15);
        }
    }, [map, place]);

    return null;
};

export default MapHandler;
