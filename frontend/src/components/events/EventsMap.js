import React, { useEffect, useRef, useCallback } from 'react';
import './EventsMap.sass';

const EventsMap = ({ events, userId }) => {
  const mapRef = useRef(null);
  const map = useRef(null);
  const markers = useRef([]);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google || !window.google.maps) return;

    markers.current.forEach(marker => marker.setMap(null));
    markers.current = [];

    if (!map.current) {
      map.current = new window.google.maps.Map(mapRef.current, {
        zoom: 12,
        disableDefaultUI: true,
        center: { lat: 0, lng: 0 }
      });
    }

    if (!events || !events.length) return;

    const bounds = new window.google.maps.LatLngBounds();

    events.forEach(event => {
      if (event.venue_latitude && event.venue_longitude) {
        const position = {
          lat: Number(event.venue_latitude),
          lng: Number(event.venue_longitude)
        };

        let fillColor, strokeColor;
        if (event.is_host) {
          fillColor = '#e3f2fd';
          strokeColor = '#1976d2';
        } else if (event.is_performer) {
          fillColor = '#f3e5f5';
          strokeColor = '#7b1fa2';
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
          window.location.href = `/events/${event.event_id}`;
        });

        markers.current.push(marker);
        bounds.extend(position);
      }
    });

    if (markers.current.length > 0) {
      map.current.fitBounds(bounds);
      const padded = map.current.getBounds();
      if (padded) {
        padded.extend({
          lat: bounds.getNorthEast().lat() + 0.01,
          lng: bounds.getNorthEast().lng() + 0.01
        });
        padded.extend({
          lat: bounds.getSouthWest().lat() - 0.01,
          lng: bounds.getSouthWest().lng() - 0.01
        });
        map.current.fitBounds(padded);
      }
    }
  }, [events]);

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
