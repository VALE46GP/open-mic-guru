import React, { useEffect, useRef, useState } from 'react';
import './VenueAutocomplete.sass';

const VenueAutocomplete = ({ 
    onPlaceSelected, 
    resetTrigger, 
    onResetComplete, 
    initialValue,
    specificCoordinates = false,
    placeholder = "Location"
}) => {
    const autocompleteInputRef = useRef(null);
    const [inputValue, setInputValue] = useState(initialValue || "");

    useEffect(() => {
        const checkGoogleMapsLoaded = setInterval(() => {
            if (window.google && window.google.maps && window.google.maps.places && autocompleteInputRef.current) {
                clearInterval(checkGoogleMapsLoaded);

                // Set types based on specificCoordinates flag
                const autocomplete = new window.google.maps.places.Autocomplete(
                    autocompleteInputRef.current,
                    {
                        types: specificCoordinates ? ['establishment'] : [],
                        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'address_components', 'utc_offset_minutes']
                    }
                );

                // console.log('Autocomplete initialized with options:', {
                //     specificCoordinates,
                //     types: specificCoordinates ? ['establishment'] : [],
                //     fields: ['place_id', 'name', 'formatted_address', 'geometry', 'address_components', 'utc_offset_minutes']
                // });

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place || !place.geometry) {
                        console.error('No valid place selected or place has no geometry:', place);
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
    }, [onPlaceSelected, specificCoordinates]);

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
