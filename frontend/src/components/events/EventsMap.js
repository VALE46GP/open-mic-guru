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
    if (!isGoogleLoaded) {
      // console.log('Google Maps API is not yet loaded.');
      return;
    }
    if (!mapRef.current) {
      // console.log('Map container ref is not available.');
      return;
    }

    // Initialize the Google Map
    if (!map.current) {
      // console.log('Initializing Google Map...');
      map.current = new window.google.maps.Map(mapRef.current, {
        zoom: 10,
        center: center || { lat: 37.7749, lng: -122.4194 },
        disableDefaultUI: true,
        styles: [{ featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }],
      });
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

        marker.event = event; // Store event data on marker
        marker.addListener('click', () => handleMarkerClick(event));

        bounds.extend(position);
        return marker;
      }
      return null;
    }).filter(marker => marker); // Remove any null markers if event data is incomplete

    markers.current = newMarkers;

    // Initialize clustering with MarkerClusterer
    if (markerClusterer.current) {
      markerClusterer.current.clearMarkers();
    }

    markerClusterer.current = new MarkerClusterer({
      map: map.current,
      markers: newMarkers,
    });

    // Fit map bounds to include all markers
    map.current.fitBounds(bounds);

  }, [isGoogleLoaded, center, events]); // Add `events` as a dependency

  const handleMarkerClick = (event) => {
    onEventSelect(event);
  };

  return (
      <div ref={mapRef} className="events-map" style={{ width: '100%', height: '400px' }}>
        {!isGoogleLoaded && <div className="events-map__loading">Loading map...</div>}
      </div>
  );
};

export default EventsMap;