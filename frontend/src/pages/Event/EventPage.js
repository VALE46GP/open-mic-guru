import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LocationMap from '../../components/shared/LocationMap';
import { useAuth } from '../../hooks/useAuth';
import { ReactComponent as EditIcon } from '../../assets/icons/edit.svg';
import { ReactComponent as DeleteIcon } from '../../assets/icons/delete.svg';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './EventPage.sass';
import { QRCodeSVG } from 'qrcode.react';

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

    const handleConfirmSignUp = async () => {
        if (!currentSlot) {
            console.error("No slot selected");
            return;
        } else if (currentSlot.slot_id || (currentSlot.slot_name && currentSlot.slot_name !== "Open")) {
            console.error("Slot already taken");
            return;
        }
        const response = await fetch('/api/lineup_slots/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                event_id: eventId,
                user_id: userId || null,
                slot_number: currentSlot.slot_number,
                slot_name: currentSlotName
            }),
        });
        const data = await response.json();
        if (response.ok) {
            setEventDetails(prevDetails => ({
                ...prevDetails,
                lineup: [...prevDetails.lineup, data]
            }));
        }
        setShowModal(false);
    };

    const handleOverlayClick = () => {
        setShowModal(false);
        setCurrentSlot(null); // Unselect the slot
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

    function Slot({ slot, onClick, onDelete, isHost }) {
        const slotContent = (
            <div
                className={`event-details__lineup__slot ${slot.slot_name === "Open" ? 'clickable' : ''}`}
                onClick={slot.slot_name === "Open" ? onClick : undefined}
                style={{ cursor: slot.slot_name === "Open" ? 'pointer' : 'default' }}
                role="button"
                tabIndex={0}
            >
                <div className="slot-number">{slot.slot_number}</div>
                <div className="slot-time">{slot.slot_start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="slot-artist">
                    {slot.slot_name}
                    {isHost && (
                        <div
                            className="event-details__button event-details__button--delete"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent row click event
                                onDelete(slot.slot_id);
                            }}
                            role="button"
                            tabIndex={0}
                        >
                            <DeleteIcon />
                        </div>
                    )}
                </div>
            </div>
        );

        return slot.user_id ? (
            <Link
                to={`/users/${slot.user_id}`}
                className="event-details__lineup__slot-link slot-link-pointer"
                style={{
                    textDecoration: 'none',
                    color: 'inherit',
                    display: 'block',
                }}
            >
                {slotContent}
            </Link>
        ) : (
            slotContent
        );
    }

    return (
        <div className="event-details">
            <BorderBox
                onEdit={eventDetails?.host?.id === userId ? () => navigate(`/events/${eventDetails.event.id}/edit`) : null}
                onDelete={eventDetails?.host?.id === userId ? toggleDeleteConfirmModal : null}
                maxWidth="600px"
            >
                <h1 className="event-details__title">{eventDetails?.event?.name}</h1>
                <p className="event-details__info">
                    {new Date(eventDetails?.event?.start_time).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} -
                    {new Date(eventDetails?.event?.start_time).toDateString() === new Date(eventDetails?.event?.end_time).toDateString() ?
                        new Date(eventDetails?.event?.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) :
                        new Date(eventDetails?.event?.end_time).toLocaleString([], { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="event-details__info">Hosted by: {eventDetails?.host?.name}</p>
                <p className="event-details__info">Slot Duration: {eventDetails?.event?.slot_duration?.minutes} minutes</p>
                <p className="event-details__info">Additional Info: {eventDetails?.event?.additional_info}</p>
                <p className="event-details__info">Location: {eventDetails?.venue?.name}, {eventDetails?.venue?.address}</p>
                <div className="event-details__map-container">
                    {eventDetails?.venue?.latitude && eventDetails?.venue?.longitude && (
                        <LocationMap
                            latitude={eventDetails.venue.latitude}
                            longitude={eventDetails.venue.longitude}
                        />
                    )}
                </div>
                <div className="event-details__qr-container">
                    <QRCodeSVG 
                        value={qrUrl}
                        size={128}
                        level="H"
                        includeMargin={true}
                    />
                    <p className="event-details__qr-url">{qrUrl}</p>
                </div>
            </BorderBox>

            <BorderBox maxWidth="600px">
                <h2 className="event-details__title">Lineup</h2>
                {showModal && (
                    <div className="event-details__modal" onClick={handleOverlayClick}>
                        <div className="event-details__modal-content" onClick={e => e.stopPropagation()}>
                            <p>Slot #{currentSlot.slot_number} is currently open.</p>
                            <p>Estimated start time: {new Date(currentSlot.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                            <input
                                type="text"
                                placeholder="Enter a name to sign up."
                                value={currentSlotName}
                                onChange={(e) => setCurrentSlotName(e.target.value)}
                            />
                            <button onClick={handleConfirmSignUp} disabled={!currentSlotName.trim() || currentSlotName === "Open"}>Sign Up</button>
                            <button onClick={() => setShowModal(false)}>Cancel</button>
                        </div>
                    </div>
                )}
                <div className="event-details__lineup">
                    {generateAllSlots().map((slot, index) => (
                        <Slot
                            key={index}
                            slot={slot}
                            onClick={() => {
                                if (slot.slot_name === "Open") {
                                    setCurrentSlot(slot);
                                    setShowModal(true);
                                }
                            }}
                            onDelete={handleUnsign}
                            isHost={eventDetails?.host?.id === userId}
                        />
                    ))}
                </div>
            </BorderBox>

            {showDeleteConfirmModal && (
                <div className="modal">
                    <div className="modal-content">
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
