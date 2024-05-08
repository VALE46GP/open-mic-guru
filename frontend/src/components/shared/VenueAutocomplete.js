import React, { useEffect, useRef, useState } from 'react';

const VenueAutocomplete = ({ onPlaceSelected, resetTrigger, onResetComplete, initialValue }) => {
    const autocompleteInputRef = useRef(null);
    const [inputValue, setInputValue] = useState(initialValue || "");

    // Initialize Google Places Autocomplete
    useEffect(() => {
        const initializeAutocomplete = (initialValue) => {
            if (!autocompleteInputRef.current) return;
            const autocomplete = new window.google.maps.places.Autocomplete(
                autocompleteInputRef.current,
                { types: ['establishment'] }
            );
            autocomplete.setFields(['place_id', 'name', 'address_components', 'geometry']);
            autocomplete.addListener('place_changed', () => {
                const place = autocomplete.getPlace();
                if (!place.geometry) {
                    setInputValue("");
                    onPlaceSelected(null);
                    return;
                }
                const address = place.address_components.map(component => `${component.short_name}`).join(', ');
                onPlaceSelected(place);
                setInputValue(`${place.name}, ${address}`);
            });
            if (initialValue) {
                setInputValue(initialValue);
            }
        };

        if (window.google && window.google.maps) {
            initializeAutocomplete(initialValue);
        } else {
            const checkGoogleMapsLoaded = setInterval(() => {
                if (window.google && window.google.maps) {
                    clearInterval(checkGoogleMapsLoaded);
                    initializeAutocomplete(initialValue);
                }
            }, 100);

            return () => clearInterval(checkGoogleMapsLoaded);
        }
    }, [onPlaceSelected, initialValue]);

    // Handle resetTrigger changes
    useEffect(() => {
        if (resetTrigger) {
            setInputValue(""); // Clear input value
            onPlaceSelected(null); // Reset selected place since the input is cleared
            if (onResetComplete) onResetComplete(); // Notify parent component that reset is complete
        }
    }, [resetTrigger, onResetComplete, onPlaceSelected]);

    // Monitor inputValue changes and clear selection if input is manually cleared
    useEffect(() => {
        if (inputValue === "") {
            onPlaceSelected(null); // Call onPlaceSelected with null when input is cleared
        }
    }, [inputValue, onPlaceSelected]);

    // Set initial value for the input
    useEffect(() => {
        setInputValue(initialValue);
    }, [initialValue]);

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
