import React from 'react';
import { mockPlaceData } from '../testData/mockVenues';

const VenueAutocomplete = ({ 
    onPlaceSelected, 
    initialValue = '', 
    placeholder = 'Search venue',
    onClear 
}) => {
    const handleChange = (e) => {
        onPlaceSelected(mockPlaceData);
    };

    const handleClear = () => {
        if (onClear) onClear();
    };

    return (
        <div>
            <input
                data-testid="mock-venue-autocomplete"
                placeholder={placeholder}
                defaultValue={initialValue}
                onChange={handleChange}
            />
            {initialValue && (
                <button
                    aria-label="Clear location"
                    onClick={handleClear}
                >
                    Clear
                </button>
            )}
        </div>
    );
};

export default VenueAutocomplete;
