import React from 'react';
import { Link } from 'react-router-dom';

function DatabaseOverview({ databaseData }) {

    if (!databaseData) return <div>Loading...</div>;

    // console.log('databaseData: ', databaseData);

    function parseInterval(interval) {
        let totalMinutes = 0;
        if (interval.hours) totalMinutes += interval.hours * 60;
        if (interval.minutes) totalMinutes += interval.minutes;
        if (interval.seconds) totalMinutes += interval.seconds / 60;

        return `${totalMinutes} minutes`;
    }

    return (
        <div>
            <h1>Database Overview</h1>
            <h2>Users</h2>
            <table>
                <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Password</th>
                </tr>
                </thead>
                <tbody>
                {databaseData.users.map((user) => (
                    <tr key={`user-${user.id}`}>
                        <td><Link to={`/users/${user.id}`}>{user.id}</Link></td>
                        <td>{user.name}</td>
                        <td>{user.email}</td>
                        <td>{user.password}</td>
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
                    <th>start_time</th>
                    <th>end_time</th>
                    <th>slot_duration</th>
                    <th>venue_id</th>
                    <th>host_id</th>
                </tr>
                </thead>
                <tbody>
                {databaseData.events.map((event) => (
                    <tr key={`event-${event.id}`}>
                        <td><Link to={`/events/${event.id}`}>{event.id}</Link></td>
                        <td>{event.name}</td>
                        <td>{event.additional_info}</td>
                        <td>{new Date(event.start_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</td>
                        <td>{new Date(event.end_time).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</td>
                        <td>{parseInterval(event.slot_duration)}</td>
                        <td>{event.venue_id}</td>
                        <td>
                            <Link to={`/users/${event.host_id}`}>{event.host_id}</Link>
                        </td>
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
                    <tr key={`venue-${venue.id}`}>
                        <td>{venue.id}</td>
                        <td>{venue.name}</td>
                        <td>{venue.address}</td>
                        <td>{venue.latitude}</td>
                        <td>{venue.longitude}</td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
    );
}

export default DatabaseOverview;

