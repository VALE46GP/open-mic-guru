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
        if (!eventDetails.event || !eventDetails.lineup) {
            console.error("Event details or lineup missing");
            return [];
        }
        const startTime = new Date(eventDetails.event.start_time).getTime();
        const endTime = new Date(eventDetails.event.end_time).getTime();
        const slotDuration = (eventDetails.event.slot_duration.minutes + eventDetails.event.setup_duration.minutes) * 60000;
        const totalSlots = Math.ceil((endTime - startTime) / slotDuration);

        return Array.from({ length: totalSlots }, (_, index) => {
            const slotStartTime = new Date(startTime + index * slotDuration);
            const matchingSlot = eventDetails.lineup.find(slot => slot.slot_number === index + 1);

            return {
                slot_id: matchingSlot ? matchingSlot.slot_id : null,
                slot_number: index + 1,
                slot_start_time: slotStartTime,
                slot_name: matchingSlot ? (matchingSlot.slot_name || matchingSlot.user_name) : "Open",
                user_id: matchingSlot ? matchingSlot.user_id : null
            };
        });
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
                onSlotClick={async (slot, slotName) => {
                    const response = await fetch('/api/lineup_slots/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            event_id: eventId,
                            user_id: userId || null,
                            slot_number: slot.slot_number,
                            slot_name: slotName
                        }),
                    });
                    const data = await response.json();
                    if (response.ok) {
                        setEventDetails(prevDetails => ({
                            ...prevDetails,
                            lineup: [...prevDetails.lineup, data]
                        }));
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
