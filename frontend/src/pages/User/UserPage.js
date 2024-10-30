import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function UserPage() {
    const { userId } = useParams();
    const [userData, setUserData] = useState(null);
    const { user } = useAuth(); // Get the logged-in user
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUserData = async () => {
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();
            setUserData(data);
        };
        fetchUserData();
    }, [userId]);

    if (!userData) return <div>Loading...</div>;

    // Debugging logs
    // console.log('Logged-in user:', user);
    // console.log('Logged-in user ID:', user?.id);
    // console.log('Profile user ID:', userId);
    // console.log('Type of logged-in user ID:', typeof user?.id);
    // console.log('Type of profile user ID:', typeof userId);

    return (
        <div>
            {user && String(user.id) === String(userId) && (
                <button onClick={() => navigate(`/users/${userId}/edit`)}>Edit Profile</button>
            )}
            <h1>User: {userData.user.name}</h1>
            {userData.user.image && <img src={userData.user.image} alt={`${userData.user.name}'s profile`} style={{ width: '150px', height: '150px', borderRadius: '50%' }} />}
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
