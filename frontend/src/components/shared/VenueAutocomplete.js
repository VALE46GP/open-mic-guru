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
        let autocomplete = null;
        const checkGoogleMapsLoaded = setInterval(() => {
            if (window.google && window.google.maps && window.google.maps.places && autocompleteInputRef.current) {
                clearInterval(checkGoogleMapsLoaded);

                autocomplete = new window.google.maps.places.Autocomplete(
                    autocompleteInputRef.current,
                    {
                        types: [],  // Allow all types of places
                        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'address_components', 'utc_offset_minutes']
                    }
                );

                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    if (!place || !place.geometry) {
                        console.error('No valid place selected or place has no geometry:', place);
                        return;
                    }

                    const viewport = place.geometry.viewport;
                    const location = place.geometry.location;

                    const processedPlace = {
                        ...place,
                        name: place.name || place.formatted_address,
                        address: place.formatted_address,
                        geometry: {
                            ...place.geometry,
                            location: place.geometry.location,
                            viewport: viewport ? {
                                getNorthEast: () => viewport.getNorthEast(),
                                getSouthWest: () => viewport.getSouthWest()
                            } : null
                        }
                    };

                    onPlaceSelected(processedPlace);
                    setInputValue(place.formatted_address);
                });
            }
        }, 100);

        return () => {
            clearInterval(checkGoogleMapsLoaded);
            if (autocomplete) {
                window.google.maps.event.clearInstanceListeners(autocomplete);
            }
        };
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
