import React, { useEffect, useRef } from 'react';

const LocationMap = ({ latitude, longitude, showMarker = true }) => {
  const mapRef = useRef(null);
  const map = useRef(null); // To hold the map instance
  const marker = useRef(null); // To hold the marker instance

  useEffect(() => {
    const initializeMap = () => {
      const center = { lat: latitude || 0, lng: longitude || 0 };
      const zoomLevel = showMarker && latitude && longitude ? 16 : 2;

      if (!map.current) {
        map.current = new window.google.maps.Map(mapRef.current, {
          zoom: zoomLevel,
          center,
          disableDefaultUI: true,
        });
      } else {
        map.current.setCenter(center);
        map.current.setZoom(zoomLevel);
      }

      if (showMarker && latitude && longitude) {
        if (marker.current) {
          // Move the existing marker to the new location
          marker.current.setPosition(center);
        } else {
          // Create a new marker if it doesn't exist
          marker.current = new window.google.maps.Marker({
            position: center,
            map: map.current,
          });
        }
      } else {
        // Remove the marker if showMarker is false or coordinates are null
        if (marker.current) {
          marker.current.setMap(null);
          marker.current = null; // Reset the marker reference
        }
      }
    };

    if (window.google && window.google.maps) {
      initializeMap();
    } else {
      const retryId = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(retryId);
          initializeMap();
        }
      }, 100);
    }
  }, [latitude, longitude, showMarker]);

  return <div ref={mapRef} style={{ width: '100%', height: '500px' }} />;
};

export default LocationMap;
