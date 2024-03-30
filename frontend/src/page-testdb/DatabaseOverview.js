import React from 'react';
import { useDatabaseData } from '../context/DatabaseContext';

function DatabaseOverview() {
    const { databaseData } = useDatabaseData();

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
