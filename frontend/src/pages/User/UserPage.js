import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './UserPage.sass';

function UserPage() {
    const { userId } = useParams();
    const [userData, setUserData] = useState(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const defaultImageUrl = 'https://open-mic-guru.s3.us-west-1.amazonaws.com/users/user-default.jpg';

    useEffect(() => {
        const fetchUserData = async () => {
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();
            setUserData(data);
        };
        fetchUserData();
    }, [userId]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!userData) return <div>Loading...</div>;

    const isOwnProfile = user && String(user.id) === String(userId);

    return (
        <div className="user-page">
            {isOwnProfile && (
                <button onClick={handleLogout} className="user-page__logout-button">
                    Logout
                </button>
            )}

            <h1 className="user-page__title">User Profile</h1>

            <BorderBox
                onEdit={isOwnProfile ? () => navigate(`/users/${userId}/edit`) : null}
                className="user-page__profile-box"
            >
                <div className="user-page__profile-content">
                    <div className="user-page__profile-section">
                        <div className="user-page__image-container">
                            <img
                                src={userData.user.image || defaultImageUrl}
                                alt={`${userData.user.name}'s profile`}
                                className="user-page__profile-image"
                            />
                        </div>
                        <div className="user-page__user-info">
                            <h2>{userData.user.name}</h2>
                            {/*<p>{userData.user.email}</p>*/}
                        </div>
                    </div>

                    <div className="user-page__social-media-section">
                        <h3>Social Media Accounts</h3>
                        {userData.user.social_media_accounts && 
                         userData.user.social_media_accounts.length > 0 ? (
                            <div className="user-page__social-media-list">
                                {userData.user.social_media_accounts.map((account, index) => (
                                    <div key={index} className="user-page__social-media-item">
                                        <a 
                                            href={account.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                        >
                                            {account.platform}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="user-page__no-social">No social media accounts linked</p>
                        )}
                    </div>
                </div>
            </BorderBox>

            <BorderBox className="user-page__events-box">
                <h3>Events</h3>
                {userData.events.length > 0 ? (
                    <table className="user-page__events-table">
                        <thead>
                            <tr>
                                <th>Event</th>
                                <th>Info</th>
                                <th>Time</th>
                                <th>Duration</th>
                                <th>Venue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userData.events.map((event) => (
                                <tr key={`event-${event.event_id}`}>
                                    <td>
                                        <Link to={`/events/${event.event_id}`}>
                                            {event.event_name}
                                        </Link>
                                    </td>
                                    <td>{event?.additional_info}</td>
                                    <td>
                                        {new Date(event.start_time).toLocaleTimeString([], { 
                                            hour: '2-digit', 
                                            minute: '2-digit' 
                                        })}
                                    </td>
                                    <td>{event.slot_duration.minutes} minutes</td>
                                    <td>
                                        <Link to={`/venues/${event.venue_id}`}>
                                            {event.venue_id || 'Unknown Venue'}
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p>No events found</p>
                )}
            </BorderBox>
        </div>
    );
}

export default UserPage;
