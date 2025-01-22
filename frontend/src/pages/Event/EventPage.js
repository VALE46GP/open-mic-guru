import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { calculateSlotStartTime, formatEventStartEndTimes } from '../../utils/timeCalculations';
import LocationMap from '../../components/shared/LocationMap';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './EventPage.sass';
import { QRCodeSVG } from 'qrcode.react';
import Lineup from '../../components/Lineup/Lineup';
// import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../hooks/useAuth';
import { useWebSocketContext } from '../../context/WebSocketContext';

const DEV_IP = '192.168.1.104';

function EventPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [eventDetails, setEventDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [qrUrl, setQrUrl] = useState('');
    const [formattedStartTime, setFormattedStartTime] = useState('');
    const [formattedEndTime, setFormattedEndTime] = useState('');
    const { lastMessage } = useWebSocketContext();
    const { getUserId, user } = useAuth();
    const userId = getUserId();

    // Temporarily disabled non-user identification
    // useEffect(() => {
    //     // Set a unique identifier cookie for non-users if it doesn't already exist
    //     if (!document.cookie.includes('nonUserId')) {
    //         document.cookie = `nonUserId=${uuidv4()}; path=/; max-age=31536000`; // 1-year expiration
    //     }
    // }, []);

    // Process the event data outside useEffect
    useEffect(() => {
        // Only run this effect if eventDetails exists and has changed
        const updateUserRoles = () => {
            if (!eventDetails) return;
            
            const isHost = userId ? eventDetails.host_id === userId : false;
            const isPerformer = userId ? eventDetails.performers?.includes(userId) : false;
            
            // Only update if these values actually changed
            if (eventDetails.is_host !== isHost || eventDetails.is_performer !== isPerformer) {
                setEventDetails(prev => ({
                    ...prev,
                    is_host: isHost,
                    is_performer: isPerformer,
                }));
            }
        };

        updateUserRoles();
    }, [eventDetails, userId]); // Include both dependencies

    // Fetch event data without userId dependency
    useEffect(() => {
        const fetchEventData = async () => {
            try {
                const response = await fetch(`/api/events/${eventId}`);
                if (response.status === 410) {
                    navigate('/events', { 
                        replace: true,
                        state: { message: 'This event has been deleted' }
                    });
                    return;
                }
                const { data } = await response.json();
                setEventDetails(data);
                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching event data:', error);
                setError(error.message);
                setIsLoading(false);
            }
        };
        fetchEventData();
    }, [eventId, navigate]);

    useEffect(() => {
        const baseUrl = process.env.NODE_ENV === 'development'
            ? `http://${DEV_IP}:3001`
            : window.location.origin;
        setQrUrl(`${baseUrl}/events/${eventId}`);
    }, [eventId]);

    // Add WebSocket event handler
    useEffect(() => {
        if (!lastMessage) return;

        try {
            const update = JSON.parse(lastMessage.data);
            
            if (update.type === 'LINEUP_UPDATE' && update.eventId === parseInt(eventId)) {
                setEventDetails(prevDetails => {
                    if (!prevDetails) return prevDetails;

                    let newLineup;
                    if (update.action === 'DELETE') {
                        newLineup = prevDetails.lineup.filter(slot => slot.slot_id !== update.data.slotId);
                    } else if (update.action === 'CREATE') {
                        const filteredLineup = prevDetails.lineup.filter(
                            slot => slot.slot_number !== update.data.slot_number
                        );

                        const newSlot = {
                            slot_id: update.data.slot_id,
                            slot_number: update.data.slot_number,
                            slot_name: update.data.slot_name,
                            user_id: update.data.user_id,
                            user_name: update.data.user_name,
                            user_image: update.data.user_image,
                            slot_start_time: new Date(update.data.slot_start_time),
                            non_user_identifier: update.data.non_user_identifier,
                            ip_address: update.data.ip_address
                        };

                        newLineup = [...filteredLineup, newSlot]
                            .sort((a, b) => a.slot_number - b.slot_number);
                    } else if (update.action === 'REORDER') {
                        newLineup = prevDetails.lineup.map(slot => {
                            const updatedSlot = update.data.slots.find(s => s.slot_id === slot.slot_id);
                            return updatedSlot ? {
                                ...slot,
                                slot_number: updatedSlot.slot_number
                            } : slot;
                        }).sort((a, b) => a.slot_number - b.slot_number);
                    } else {
                        return prevDetails;
                    }

                    // Only update if the lineup actually changed
                    if (JSON.stringify(newLineup) !== JSON.stringify(prevDetails.lineup)) {
                        return {
                            ...prevDetails,
                            lineup: newLineup
                        };
                    }
                    return prevDetails;
                });
            } else if (update.type === 'EVENT_UPDATE' && update.eventId === parseInt(eventId)) {
                setEventDetails(prevDetails => {
                    if (!prevDetails) return null;
                    
                    // Only update if the data actually changed
                    const newEventData = {
                        ...prevDetails.event,
                        ...update.data
                    };
                    
                    if (JSON.stringify(newEventData) !== JSON.stringify(prevDetails.event)) {
                        return {
                            ...prevDetails,
                            event: newEventData
                        };
                    }
                    return prevDetails;
                });
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    }, [lastMessage, eventId, userId]);

    useEffect(() => {
        async function updateFormattedTimes() {
            if (!eventDetails?.event || !eventDetails?.venue) return;
            
            const venue = {
                latitude: eventDetails.venue.latitude,
                longitude: eventDetails.venue.longitude,
                utc_offset: eventDetails.venue.utc_offset
            };
            
            const { start, end } = formatEventStartEndTimes(
                eventDetails.event.start_time,
                eventDetails.event.end_time,
                venue
            );
            
            setFormattedStartTime(start);
            setFormattedEndTime(end);
        }
        
        updateFormattedTimes();
    }, [eventDetails]);

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!eventDetails) return <div>No event found</div>;

    const generateAllSlots = () => {
        if (!eventDetails?.event) return [];

        // Calculate total slots based on event duration and slot duration
        const startTime = new Date(eventDetails.event.start_time);
        const endTime = new Date(eventDetails.event.end_time);
        const totalMinutes = (endTime - startTime) / (1000 * 60);
        const slotDurationMinutes = eventDetails.event.slot_duration.minutes;
        const setupDurationMinutes = eventDetails.event.setup_duration.minutes;
        const totalSlotsCount = Math.floor(totalMinutes / (slotDurationMinutes + setupDurationMinutes));

        return Array.from({ length: totalSlotsCount }, (_, index) => {
            const slotNumber = index + 1;
            const existingSlot = eventDetails.lineup.find(slot => slot.slot_number === slotNumber);
            const slotTime = calculateSlotStartTime(
                eventDetails.event.start_time,  // Already in UTC from backend
                slotNumber,
                eventDetails.event.slot_duration,
                eventDetails.event.setup_duration
            );

            if (existingSlot) {
                return {
                    ...existingSlot,
                    slot_start_time: slotTime,
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
                slot_start_time: slotTime,
                slot_duration: eventDetails.event.slot_duration,
                setup_duration: eventDetails.event.setup_duration,
                is_open: true
            };
        });
    };

    // Remove the local state update after successful POST
    const handleSlotClick = async (slot, slotName, isHostAssignment) => {
        // If user is not logged in and this isn't a host assignment, redirect to login
        if (!userId && !isHostAssignment) {
            // Save the current event URL to redirect back after login
            const returnUrl = `/events/${eventId}`;
            navigate('/login', { state: { returnUrl } });
            return;
        }

        // Only use the user's name if no custom name was provided
        const finalSlotName = (userId && !isHostAssignment && !slotName.trim())
            ? user.name
            : slotName;

        // // Get nonUserId from cookies - Temporarily disabled
        // const getCookie = (name) => {
        //     const value = `; ${document.cookie}`;
        //     const parts = value.split(`; ${name}=`);
        //     if (parts.length === 2) return parts.pop().split(';').shift();
        // };
        // const nonUserId = getCookie('nonUserId');

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
                isHostAssignment,
                // nonUserId: !userId ? nonUserId : null  // Temporarily disabled - Include nonUserId if there's no userId
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
        }
    };

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
            >
                <h1 className="event-page__title">{eventDetails?.event?.name}</h1>
                <p className="event-page__time">
                    {formattedStartTime} - {formattedEndTime}
                </p>
                {eventDetails?.event?.event_types && eventDetails.event.event_types.length > 0 && (
                    <div className="event-page__info">
                        <p>Performance Type(s): <span className="event-page__types">{eventDetails.event.event_types.map(type =>
                            type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')
                        ).join(', ')}</span>
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
                <p className="event-page__info">Performance
                    Duration: {eventDetails?.event?.slot_duration?.minutes} minutes</p>
                {eventDetails?.event?.additional_info && (
                    <p className="event-page__info">Details: {eventDetails.event.additional_info}</p>
                )}
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
                        {eventDetails?.venue?.name}
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
                isEventActive={eventDetails?.event?.active}
                initialSignupStatus={eventDetails?.event?.is_signup_open}
                eventId={eventDetails?.event?.id}
            />
        </div>
    );
}

export default EventPage;
