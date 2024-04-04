import React, { useState, useEffect } from 'react';
import { useDatabaseContext } from '../../hooks/useDatabaseContext';
import { useAuth } from '../../hooks/useAuth';
import VenueAutocomplete from '../shared/VenueAutocomplete';
import TextInput from '../shared/TextInput';
import LocationMap from '../shared/LocationMap';

function CreateEvent() {
    const [newEventName, setNewEventName] = useState('');
    const [newEventDateTime, setNewEventDateTime] = useState('');
    const [selectedVenue, setSelectedVenue] = useState(null);
    const [additionalInfo, setAdditionalInfo] = useState('');
    const [resetTrigger, setResetTrigger] = useState(false);
    const { updateDatabaseData, databaseData } = useDatabaseContext();
    const { getUserId } = useAuth();

    useEffect(() => {
        const checkGoogleMapsLoaded = setInterval(() => {
            if (window.google && window.google.maps) {
                console.log("Google Maps API is fully loaded");
                clearInterval(checkGoogleMapsLoaded);
                console.log('Google object:', window.google);
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
            setResetTrigger(true); // Trigger reset after form submission
        } catch (error) {
            console.error('Error creating event:', error);
        }
    };

    const handleResetComplete = () => {
        setResetTrigger(false);
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
            <TextInput
                placeholder="Event Name"
                value={newEventName}
                onChange={(e) => setNewEventName(e.target.value)}
            />
            <VenueAutocomplete onPlaceSelected={setSelectedVenue} resetTrigger={resetTrigger} onResetComplete={handleResetComplete} />
            <TextInput
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
            <LocationMap
                latitude={selectedVenue ? selectedVenue.geometry.location.lat() : null}
                longitude={selectedVenue ? selectedVenue.geometry.location.lng() : null}
            />
            <button className="submit-button" onClick={handleCreateEvent}>Submit</button>
        </div>
    );
}

export default CreateEvent;
