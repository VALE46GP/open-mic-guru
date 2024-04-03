import React, { useEffect, useRef } from 'react';

const VenueAutocomplete = ({ onPlaceSelected }) => {
    const autocompleteInputRef = useRef(null);

    useEffect(() => {
        const initializeAutocomplete = () => {
            if (!autocompleteInputRef.current) return;
            const autocomplete = new window.google.maps.places.Autocomplete(
                autocompleteInputRef.current,
                { types: ['establishment'] }
            );
            autocomplete.setFields(['place_id', 'name', 'address_components', 'geometry']);
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                onPlaceSelected(place);
            });
        };

        const checkGoogleMapsLoaded = setInterval(() => {
            if (window.google && window.google.maps) {
                clearInterval(checkGoogleMapsLoaded);
                initializeAutocomplete();
            }
        }, 100);

        return () => clearInterval(checkGoogleMapsLoaded);
    }, [onPlaceSelected]);

    return (
        <input
            ref={autocompleteInputRef}
            type="text"
            placeholder="Location"
        />
    );
};

export default VenueAutocomplete;
