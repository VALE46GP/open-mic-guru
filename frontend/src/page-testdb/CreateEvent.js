import React, { useState } from 'react';
import { useDatabaseData } from '../context/DatabaseContext';

function CreateEvent() {
    const [newEventName, setNewEventName] = useState('');
    const [newVenueId, setNewVenueId] = useState('');
    const [newEventDateTime, setNewEventDateTime] = useState('');
    const [newEventAddress, setNewEventAddress] = useState('');
    const [newEventLatitude, setNewEventLatitude] = useState('');
    const [newEventLongitude, setNewEventLongitude] = useState('');
    const { updateDatabaseData, databaseData } = useDatabaseData();

    const handleCreateEvent = async () => {
        if (!(newEventAddress || (newEventLatitude && newEventLongitude))) {
            alert('An event must have either an address or both latitude and longitude.');
            return;
        }
        try {
            const response = await fetch('/api/events', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newEventName,
                    venue_id: newVenueId,
                    date_time: newEventDateTime,
                    address: newEventAddress,
                    latitude: newEventLatitude,
                    longitude: newEventLongitude,
                }),
            });
            const data = await response.json();
            updateDatabaseData({
              ...databaseData,
              events: [...databaseData.events, data]
            });
            setNewEventName('');
            setNewVenueId('');
            setNewEventDateTime('');
            setNewEventAddress('');
            setNewEventLatitude('');
            setNewEventLongitude('');
        } catch (error) {
            console.error('Error creating event:', error);
        }
    };

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
                    type="text"
                    placeholder="Venue ID"
                    value={newVenueId}
                    onChange={(e) => setNewVenueId(e.target.value)}
                />
                <input
                    type="datetime-local"
                    placeholder="Event Date and Time"
                    value={newEventDateTime}
                    onChange={(e) => setNewEventDateTime(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Event Address"
                    value={newEventAddress}
                    onChange={(e) => setNewEventAddress(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Latitude"
                    value={newEventLatitude}
                    onChange={(e) => setNewEventLatitude(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Longitude"
                    value={newEventLongitude}
                    onChange={(e) => setNewEventLongitude(e.target.value)}
                />
                <button onClick={handleCreateEvent}>Submit</button>
            </div>
    );
}

export default CreateEvent;
