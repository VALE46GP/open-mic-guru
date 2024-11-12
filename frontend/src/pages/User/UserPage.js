import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import EventCard from '../../components/events/EventCard';
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
                            <h1>{userData.user.name}</h1>
                            {/*<p>{userData.user.email}</p>*/}
                        </div>
                    </div>

                    <div className="user-page__social-media-section">
                        <span className="user-page__social-media-title">Social Media Accounts</span>
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

            <div className="user-page__events-section">
                <h2>Events</h2>
                {userData.events.length > 0 ? (
                    <div className="user-page__events-grid">
                        {userData.events.map((event) => (
                            <div key={`event-${event.event_id}`} className="user-page__event-wrapper">
                                <div className="user-page__event-role">
                                    {event.is_host && <span className="user-page__role-badge host">Host</span>}
                                    {event.is_performer && <span className="user-page__role-badge user-page__performer">Performer</span>}
                                </div>
                                <EventCard 
                                    event={event} 
                                    slotTime={event.is_performer ? event.performer_slot_time : null}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No events found</p>
                )}
            </div>
        </div>
    );
}

export default UserPage;
