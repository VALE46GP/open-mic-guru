import React, { useState } from 'react';

function DatabaseTest() {
    const [users, setUsers] = useState([]);
    const [events, setEvents] = useState([]);
    const [newUserName, setNewUserName] = useState('');
    const [newEventName, setNewEventName] = useState('');
    const [newVenueId, setNewVenueId] = useState('');
    const [newEventDateTime, setNewEventDateTime] = useState('');
    const [newEventAddress, setNewEventAddress] = useState('');
    const [newEventLatitude, setNewEventLatitude] = useState('');
    const [newEventLongitude, setNewEventLongitude] = useState('');

    // Handler for creating a new user
    const handleCreateUser = async () => {
        try {
            const response = await fetch('/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newUserName }),
            });
            const data = await response.json();
            setUsers([...users, data]);
            setNewUserName('');
        } catch (error) {
            console.error('Error creating user:', error);
        }
    };

    // Handler for creating a new event
    const handleCreateEvent = async () => {
        if (!(newEventAddress || (newEventLatitude && newEventLongitude))) {
            alert('An event must have either an address or both latitude and longitude.');
            return;
        }
        try {
            const response = await fetch('/events', {
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
            setEvents([...events, data]);
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

    // Render method with forms for user and event creation
    return (
        <div className="database-test">
            {/* Form for creating a new user */}
            <div>
                <h2>Create a New User</h2>
                <input
                    type="text"
                    placeholder="User Name"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                />
                <button onClick={handleCreateUser}>Submit</button>
            </div>

            {/* Form for creating a new event */}
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
        </div>
    );
}

export default DatabaseTest;
