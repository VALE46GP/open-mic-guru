import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import './EventsMap.sass';

const EventsMap = ({ events, center, onEventSelect }) => {
    const mapRef = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);
    const markerClusterer = useRef(null);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

    const handleMarkerClick = useCallback((venueEvents) => {
        if (!map.current) return;

        map.current.isMarkerClick = true;
        onEventSelect(venueEvents);
    }, [onEventSelect]);

    useEffect(() => {
        const loadGoogleMaps = () => {
            if (window.google && window.google.maps) {
                setIsGoogleLoaded(true);
                return;
            }

            console.log('Loading Google Maps API...');
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_API_KEY}&libraries=places,geometry`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                setIsGoogleLoaded(true);
            };
            script.onerror = () => {
                console.error('Error loading Google Maps API.');
            };
            document.head.appendChild(script);
        };

        loadGoogleMaps();

        return () => {
            if (markerClusterer.current) {
                markerClusterer.current.clearMarkers();
            }
            markers.current.forEach(marker => marker.setMap(null));
            markers.current = [];
        };
    }, []);

    useEffect(() => {
        if (!isGoogleLoaded || !mapRef.current) return;

        if (!map.current) {
            map.current = new window.google.maps.Map(mapRef.current, {
                zoom: 10,
                center: center || { lat: 37.7749, lng: -122.4194 },
                disableDefaultUI: true,
                styles: [{
                    featureType: "poi",
                    elementType: "labels",
                    stylers: [{ visibility: "off" }]
                }],
            });
        } else if (center && !map.current.isMarkerClick) {
            map.current.setCenter(center);
            map.current.setZoom(events.length === 1 ? 15 : 10);
        }

        markers.current.forEach(marker => marker.setMap(null));
        markers.current = [];

        if (markerClusterer.current) {
            markerClusterer.current.clearMarkers();
        }

        const bounds = new window.google.maps.LatLngBounds();
        const venueMap = new Map();

        events.forEach(event => {
            if (event.venue_latitude && event.venue_longitude) {
                const venueKey = `${event.venue_latitude},${event.venue_longitude}`;
                if (!venueMap.has(venueKey)) {
                    venueMap.set(venueKey, []);
                }
                venueMap.get(venueKey).push(event);
            }
        });

        const newMarkers = Array.from(venueMap.entries()).map(([key, venueEvents]) => {
            const [lat, lng] = key.split(',').map(Number);
            const position = { lat, lng };

            // Determine the color based on priority
            let fillColor = '#666666';
            let strokeColor = '#ffffff';

            if (venueEvents.some(event => event.is_host)) {
                fillColor = '#f3e5f5';
                strokeColor = '#7b1fa2';
            } else if (venueEvents.some(event => event.is_performer)) {
                fillColor = '#e3f2fd';
                strokeColor = '#1976d2';
            }

            const marker = new window.google.maps.Marker({
                position,
                map: map.current,
                title: venueEvents.map(e => e.event_name).join(', '),
                icon: {
                    path: window.google.maps.SymbolPath.CIRCLE,
                    fillColor: fillColor,
                    fillOpacity: 1,
                    strokeColor: strokeColor,
                    strokeWeight: 2,
                    scale: 10,
                },
            });

            marker.addListener('click', () => handleMarkerClick(venueEvents));

            bounds.extend(position);
            return marker;
        });

        markers.current = newMarkers;

        if (newMarkers.length > 0 && !map.current.isMarkerClick) {
            markerClusterer.current = new MarkerClusterer({
                map: map.current,
                markers: newMarkers,
            });

            if (newMarkers.length === 1) {
                map.current.setCenter(newMarkers[0].getPosition());
                map.current.setZoom(15);
            } else {
                map.current.fitBounds(bounds);
            }
        }

        setTimeout(() => {
            if (map.current) {
                map.current.isMarkerClick = false;
            }
        }, 100);

    }, [isGoogleLoaded, center, events, handleMarkerClick]);

    return (
        <div ref={mapRef} className="events-map">
            {!isGoogleLoaded && <div className="events-map__loading">Loading map...</div>}
        </div>
    );
};

export default EventsMap;