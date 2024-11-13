import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import EventCard from '../../components/events/EventCard';
import { socialMediaPlatforms } from '../../components/utils/socialMediaPlatforms'; // Import socialMediaPlatforms array
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

    // Helper function to get the correct icon component based on platform name
    const getPlatformIcon = (platformName) => {
        const platform = socialMediaPlatforms.find((p) => p.name === platformName);
        return platform ? platform.icon : null;
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
                        </div>
                    </div>

                    {/* Social Media Section */}
                    <div className="user-page__social-media-list">
                        {userData.user.social_media_accounts.map((account, index) => {
                            const IconComponent = getPlatformIcon(account.platform); // Use the helper function here
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
                </div>
            </BorderBox>

            {/* Events Section */}
            <div className="user-page__events-section">
                <h2>Events</h2>
                {userData.events.length > 0 ? (
                    <div className="user-page__events-grid">
                        {userData.events.map((event) => (
                            <EventCard
                                key={`event-${event.event_id}`}
                                event={event}
                                slotTime={event.is_performer ? event.performer_slot_time : null}
                            />
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
