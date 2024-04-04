import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LocationMap from '../../components/shared/LocationMap';
import './EventPage.sass';

function EventPage() {
  const { eventId } = useParams();
  const [eventDetails, setEventDetails] = useState(null);

  useEffect(() => {
    const fetchEventDetails = async () => {
      const response = await fetch(`/api/events/${eventId}`);
      const data = await response.json();
      setEventDetails(data);
    };
    fetchEventDetails();
  }, [eventId]);

  if (!eventDetails) return <div>Loading...</div>;

  return (
    <div className="event-details-container">
      <h1>{eventDetails?.event?.name}</h1>
      <p>Date and Time: {new Date(eventDetails?.event?.date_time).toLocaleString()}</p>
      <p>Location: {eventDetails?.venue?.name}, {eventDetails?.venue?.address}</p>
      <p>Hosted by: {eventDetails?.host?.name}</p>
      <p>Additional Info: {eventDetails?.event?.additional_info}</p>
      {eventDetails?.venue?.latitude && eventDetails?.venue?.longitude && (
        <LocationMap
          latitude={eventDetails.venue.latitude}
          longitude={eventDetails.venue.longitude}
        />
      )}
    </div>
  );
}

export default EventPage;
