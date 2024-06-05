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
                    </tr>
                </thead>
                <tbody>
                    {userData.events.map((event) => (
                        <tr key={`event-${event.id}`}>
                            <td><Link to={`/events/${event.id}`}>{event.id}</Link></td>
                            <td>{event.name}</td>
                            <td>{event?.additional_info}</td>
                            <td>{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>{new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td>{event.slot_duration.minutes} minutes</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default UserPage;
