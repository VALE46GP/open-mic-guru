import React, { useEffect, useRef, useCallback } from 'react';
import './EventsMap.sass';

const EventsMap = ({ events, userId, center, onEventSelect }) => {
  const mapRef = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);
  const mapInitialized = useRef(false); // Track if the map was already initialized

  const handleMarkerClick = useCallback((event) => {
    onEventSelect(event);
  }, [onEventSelect]);

  // Center the map based on `center` prop only after the map has been initialized
  useEffect(() => {
    if (center && map.current && mapInitialized.current) {
      map.current.setCenter(center);
      map.current.setZoom(11.5);
    }
  }, [center]);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    // Initialize the map if it hasn't been created yet
    if (!map.current) {
      map.current = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        disableDefaultUI: true,
        center: { lat: 0, lng: 0 }, // Temporary center; we'll use fitBounds below to adjust
      });
    }

    if (!events || !events.length) return;

    const bounds = new window.google.maps.LatLngBounds();

    // Create markers for each event and extend the bounds
    events.forEach(event => {
      if (event.venue_latitude && event.venue_longitude) {
        const position = {
          lat: Number(event.venue_latitude),
          lng: Number(event.venue_longitude)
        };

        let fillColor, strokeColor;
        if (event.is_host) {
          fillColor = '#f3e5f5';
          strokeColor = '#7b1fa2';
        } else if (event.is_performer) {
          fillColor = '#e3f2fd';
          strokeColor = '#1976d2';
        } else {
          fillColor = '#666666';
          strokeColor = '#ffffff';
        }

        const marker = new window.google.maps.Marker({
          position,
          map: map.current,
          title: event.event_name,
          icon: {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: fillColor,
            fillOpacity: 1,
            strokeColor: strokeColor,
            strokeWeight: 2,
            scale: 10,
          }
        });

        marker.addListener('click', () => {
          handleMarkerClick(event);
        });

        markers.current.push(marker);
        bounds.extend(position);
      }
    });

    // Adjust the map view to fit all markers within the viewport on the initial load
    if (!mapInitialized.current && markers.current.length > 0) {
      map.current.fitBounds(bounds);
      mapInitialized.current = true; // Set the map as initialized
    }
  }, [events, handleMarkerClick]);

  useEffect(() => {
    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      const checkGoogleMapsLoaded = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMapsLoaded);
          initializeMap();
        }
      }, 100);

      return () => clearInterval(checkGoogleMapsLoaded);
    }
  }, [initializeMap]);

  return <div ref={mapRef} className="events-map" />;
};

export default EventsMap;