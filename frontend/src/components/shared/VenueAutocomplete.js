import React, { useEffect, useRef, useState } from 'react';

const VenueAutocomplete = ({ onPlaceSelected, resetTrigger, onResetComplete }) => {
    const autocompleteInputRef = useRef(null);
    const [inputValue, setInputValue] = useState("");

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
                const address = place.address_components.map(component => `${component.short_name}`).join(', ');
                onPlaceSelected(place);
                setInputValue(`${place.name}, ${address}`); // Include both name and address
            });
        };

        const checkGoogleMapsLoaded = setInterval(() => {
            if (window.google && window.google.maps) {
                clearInterval(checkGoogleMapsLoaded);
                initializeAutocomplete();
            }
        }, 100);

        return () => clearInterval(checkGoogleMapsLoaded);
    }, [onPlaceSelected, resetTrigger]);

    useEffect(() => {
        if (resetTrigger) {
            setInputValue(""); // Clear input value when resetTrigger changes
            if (onResetComplete) onResetComplete(); // Notify parent component that reset is complete
        }
    }, [resetTrigger, onResetComplete]);

    return (
        <input
            ref={autocompleteInputRef}
            type="text"
            placeholder="Location"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
        />
    );
};

export default VenueAutocomplete;
