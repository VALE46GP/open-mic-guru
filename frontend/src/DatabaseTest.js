import React, { useState, useEffect } from 'react';

function DatabaseTest() {
    const [users, setUsers] = useState([]);
    const [events, setEvents] = useState([]);
    const [newUserName, setNewUserName] = useState('');
    const [newEventName, setNewEventName] = useState('');

    // Fetch users from the database
    useEffect(() => {
        fetch('/users')
            .then(response => response.json())
            .then(data => setUsers(data))
            .catch(error => console.error('Error fetching users:', error));
    }, []);

    // Fetch events from the database
    useEffect(() => {
        fetch('/events')
            .then(response => response.json())
            .then(data => setEvents(data))
            .catch(error => console.error('Error fetching events:', error));
    }, []);

    // Handler for creating a new user
    const handleCreateUser = () => {
        fetch('/users', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newUserName }),
        })
            .then(response => response.json())
            .then(data => {
                setUsers([...users, data]);
                setNewUserName('');
            })
            .catch(error => console.error('Error creating user:', error));
    };

    // Handler for creating a new event
    const handleCreateEvent = () => {
        fetch('/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newEventName }),
        })
            .then(response => response.json())
            .then(data => {
                setEvents([...events, data]);
                setNewEventName('');
            })
            .catch(error => console.error('Error creating event:', error));
    };

    return (
        <div className="database-test">
            <h1>Users</h1>
            <ul>
                {users.map(user => (
                    <li key={user.id}>{user.name}</li>
                ))}
            </ul>
            <input
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
                placeholder="Enter new user name"
            />
            <button onClick={handleCreateUser}>Create User</button>

            <h1>Events</h1>
            <ul>
                {events.map(event => (
                    <li key={event.id}>{event.name}</li>
                ))}
            </ul>
            <input
                value={newEventName}
                onChange={e => setNewEventName(e.target.value)}
                placeholder="Enter new event name"
            />
            <button onClick={handleCreateEvent}>Create Event</button>
        </div>
    );
}

export default DatabaseTest;
