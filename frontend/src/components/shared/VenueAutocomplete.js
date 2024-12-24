import React, { useEffect, useRef, useState } from 'react';
import './VenueAutocomplete.sass';
import { getTimezoneFromOffset } from '../../utils/timeCalculations';

const VenueAutocomplete = ({
                               onPlaceSelected,
                               resetTrigger,
                               onResetComplete,
                               initialValue,
                               specificCoordinates = false,
                               placeholder = "Location",
                               onClear
                           }) => {
    const autocompleteInputRef = useRef(null);
    const [inputValue, setInputValue] = useState(initialValue || "");

    const handleClear = () => {
        setInputValue("");
        if (onClear) {
            onClear();
        }
    };

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

                    // Include the timezone information in the processed place
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
                        },
                        timezone: getTimezoneFromOffset(place.utc_offset_minutes)  // Convert offset to timezone
                    };

                    onPlaceSelected(processedPlace);
                    const displayValue = place.name && place.name !== place.formatted_address.split(',')[0]
                        ? `${place.name}, ${place.formatted_address}`
                        : place.formatted_address;
                    setInputValue(displayValue);
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

    useEffect(() => {
        if (initialValue) {
            setInputValue(initialValue);
        }
    }, [initialValue]);

    return (
        <div className="venue-autocomplete">
            <div className="venue-autocomplete__input-wrapper">
                <input
                    ref={autocompleteInputRef}
                    type="text"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="venue-autocomplete__input"
                />
                {inputValue && (
                    <button
                        className="venue-autocomplete__clear-button"
                        onClick={handleClear}
                        aria-label="Clear location"
                    >
                        ×
                    </button>
                )}
            </div>
        </div>
    );
};

export default VenueAutocomplete;
