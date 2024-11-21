import React, { useEffect, useRef, useState } from 'react';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import './EventsMap.sass';

const EventsMap = ({ events, center, onEventSelect }) => {
    const mapRef = useRef(null);
    const map = useRef(null);
    const markers = useRef([]);
    const markerClusterer = useRef(null);
    const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

    // Load Google Maps API
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
                // console.log('Google Maps API loaded.');
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

    // Initialize Map and Clustering
    useEffect(() => {
        if (!isGoogleLoaded || !mapRef.current) return;

        // Initialize the Google Map
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
            if (events.length === 0) {
                // If no events found and we have viewport information from the location filter
                const locationViewport = window.locationViewport;
                if (locationViewport) {
                    map.current.fitBounds(locationViewport);
                } else {
                    // If no viewport info, just center on the selected point with a wider view
                    map.current.setCenter(center);
                    map.current.setZoom(10);
                }
            } else {
                // Keep existing behavior for when events are found
                map.current.setCenter(center);
                if (events.length === 1) {
                    map.current.setZoom(15);
                } else {
                    map.current.setZoom(10);
                }
            }
        }

        // Clear existing markers
        markers.current.forEach(marker => marker.setMap(null));
        markers.current = [];

        if (markerClusterer.current) {
            markerClusterer.current.clearMarkers();
        }

        // Create markers for each event in the `events` prop
        const bounds = new window.google.maps.LatLngBounds();
        const newMarkers = events.map(event => {
            if (event.venue_latitude && event.venue_longitude) {
                const position = {
                    lat: Number(event.venue_latitude),
                    lng: Number(event.venue_longitude),
                };

                const marker = new window.google.maps.Marker({
                    position,
                    map: map.current,
                    title: event.event_name,
                    icon: {
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: event.is_host ? '#f3e5f5' : event.is_performer ? '#e3f2fd' : '#666666',
                        fillOpacity: 1,
                        strokeColor: event.is_host ? '#7b1fa2' : event.is_performer ? '#1976d2' : '#ffffff',
                        strokeWeight: 2,
                        scale: 10,
                    },
                });

                marker.event = event;
                marker.addListener('click', () => handleMarkerClick(event));

                bounds.extend(position);
                return marker;
            }
            return null;
        }).filter(marker => marker);

        markers.current = newMarkers;

        // Only fit bounds if there are markers and not handling a marker click
        if (newMarkers.length > 0 && !map.current.isMarkerClick) {
            markerClusterer.current = new MarkerClusterer({
                map: map.current,
                markers: newMarkers,
            });

            // For single marker, set a specific zoom level instead of fitting bounds
            if (newMarkers.length === 1) {
                map.current.setCenter(newMarkers[0].getPosition());
                map.current.setZoom(15);
            } else {
                map.current.fitBounds(bounds);
            }
        }

        // Reset the marker click flag after all operations are complete
        setTimeout(() => {
            if (map.current) {
                map.current.isMarkerClick = false;
            }
        }, 100);

    }, [isGoogleLoaded, center, events]);

    const handleMarkerClick = (event) => {
        if (!map.current) return;

        const position = {
            lat: Number(event.venue_latitude),
            lng: Number(event.venue_longitude)
        };

        // Set a flag to prevent the useEffect from overriding our zoom/center
        map.current.isMarkerClick = true;

        map.current.setCenter(position);
        map.current.setZoom(15);
        onEventSelect(event);
    };

    return (
        <div ref={mapRef} className="events-map">
            {!isGoogleLoaded && <div className="events-map__loading">Loading map...</div>}
        </div>
    );
};

export default EventsMap;