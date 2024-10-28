import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';

function UserPage() {
    const { userId } = useParams();
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();
            setUserData(data);
        };
        fetchUserData();
    }, [userId]);

    if (!userData) return <div>Loading...</div>;

    return (
        <div>
            <h1>User: {userData.user.name}</h1>
            <p>Email: {userData.user.email}</p>
            <h2>Events:</h2>
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
                    </tr>
                </thead>
                <tbody>
                    {userData.events.map((event) => (
                        <tr key={`event-${event.event_id}`}>
                            <td><Link to={`/events/${event.event_id}`}>{event.event_id}</Link></td>
                            <td>{event.event_name}</td>
                            <td>{event?.additional_info}</td>
                            <td>{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>{new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>{event.slot_duration.minutes} minutes</td>
                            <td><Link to={`/venues/${event.venue_id}`}>{event.venue_id}</Link></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default UserPage;
