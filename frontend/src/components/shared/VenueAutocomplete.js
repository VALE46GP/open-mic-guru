import React, { useEffect, useRef, useState } from 'react';
import './VenueAutocomplete.sass';
import { DateTime } from 'luxon';

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
        if (!window.google) return;

        const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current, {
            types: ['establishment']
        });

        autocomplete.addListener('place_changed', async () => {
            const place = autocomplete.getPlace();
            if (!place.geometry) return;

            const lat = place.geometry.location.lat();
            const lng = place.geometry.location.lng();

            try {
                const utcOffset = place.utc_offset_minutes !== undefined 
                    ? place.utc_offset_minutes 
                    : -420;

                if (place.utc_offset_minutes === undefined) {
                    console.warn('No UTC offset minutes from Google Places, defaulting to -420 (PDT)');
                }

                const processedVenue = {
                    name: place.name || '',
                    address: place.address_components?.map(ac => ac.short_name).join(', ') || place.address,
                    latitude: lat,
                    longitude: lng,
                    utc_offset: utcOffset,
                    geometry: {
                        location: {
                            lat: () => lat,
                            lng: () => lng
                        }
                    },
                    formatted_address: place.formatted_address,
                    address_components: place.address_components,
                    adr_address: place.adr_address,
                    business_status: place.business_status,
                    current_opening_hours: place.current_opening_hours
                };

                console.log('Final processed venue:', processedVenue);
                onPlaceSelected(processedVenue);
                setInputValue(processedVenue.name || processedVenue.formatted_address || "");
            } catch (error) {
                console.error('Error in venue selection:', error);
                throw error;
            }
        });

        return () => {
            window.google.maps.event.clearInstanceListeners(autocomplete);
        };
    }, [onPlaceSelected]);

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
