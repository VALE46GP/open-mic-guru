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
      // Define loadMap function
      const loadMap = (lat, lng, zoomLevel) => {
        const center = new window.google.maps.LatLng(lat, lng);
        const mapOptions = {
          zoom: zoomLevel,
          center: center,
        };
        new window.google.maps.Map(mapRef.current, mapOptions);
      };

      // Function to handle successful geolocation
      const handleGeoSuccess = (position) => {
        loadMap(position.coords.latitude, position.coords.longitude, 15);
      };

      // Function to handle geolocation errors or when geolocation is not supported
      const handleGeoError = () => {
        // Memphis coordinates as fallback
        loadMap(35.1495, -90.0490, 3);
      };

      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(handleGeoSuccess, handleGeoError);
      } else {
        handleGeoError(); // Fallback if geolocation is not supported
      }
    }
  }, [mapLoaded]); // This effect depends on the mapLoaded state

  return <div ref={mapRef} style={{ width: '500px', height: '400px' }} />;
};

export default LocationMap;
