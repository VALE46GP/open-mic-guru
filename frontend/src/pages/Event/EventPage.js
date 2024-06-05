import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LocationMap from '../../components/shared/LocationMap';
import { useAuth } from '../../hooks/useAuth';
import { ReactComponent as EditIcon } from '../../assets/icons/edit.svg';
import './EventPage.sass';

function EventPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const [eventDetails, setEventDetails] = useState(null);
    const { getUserId } = useAuth();
    const userId = getUserId();
    const [showModal, setShowModal] = useState(false);
    const [currentSlot, setCurrentSlot] = useState(null);
    const [currentSlotName, setCurrentSlotName] = useState('');

    useEffect(() => {
        const fetchEventDetails = async () => {
            const response = await fetch(`/api/events/${eventId}`);
            const data = await response.json();
            console.log('>>>>>>>>>>>>>>>>>>>>> eventId = ', eventId)
            console.log('>>>>>>>>>>>>>>>>>>>>> data = ', data)
            setEventDetails(data);
        };
        fetchEventDetails();
    }, [eventId]);

    if (!eventDetails) return <div>Loading...</div>;

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
                user_id: userId,
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

    return (
        <div className="event-details">
            <div className="event-details__container">
                {eventDetails?.host?.id === userId && (
                    <button className="event-details__edit" onClick={() => navigate(`/events/${eventDetails.event.id}/edit`)}>
                        <EditIcon />
                    </button>
                )}
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
            </div>
            <div className="event-details__container">
                <div className="event-details__lineup">
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
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Start Time</th>
                                <th>Artist</th>
                            </tr>
                        </thead>
                        <tbody>
                            {generateAllSlots().map((slot, index) => (
                                <tr key={index}
                                    className={`event-details__lineup__row ${currentSlot === slot.slot_number ? 'event-details__lineup__row--selected' : ''}`}
                                    onClick={() => {
                                    console.log("Slot clicked", slot);
                                    if (slot.slot_name === "Open") {
                                        setCurrentSlot(slot);
                                        setShowModal(true);
                                    }
                                }}>
                                <td>{slot.slot_number}</td>
                                <td>{slot.slot_start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                <td>
                                    {slot.user_id ? (
                                        <Link to={`/users/${slot.user_id}`}>{slot.slot_name}</Link>
                                    ) : "Open"}
                                </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default EventPage;
