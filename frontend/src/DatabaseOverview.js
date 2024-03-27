import React, { useState, useEffect } from 'react';

function DatabaseOverview() {
    const [databaseData, setDatabaseData] = useState(null);

    useEffect(() => {
        fetch('/testdb')
            .then(response => response.json())
            .then(data => setDatabaseData(data))
            .catch(error => console.error('Error fetching database data:', error));
    }, []);

    if (!databaseData) return <div>Loading...</div>;

    return (
        <div>
            <h1>Database Overview</h1>
            <h2>Users</h2>
            <ul>
                {databaseData.users.map((user) => (
                    <li key={user.id}>{user.name}</li>
                ))}
            </ul>
            <h2>Events</h2>
            <ul>
                {databaseData.events.map((event) => (
                    <li key={event.id}>{event.additional_info} - {new Date(event.date_time).toLocaleString()}</li>
                ))}
            </ul>
            {/* Repeat for other data types like venues, etc. */}
        </div>
    );
}

export default DatabaseOverview;
