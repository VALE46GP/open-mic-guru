import React, { useEffect, useRef, useState } from 'react';

const LocationMap = ({ latitude, longitude }) => {
  const mapRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    const checkIfGoogleMapsLoaded = () => {
      if (window.google && window.google.maps) {
        setMapLoaded(true); // Google Maps is loaded and available
      } else {
        setTimeout(checkIfGoogleMapsLoaded, 100); // Check again after a delay
      }
    };

    checkIfGoogleMapsLoaded();
  }, []);

  useEffect(() => {
    if (mapLoaded) {
      const loadMap = (lat, lng) => {
        const center = lat && lng ? new window.google.maps.LatLng(lat, lng) : new window.google.maps.LatLng(35.1495, -90.0490); // Memphis coordinates as default
        const mapOptions = {
          zoom: lat && lng ? 16 : 3,
          center: center,
        };
        const map = new window.google.maps.Map(mapRef.current, mapOptions);
        new window.google.maps.Marker({
          position: center,
          map: map,
        });
      };

      loadMap(latitude, longitude);
    }
  }, [mapLoaded, latitude, longitude]);

  return <div ref={mapRef} style={{ width: '500px', height: '400px' }} />;
};

export default LocationMap;
