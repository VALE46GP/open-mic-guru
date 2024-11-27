import React from 'react';

const VenueAutocomplete = ({ onPlaceSelected }) => (
    <input
        data-testid="mock-venue-autocomplete"
        placeholder="Search venue"
        onChange={() => onPlaceSelected({ lat: 40.7128, lng: -74.0060 })}
    />
);

export default VenueAutocomplete;
