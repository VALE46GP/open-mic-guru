import React, { useState, useEffect, useRef } from 'react';
import { BASE_URL } from '../../config';

function CreateVenue() {
    const [selectedVenue, setSelectedVenue] = useState(null);
    const autocompleteInputRef = useRef(null);

    useEffect(() => {
        const checkGoogleMapsLoaded = setInterval(() => {
            if (window.google && window.google.maps) {
                console.log("Google Maps API is fully loaded");
                clearInterval(checkGoogleMapsLoaded);
                const autocomplete = new window.google.maps.places.Autocomplete(autocompleteInputRef.current);
                autocomplete.addListener('place_changed', () => {
                    const place = autocomplete.getPlace();
                    setSelectedVenue(place);
                });
            }
        }, 100); // Check every 100 milliseconds

        return () => clearInterval(checkGoogleMapsLoaded); // Cleanup on unmount
    }, []);

    const handleCreateVenue = async () => {
        const venueData = {
            name: selectedVenue.name,
            address: selectedVenue.address,
            latitude: selectedVenue.geometry.location.lat(),
            longitude: selectedVenue.geometry.location.lng(),
            utc_offset: selectedVenue.utc_offset_minutes ?? -420
        };

        try {
            const response = await fetch(`${BASE_URL}/venues/checkOrCreate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(venueData),
            });
            const data = await response.json();
            if (data.venueId) {
                alert('Venue already exists or was just created with ID: ' + data.venueId);
            }
        } catch (error) {
            console.error('Error creating or checking venue:', error);
        }
    };

    return (
        <div>
            <h2>Create a New Venue</h2>
            <input
                ref={autocompleteInputRef}
                type="text"
                placeholder="Location"
            />
            <button onClick={handleCreateVenue}>Submit</button>
        </div>
    );
}

export default CreateVenue;
