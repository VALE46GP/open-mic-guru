import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LocationMap from '../../components/shared/LocationMap';
import { useAuth } from '../../hooks/useAuth';
import { ReactComponent as EditIcon } from '../../assets/icons/edit.svg';
import { ReactComponent as DeleteIcon } from '../../assets/icons/delete.svg';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './EventPage.sass';
import { QRCodeSVG } from 'qrcode.react';
import Lineup from '../../components/Lineup/Lineup';
import { v4 as uuidv4 } from 'uuid';

const DEV_IP = '192.168.1.104';

function EventPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [eventDetails, setEventDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const { getUserId } = useAuth();
    const userId = getUserId();
    const [showModal, setShowModal] = useState(false);
    const [currentSlot, setCurrentSlot] = useState(null);
    const [currentSlotName, setCurrentSlotName] = useState('');
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [qrUrl, setQrUrl] = useState('');

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

    if (isLoading) return <div>Loading...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!eventDetails) return <div>No event found</div>;

    const generateAllSlots = () => {
        console.log("Event Details:", eventDetails);
        if (!eventDetails?.event) return [];

        const startTime = new Date(eventDetails.event.start_time);
        const endTime = new Date(eventDetails.event.end_time);
        const slotDuration = eventDetails.event.slot_duration.minutes;
        const setupDuration = eventDetails.event.setup_duration.minutes;
        const totalDuration = (endTime - startTime) / (1000 * 60); // Duration in minutes
        const slotsCount = Math.floor(totalDuration / (slotDuration + setupDuration));

        // Generate array of all possible slots
        const slots = Array.from({ length: slotsCount }, (_, index) => {
            const slotNumber = index + 1;
            const existingSlot = eventDetails.lineup.find(slot => slot.slot_number === slotNumber);

            if (existingSlot) {
                return {
                    ...existingSlot,
                    slot_start_time: new Date(startTime.getTime() + index * (slotDuration + setupDuration) * 60000)
                };
            }

            return {
                slot_id: null,
                slot_number: slotNumber,
                slot_name: "Open",
                user_id: null,
                is_current_non_user: false,
                slot_start_time: new Date(startTime.getTime() + index * (slotDuration + setupDuration) * 60000)
            };
        });

        console.log("Generated slots:", slots);
        return slots;
    };

    const handleUnsign = async (slotId) => {
        const response = await fetch(`/api/lineup_slots/${slotId}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            setEventDetails(prevDetails => ({
                ...prevDetails,
                lineup: prevDetails.lineup.filter(slot => slot.slot_id !== slotId)
            }));
        } else {
            console.error('Failed to unsign');
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (window.confirm("Are you sure you want to delete this event?")) {
            try {
                const response = await fetch(`/api/events/${eventId}`, {
                    method: 'DELETE'
                });
                if (response.ok) {
                    navigate('/events'); // Redirect to events list after deletion
                } else {
                    console.error('Failed to delete the event');
                }
            } catch (error) {
                console.error('Error deleting event:', error);
            }
        }
    };

    const toggleDeleteConfirmModal = () => {
        setShowDeleteConfirmModal(!showDeleteConfirmModal);
    };

    return (
        <div className="event-page">
            <BorderBox
                onEdit={eventDetails?.host?.id === userId ? () => navigate(`/events/${eventDetails.event.id}/edit`) : null}
                onDelete={eventDetails?.host?.id === userId ? toggleDeleteConfirmModal : null}
                maxWidth="600px"
            >
                <h1 className="event-page__title">{eventDetails?.event?.name}</h1>
                <p className="event-page__info">
                    {new Date(eventDetails?.event?.start_time).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} -
                    {new Date(eventDetails?.event?.start_time).toDateString() === new Date(eventDetails?.event?.end_time).toDateString() ?
                        new Date(eventDetails?.event?.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                        new Date(eventDetails?.event?.end_time).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="event-page__info">Hosted by: {eventDetails?.host?.name}</p>
                <p className="event-page__info">Slot Duration: {eventDetails?.event?.slot_duration?.minutes} minutes</p>
                <p className="event-page__info">Additional Info: {eventDetails?.event?.additional_info}</p>
                <p className="event-page__info">Location: {eventDetails?.venue?.name}, {eventDetails?.venue?.address}</p>
                <div className="event-page__map-container">
                    {eventDetails?.venue?.latitude && eventDetails?.venue?.longitude && (
                        <LocationMap
                            latitude={eventDetails.venue.latitude}
                            longitude={eventDetails.venue.longitude}
                        />
                    )}
                </div>
                <div className="event-page__qr-container">
                    <QRCodeSVG
                        className="event-page__qr-code"
                        value={qrUrl}
                        level="H"
                    />
                    <p className="event-page__qr-url">{qrUrl}</p>
                </div>
            </BorderBox>

            <Lineup 
                slots={generateAllSlots()}
                isHost={eventDetails?.host?.id === userId}
                currentUserId={userId}
                currentNonUser={eventDetails?.currentNonUser}
                onSlotClick={async (slot, slotName, isHostAssignment) => {
                    const response = await fetch('/api/lineup_slots/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            event_id: eventId,
                            user_id: isHostAssignment ? null : userId,
                            slot_number: slot.slot_number,
                            slot_name: slotName,
                            isHostAssignment
                        }),
                    });

                    if (response.status === 403) {
                        alert('You can only sign up for one slot per event');
                        return;
                    }

                    const data = await response.json();
                    if (response.ok) {
                        setEventDetails(prevDetails => {
                            const newSlot = {
                                ...data,
                                non_user_identifier: prevDetails.currentNonUser?.identifier,
                                ip_address: prevDetails.currentNonUser?.ipAddress,
                                is_current_non_user: true // This slot belongs to the current non-user
                            };
                            return {
                                ...prevDetails,
                                lineup: [...prevDetails.lineup, newSlot]
                            };
                        });
                    }
                }}
                onSlotDelete={handleUnsign}
            />

            {showDeleteConfirmModal && (
                <div className="event-page__modal">
                    <div className="event-page__modal-content">
                        <h4>Are you sure you want to delete this event?</h4>
                        <button onClick={() => handleDeleteEvent(eventDetails.event.id)}>Confirm</button>
                        <button onClick={toggleDeleteConfirmModal}>Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default EventPage;
