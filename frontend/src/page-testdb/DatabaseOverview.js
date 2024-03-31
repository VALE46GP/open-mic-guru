import React from 'react';
import { useDatabaseData } from '../context/DatabaseContext';

function DatabaseOverview() {
    const { databaseData } = useDatabaseData();

    if (!databaseData) return <div>Loading...</div>;
    console.log('databaseData: ', databaseData);

    return (
        <div>
            <h1>Database Overview</h1>
            <h2>Users</h2>
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                    </tr>
                </thead>
                <tbody>
                    {databaseData.users.map((user) => (
                        <tr key={`user-${user.id}`}> {/* Prefix with "user-" */}
                            <td>{user.id}</td>
                            <td>{user.name}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <h2>Events</h2>
            <table>
                <thead>
                    <tr>
                        <th>id</th>
                        <th>name</th>
                        <th>additional_info</th>
                        <th>date_ime</th>
                        <th>venue_id</th>
                    </tr>
                </thead>
                <tbody>
                    {databaseData.events.map((event) => (
                        <tr key={`event-${event.id}`}> {/* Prefix with "event-" */}
                            <td>{event.id}</td>
                            <td>{event.name}</td>
                            <td>{event.additional_info}</td>
                            <td>{new Date(event.date_time).toLocaleString()}</td>
                            <td>{event.venue_id}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <h2>Venues</h2>
            <table>
                <thead>
                    <tr>
                        <th>id</th>
                        <th>name</th>
                        <th>address</th>
                        <th>latitude</th>
                        <th>longitude</th>
                    </tr>
                </thead>
                <tbody>
                    {databaseData.venues.map((venue) => (
                        <tr key={`venue-${venue.id}`}> {/* Prefix with "venue-" */}
                            <td>{venue.id}</td>
                            <td>{venue.name}</td>
                            <td>{venue.address}</td>
                            <td>{venue.latitude}</td>
                            <td>{venue.longitude}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {/* Repeat for other data types like venues, etc. */}
        </div>
    );
}

export default DatabaseOverview;
