import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import EventCard from '../../components/events/EventCard';
import { socialMediaPlatforms } from '../../components/utils/socialMediaPlatforms';
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

    const getPlatformIcon = (platformName) => {
        const platform = socialMediaPlatforms.find((p) => p.name === platformName);
        return platform ? platform.icon : null;
    };

    if (!userData) return <div>Loading...</div>;

    const isOwnProfile = user && String(user.id) === String(userId);

    const currentEvents = userData?.events.filter(event => new Date(event.start_time) >= new Date()) || [];
    const pastEvents = (userData?.events
      .filter(event => new Date(event.start_time) < new Date())
      .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))) || [];

    return (
        <div className="user-page">
            <div className="user-page__header">
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
                    </div>
                </div>
                {isOwnProfile && (
                    <div className="user-page__actions">
                        <button 
                            onClick={() => navigate(`/users/${userId}/edit`)} 
                            className="user-page__edit-button"
                        >
                            Edit Profile
                        </button>
                        <button 
                            onClick={handleLogout} 
                            className="user-page__logout-button"
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>

            {userData.user.social_media_accounts.length > 0 && (
                <>
                    <h2>Social Media</h2>
                    <BorderBox className="user-page__social-media-box">
                        <div className="user-page__social-media-list">
                            {userData.user.social_media_accounts.map((account, index) => {
                                const IconComponent = getPlatformIcon(account.platform);
                                return (
                                    <div key={index} className="user-page__social-media-item">
                                        <a href={account.url} target="_blank" rel="noopener noreferrer">
                                            {IconComponent && <IconComponent className="user-page__social-media-icon" />}
                                            <span>{account.platform}</span>
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    </BorderBox>
                </>
            )}

            <div className="user-page__events-section">
                <h2>Upcoming Events</h2>
                {currentEvents.length > 0 ? (
                    <div className="user-page__events-grid">
                        {currentEvents.map((event) => (
                            <EventCard
                                key={`event-${event.event_id}`}
                                event={event}
                                slotTime={event.is_performer ? event.performer_slot_time : null}
                            />
                        ))}
                    </div>
                ) : (
                    <p>No upcoming events</p>
                )}

                {pastEvents.length > 0 && (
                    <>
                        <h2>Past Events</h2>
                        <div className="user-page__events-grid">
                            {pastEvents.map((event) => (
                                <EventCard
                                    key={`event-${event.event_id}`}
                                    event={event}
                                    slotTime={event.is_performer ? event.performer_slot_time : null}
                                />
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default UserPage;
