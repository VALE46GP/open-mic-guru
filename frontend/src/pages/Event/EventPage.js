import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LocationMap from '../../components/shared/LocationMap';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './EventPage.sass';
import { QRCodeSVG } from 'qrcode.react';
import Lineup from '../../components/Lineup/Lineup';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../hooks/useAuth'; // Correct import here
import { useWebSocketContext } from '../../context/WebSocketContext';

const DEV_IP = '192.168.1.104';

function EventPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [eventDetails, setEventDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    // const [showDeleteConfirmModal,ShowDeleteConfirmModal set] = useState(false);
    const [qrUrl, setQrUrl] = useState('');
    const { lastMessage } = useWebSocketContext();

    // Call useAuth inside the component body
    const { getUserId, getToken, user } = useAuth();
    const userId = getUserId();

    useEffect(() => {
        // Set a unique identifier cookie for non-users if it doesn't already exist
        if (!document.cookie.includes('nonUserId')) {
            document.cookie = `nonUserId=${uuidv4()}; path=/; max-age=31536000`; // 1-year expiration
        }
    }, []);

    useEffect(() => {
        const fetchEventDetails = async () => {
            if (!eventId) {
                setError('No event ID provided');
                setIsLoading(false);
                return;
            }

            try {
                const response = await fetch(`/api/events/${eventId}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setEventDetails(data);
                setIsLoading(false);
            } catch (err) {
                console.error('Error fetching event details:', err);
                setError(err.message);
                setIsLoading(false);
            }
        };

        fetchEventDetails();
    }, [eventId]);

    useEffect(() => {
        const baseUrl = process.env.NODE_ENV === 'development'
            ? `http://${DEV_IP}:3000`
            : window.location.origin;
        setQrUrl(`${baseUrl}/events/${eventId}`);
    }, [eventId]);

    // Add WebSocket event handler
    useEffect(() => {
        if (!lastMessage) return;

        try {
            const update = JSON.parse(lastMessage.data);
            console.log('Parsed WebSocket update data:', update);

            if (update.type === 'LINEUP_UPDATE' && update.eventId === parseInt(eventId)) {
                console.log('Processing lineup update:', update);
                setEventDetails(prevDetails => {
                    if (!prevDetails) return prevDetails;

                    if (update.action === 'DELETE') {
                        return {
                            ...prevDetails,
                            lineup: prevDetails.lineup.filter(slot => slot.slot_id !== update.data.slotId)
                        };
                    } else if (update.action === 'CREATE') {
                        console.log('Creating new slot:', update.data);
                        const filteredLineup = prevDetails.lineup.filter(
                            slot => slot.slot_number !== update.data.slot_number
                        );

                        return {
                            ...prevDetails,
                            lineup: [
                                ...filteredLineup,
                                {
                                    ...update.data,
                                    user_image: update.data.user_image,
                                    slot_start_time: new Date(update.data.slot_start_time)
                                }
                            ].sort((a, b) => a.slot_number - b.slot_number)
                        };
                    } else if (update.action === 'REORDER') {
                        console.log('Reordering slots:', update.data);
                        const updatedLineup = prevDetails.lineup.map(slot => {
                            const updatedSlot = update.data.slots.find(s => s.slot_id === slot.slot_id);
                            return updatedSlot ? {
                                ...slot,
                                slot_number: updatedSlot.slot_number
                            } : slot;
                        });

                        return {
                            ...prevDetails,
                            lineup: updatedLineup.sort((a, b) => a.slot_number - b.slot_number)
                        };
                    }
                    return prevDetails;
                });
            } else if (update.type === 'EVENT_UPDATE' && update.eventId === parseInt(eventId)) {
                setEventDetails(prevDetails => {
                    if (!prevDetails) return null;
                    return {
                        ...prevDetails,
                        event: {
                            ...prevDetails.event,
                            ...update.data
                        }
                    };
                });
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    }, [lastMessage, eventId]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!eventDetails) return <div>No event found</div>;

    const generateAllSlots = () => {
        if (!eventDetails?.event) return [];

        // Calculate slots based on duration
        const slotsCount = Math.floor(
            (new Date(eventDetails.event.end_time) - new Date(eventDetails.event.start_time)) /
            (1000 * 60 * (eventDetails.event.slot_duration.minutes + eventDetails.event.setup_duration.minutes))
        );

        const startTime = new Date(eventDetails.event.start_time);
        const slotDuration = eventDetails.event.slot_duration.minutes;
        const setupDuration = eventDetails.event.setup_duration.minutes;

        // Generate array of all possible slots
        const slots = Array.from({ length: slotsCount }, (_, index) => {
            const slotNumber = index + 1;
            const existingSlot = eventDetails.lineup.find(slot => slot.slot_number === slotNumber);

            if (existingSlot) {
                return {
                    ...existingSlot,
                    slot_start_time: new Date(startTime.getTime() + index * (slotDuration + setupDuration) * 60000),
                    slot_duration: eventDetails.event.slot_duration,
                    setup_duration: eventDetails.event.setup_duration,
                    user_image: existingSlot.user_image
                };
            }

            return {
                slot_id: null,
                slot_number: slotNumber,
                slot_name: "Open",
                user_id: null,
                user_image: null,
                is_current_non_user: false,
                slot_start_time: new Date(startTime.getTime() + index * (slotDuration + setupDuration) * 60000),
                slot_duration: eventDetails.event.slot_duration,
                setup_duration: eventDetails.event.setup_duration
            };
        });

        return slots;
    };

    // Remove the local state update after successful POST
    const handleSlotClick = async (slot, slotName, isHostAssignment) => {
        // Only use the user's name if no custom name was provided
        const finalSlotName = (userId && !isHostAssignment && !slotName.trim())
            ? user.name
            : slotName;

        const response = await fetch('/api/lineup_slots/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_id: eventId,
                user_id: isHostAssignment ? null : userId,
                slot_number: slot.slot_number,
                slot_name: finalSlotName,
                isHostAssignment
            }),
        });

        if (response.status === 403) {
            alert('You can only sign up for one slot per event');
            return;
        }

        if (!response.ok) {
            alert('Failed to update slot');
        }
    };

    // Remove the local state update after successful DELETE
    const handleSlotDelete = async (slotId) => {
        console.log('Deleting slot:', slotId);
        const response = await fetch(`/api/lineup_slots/${slotId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error('Failed to delete slot:', response);
            alert('Failed to delete slot');
        } else {
            console.log('Successfully deleted slot');
        }
    };

    // When displaying event times
    const formatEventTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString([], {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        }).replace(',', ' at');
    };

    // const toggleDeleteConfirmModal = () => {
    //     setShowDeleteConfirmModal(!showDeleteConfirmModal);
    // };

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!eventDetails) return <div>No event found</div>;

    return (
        <div className="event-page">
            {eventDetails?.event?.active === false && (
                <div className="event-page__status-banner">
                    This event has been cancelled
                </div>
            )}
            <BorderBox
                onEdit={eventDetails?.host?.id === userId ? () => navigate(`/events/${eventDetails.event.id}/edit`) : null}
                // onDelete={eventDetails?.host?.id === userId ? toggleDeleteConfirmModal : null}
            >
                <h1 className="event-page__title">{eventDetails?.event?.name}</h1>
                <p className="event-page__time">
                    {new Date(eventDetails?.event?.start_time).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                    })}
                    {" - "}
                    <span className="event-page__end-time">
                        {new Date(eventDetails?.event?.start_time).toDateString() === new Date(eventDetails?.event?.end_time).toDateString()
                            ? new Date(eventDetails?.event?.end_time).toLocaleString([], {
                                hour: 'numeric',
                                minute: '2-digit'
                            })
                            : new Date(eventDetails?.event?.end_time).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                            })
                        }
                    </span>
                </p>
                {eventDetails?.event?.event_types && eventDetails.event.event_types.length > 0 && (
                    <div className="event-page__info">
                        <p className="event-page__types">{eventDetails.event.event_types.map(type =>
                            type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
                        ).join(', ')}
                        </p>
                    </div>
                )}
                {eventDetails?.event?.image && (
                    <div className="event-page__image-container">
                        <img
                            src={eventDetails.event.image}
                            alt={eventDetails.event.name}
                            className="event-page__event-image"
                        />
                    </div>
                )}
                <p className="event-page__info">Slot
                    Duration: {eventDetails?.event?.slot_duration?.minutes} minutes</p>
                <p className="event-page__info">Event Details: {eventDetails?.event?.additional_info}</p>
                <div className="event-page__host-image-container">
                    <Link to={`/users/${eventDetails?.host?.id}`}>
                        {eventDetails?.host?.image && (
                            <img
                                src={eventDetails.host.image}
                                alt={`${eventDetails.host.name}'s profile`}
                                className="event-page__host-image"
                            />
                        )}
                    </Link>
                </div>
                <p>
                    Hosted by:
                    <Link to={`/users/${eventDetails?.host?.id}`} className="event-page__host-link">
                        {eventDetails?.host?.name}
                    </Link>
                </p>
                <p className="event-page__info">
                    Location: {' '}
                    <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            `${eventDetails?.venue?.name}, ${eventDetails?.venue?.address}`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="event-page__location-link"
                    >
                        {eventDetails?.venue?.name}, {eventDetails?.venue?.address}
                    </a>
                </p>
                <div className="event-page__map-container">
                    {eventDetails?.venue?.latitude && eventDetails?.venue?.longitude && (
                        <LocationMap
                            latitude={eventDetails.venue.latitude}
                            longitude={eventDetails.venue.longitude}
                        />
                    )}
                </div>
                {eventDetails?.host?.id === userId && (
                    <div className="event-page__qr-container">
                        <QRCodeSVG
                            className="event-page__qr-code"
                            value={qrUrl}
                            level="H"
                        />
                        <p className="event-page__qr-url">{qrUrl}</p>
                    </div>
                )}
            </BorderBox>

            <Lineup
                slots={generateAllSlots()}
                isHost={eventDetails?.host?.id === userId}
                onSlotClick={handleSlotClick}
                onSlotDelete={handleSlotDelete}
                currentUserId={userId}
                currentNonUser={eventDetails?.currentNonUser}
                userName={user?.name}
                eventId={eventId}
            />

            {/* {showDeleteConfirmModal && (
                <div className="event-page__modal">
                    <BorderBox className="event-page__modal-content">
                        <h4>Are you sure you want to delete this event?</h4>
                        <button onClick={() => handleDeleteEvent(eventDetails.event.id)}>Confirm
                        </button>
                        <button onClick={toggleDeleteConfirmModal}>Cancel</button>
                    </BorderBox>
                </div>
            )} */}
        </div>
    );
}

export default EventPage;
