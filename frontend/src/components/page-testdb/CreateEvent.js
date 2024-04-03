import React, { useState, useEffect, useRef } from 'react';
import { useDatabaseData } from '../../context/DatabaseContext';
import { useAuth } from '../../context/AuthContext';

function CreateEvent() {
    const [newEventName, setNewEventName] = useState('');
    const [newEventDateTime, setNewEventDateTime] = useState('');
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [additionalInfo, setAdditionalInfo] = useState('');
    const autocompleteInputRef = useRef(null);
    const { updateDatabaseData, databaseData } = useDatabaseData();
    const { getUserId } = useAuth();

    const initializeAutocomplete = () => {
        console.log("Attempting to initialize Autocomplete");
        if (!autocompleteInputRef.current) {
            console.log("Autocomplete input ref not available");
            return;
        }
        console.log("Initializing Autocomplete on:", autocompleteInputRef.current);
        const autocomplete = new window.google.maps.places.Autocomplete(
            autocompleteInputRef.current,
            { types: ['establishment'] }
        );
        autocomplete.setFields(['place_id', 'name', 'address_components', 'geometry']);
        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            console.log("Place selected:", place);
            setSelectedVenue(place);
        });
    };

    useEffect(() => {
        const checkGoogleMapsLoaded = setInterval(() => {
            if (window.google && window.google.maps) {
                console.log("Google Maps API is fully loaded");
                clearInterval(checkGoogleMapsLoaded);
                console.log('Google object:', window.google);
                initializeAutocomplete();
            }
        }, 100); // Check every 100 milliseconds

        return () => clearInterval(checkGoogleMapsLoaded); // Cleanup on unmount
    }, []);

    const handleCreateEvent = async () => {
        if (!selectedVenue) {
            alert("Please select a location from the dropdown.");
            return;
        }

        let venueId = await checkOrCreateVenue(selectedVenue);

        const hostId = getUserId();
        console.log('Sending event data:', { name: newEventName, venue_id: venueId, date_time: newEventDateTime, additional_info: additionalInfo, host_id: hostId });

        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newEventName,
                    venue_id: venueId,
                    date_time: newEventDateTime,
                    additional_info: additionalInfo,
                    host_id: hostId,
                }),
            });
            const newEvent = await response.json();
            updateDatabaseData({ events: [...databaseData.events, newEvent] });
            setNewEventName('');
            setNewEventDateTime('');
            setSelectedVenue(null);
            setAdditionalInfo('');
        } catch (error) {
            console.error('Error creating event:', error);
        }
    };

    async function checkOrCreateVenue(selectedVenue) {
        console.log('location: ', selectedVenue.geometry.location)
        console.log('latitude: ', selectedVenue.geometry.location.lat)

        const address = selectedVenue.address_components.map(component => component.short_name).join(', ');

        const venueData = {
            name: selectedVenue.name,
            address: address,
            latitude: selectedVenue.geometry.location.lat(),
            longitude: selectedVenue.geometry.location.lng(),
        };

        console.log('Sending venue data:', venueData);

        try {
            const response = await fetch('/api/venues/checkOrCreate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(venueData),
            });
            const data = await response.json();
            return data.venueId;
        } catch (error) {
            console.error('Error checking or creating venue:', error);
            return null;
        }
    }

    return (
        <div>
            <h2>Create a New Event</h2>
            <input
                type="text"
                placeholder="Event Name"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
            />
            <input
                ref={autocompleteInputRef}
                type="text"
                placeholder="Location"
            />
            <input
                type="datetime-local"
                placeholder="Event Date and Time"
                value={newEventDateTime}
                onChange={(e) => setNewEventDateTime(e.target.value)}
            />
            <textarea
                className="input-style"
                placeholder="Additional Info"
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
            />
            <button className="submit-button" onClick={handleCreateEvent}>Submit</button>
        </div>
    );
}

export default CreateEvent;