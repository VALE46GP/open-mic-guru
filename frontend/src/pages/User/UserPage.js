import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import EventCard from '../../components/events/EventCard';
import { socialMediaPlatforms } from '../../components/utils/socialMediaPlatforms';
import './UserPage.sass';
import { useWebSocketContext } from '../../context/WebSocketContext';
import { sortEventsByDate } from '../../utils/eventUtils';
import { BASE_URL } from '../../config';

function UserPage() {
    const { userId } = useParams();
    const [userData, setUserData] = useState(null);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const defaultImageUrl = 'https://open-mic-guru.s3.us-west-1.amazonaws.com/users/user-default.jpg';
    const { lastMessage } = useWebSocketContext();

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await fetch(`${BASE_URL}/users/${userId}`);
                const data = await response.json();
                setUserData(data);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        };
        fetchUserData();
    }, [userId]);

    useEffect(() => {
        if (!lastMessage) return;

        try {
            const update = JSON.parse(lastMessage.data);
            
            if (update.type === 'EVENT_UPDATE') {
                setUserData(prevData => {
                    if (!prevData) return prevData;

                    const updatedEvents = prevData.events.map(event => {
                        if (event.event_id === update.eventId) {
                            return {
                                ...event,
                                ...update.data,
                                event_id: event.event_id,
                                is_host: event.is_host,
                                is_performer: event.is_performer
                            };
                        }
                        return event;
                    });

                    return {
                        ...prevData,
                        events: updatedEvents
                    };
                });
            }
        } catch (err) {
            console.error('Error processing WebSocket message:', err);
        }
    }, [lastMessage]);

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

    const allSortedEvents = sortEventsByDate(userData.events);
    const splitIndex = allSortedEvents.findIndex(event => new Date(event.start_time) < new Date());
    const currentEvents = splitIndex === -1 ? allSortedEvents : allSortedEvents.slice(0, splitIndex);
    const pastEvents = splitIndex === -1 ? [] : allSortedEvents.slice(splitIndex);

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
                        {userData.user.bio && (
                            <div className="user-page__bio-section">
                                <p>{userData.user.bio || "This user hasn't written a bio yet."}</p>
                            </div>
                        )}
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

            {userData.user.social_media_accounts?.length > 0 && (
                <>
                    <h2>Social Media</h2>
                    <BorderBox className="user-page__social-media-box">
                        <div className="user-page__social-media-list">
                            {userData.user.social_media_accounts.map((account, index) => {
                                const IconComponent = getPlatformIcon(account.platform);
                                return (
                                    <div key={index} className="user-page__social-media-item">
                                        <a href={account.url} target="_blank" rel="noopener noreferrer">
                                            {IconComponent && <IconComponent className="user-page__social-media-icon"/>}
                                            <span>{account.platform}</span>
                                        </a>
                                    </div>
                                );
                            })}
                        </div>
                    </BorderBox>
                </>
            )}

            <h2>Upcoming Events</h2>
            {currentEvents.length > 0 ? (
                <div className="user-page__events-grid">
                    {currentEvents.map((event) => (
                        <EventCard
                            key={`event-${event.event_id}`}
                            event={event}
                            slotTime={event.is_performer ? event.performer_slot_time : null}
                            venue_timezone={event.venue_utc_offset}
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
                                venue_timezone={event.venue_utc_offset}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default UserPage;
