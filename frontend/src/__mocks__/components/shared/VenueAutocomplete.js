import React from 'react';

const MockVenueAutocomplete = ({ onSelect }) => (
    <div data-testid="mock-venue-autocomplete">
        <input type="text" />
        <div className="venue-suggestions">
            <div 
                className="venue-suggestion" 
                onClick={() => onSelect({
                    name: 'Test Venue',
                    address: '123 Test St',
                    latitude: 0,
                    longitude: 0,
                    utc_offset: -5
                })}
            >
                Test Venue
            </div>
        </div>
    </div>
);

export default MockVenueAutocomplete; 