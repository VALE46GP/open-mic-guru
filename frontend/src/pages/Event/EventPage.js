import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LocationMap from '../../components/shared/LocationMap';
import { useAuth } from '../../hooks/useAuth';
import './EventPage.sass';

function EventPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [eventDetails, setEventDetails] = useState(null);
  const { getUserId } = useAuth();
  const userId = getUserId();

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
    const slotDuration = eventDetails.event.slot_duration.minutes * 60000;
    const totalSlots = Math.ceil((endTime - startTime) / slotDuration);

    return Array.from({ length: totalSlots }, (_, index) => {
        const slotStartTime = new Date(startTime + index * slotDuration);
        const matchingSlot = eventDetails.lineup.find(slot => slot.slot_number === index + 1);

        return {
            slot_number: index + 1,
            slot_start_time: slotStartTime,
            user_name: matchingSlot ? matchingSlot.user_name : "Open"
        };
    });
  };

  const handleSlotSignUp = async (slotNumber) => {
    const response = await fetch('/api/lineup_slots/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            event_id: eventId,
            user_id: userId,
            slot_number: slotNumber,
        }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
        return;
    }
    const data = await response.json();
    // Refresh slots or handle errors
  };

  return (
    <div className="event-details-container">
      <h1>{eventDetails?.event?.name}</h1>
      <p>Date and Time: {new Date(eventDetails?.event?.start_time).toLocaleString()} - {new Date(eventDetails?.event?.end_time).toLocaleString()}</p>
      <p>Hosted by: {eventDetails?.host?.name}</p>
      <p>Slot Duration: {eventDetails?.event?.slot_duration?.minutes} minutes</p>
      <p>Additional Info: {eventDetails?.event?.additional_info}</p>
      <p>Location: {eventDetails?.venue?.name}, {eventDetails?.venue?.address}</p>
      {eventDetails?.venue?.latitude && eventDetails?.venue?.longitude && (
        <LocationMap
          latitude={eventDetails.venue.latitude}
          longitude={eventDetails.venue.longitude}
        />
      )}
      {/* Add an Edit button for the host */}
      {eventDetails?.host?.id === userId && (
        <button onClick={() => navigate(`/events/${eventDetails.event.id}/edit`)}>Edit</button>
      )}
      <div className="lineup-container">
        <h2>Lineup</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Start Time</th>
              <th>Artist</th>
            </tr>
          </thead>
          <tbody>
            {console.log("Slots to render: ", generateAllSlots())}
            {generateAllSlots().map((slot, index) => (
              <tr key={index}>
                <td>{slot.slot_number}</td>
                <td>{slot.slot_start_time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>
                  {slot.user_name !== "Open" ? slot.user_name : (
                    <button onClick={() => handleSlotSignUp(slot.slot_number)}>
                      Sign Up
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EventPage;
