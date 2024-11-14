import React, { useEffect, useRef, useState } from 'react';
import './VenueAutocomplete.sass';

const VenueAutocomplete = ({ 
    onPlaceSelected, 
    resetTrigger, 
    onResetComplete, 
    initialValue,
    restrictToEstablishments = false,
    placeholder = "Location"
}) => {
    const autocompleteInputRef = useRef(null);
    const [inputValue, setInputValue] = useState(initialValue || "");

    useEffect(() => {
        const checkGoogleMapsLoaded = setInterval(() => {
            if (window.google && window.google.maps && window.google.maps.places && autocompleteInputRef.current) {
                clearInterval(checkGoogleMapsLoaded);
                
                const autocomplete = new window.google.maps.places.Autocomplete(
                    autocompleteInputRef.current,
                    restrictToEstablishments ? {
                        types: ['establishment']
                    } : {}
                );

                console.log('Autocomplete options:', {
                    types: restrictToEstablishments ? ['establishment'] : ['geocode', '(cities)', 'establishment', 'address'],
                    fields: ['place_id', 'name', 'formatted_address', 'geometry', 'address_components']
                });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    console.log('Selected place:', place);
                    if (!place.geometry) {
                        console.error('No geometry for place:', place);
                        return;
                    }

                    const processedPlace = {
                        ...place,
                        name: place.name || place.formatted_address,
                        address: place.formatted_address
                    };

                    onPlaceSelected(processedPlace);
                    setInputValue(place.formatted_address);
                });
            }
        }, 100);

        return () => clearInterval(checkGoogleMapsLoaded);
    }, [onPlaceSelected, restrictToEstablishments]);

    useEffect(() => {
        if (resetTrigger) {
            setInputValue("");
            if (onResetComplete) onResetComplete();
        }
    }, [resetTrigger, onResetComplete]);

    return (
        <div className="venue-autocomplete">
            <input
                ref={autocompleteInputRef}
                type="text"
                placeholder={placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="venue-autocomplete__input"
            />
        </div>
    );
};

export default VenueAutocomplete;
