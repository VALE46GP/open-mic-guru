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
    if(isNaN(startTime) || isNaN(endTime) || isNaN(slotDuration)) {
        console.error("Invalid event details for slot calculation");
        return [];
    }
    const totalSlots = Math.ceil((endTime - startTime) / slotDuration);

    let allSlots = [];
    for (let i = 0; i < totalSlots; i++) {
      const slotStartTime = new Date(startTime + i * slotDuration);
      // Find if there is a matching slot in eventDetails.lineup
      const matchingSlot = eventDetails.lineup.find(slot =>
        new Date(slot.slot_start_time).getTime() === slotStartTime.getTime()
      );

      if (matchingSlot) {
        allSlots.push({
          ...matchingSlot,
          slot_start_time: slotStartTime,
          user_name: matchingSlot.user_id ? matchingSlot.user_name : "Open"
        });
      } else {
        // If there's no matching slot, create an empty slot
        allSlots.push({
          slot_start_time: slotStartTime,
          user_name: ""
        });
      }
    }
    return allSlots;
  };

  return (
    <div className="event-details-container">
      <h1>{eventDetails?.event?.name}</h1>
      <p>Date and Time: {new Date(eventDetails?.event?.start_time).toLocaleString()} - {new Date(eventDetails?.event?.end_time).toLocaleString()}</p>
      <p>Location: {eventDetails?.venue?.name}, {eventDetails?.venue?.address}</p>
      <p>Hosted by: {eventDetails?.host?.name}</p>
      <p>Additional Info: {eventDetails?.event?.additional_info}</p>
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
            {generateAllSlots().map((slot, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{new Date(slot.slot_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                <td>{slot.user_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default EventPage;
