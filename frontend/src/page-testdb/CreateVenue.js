import React, { useState, useEffect, useRef } from 'react';
import { useDatabaseData } from '../context/DatabaseContext';

function CreateVenue() {
    const [selectedVenue, setSelectedVenue] = useState(null);
    const { updateDatabaseData, databaseData } = useDatabaseData();
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
        const venueExists = databaseData.venues.some(venue => venue.name === selectedVenue.name && venue.address === selectedVenue.address);
        if (venueExists) {
            alert("This venue has already been saved.");
            return;
        }

        const address = selectedVenue.address_components.map(component => component.short_name).join(', ');

        const venueData = {
            name: selectedVenue.name,
            address: address,
            latitude: selectedVenue.geometry.location.lat(),
            longitude: selectedVenue.geometry.location.lng(),
        };

        try {
            const response = await fetch('/api/venues/checkOrCreate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(venueData),
            });
            const data = await response.json();
            updateDatabaseData({ venues: [...databaseData.venues, data] });
            // Reset form fields
        } catch (error) {
            console.error('Error creating venue:', error);
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
