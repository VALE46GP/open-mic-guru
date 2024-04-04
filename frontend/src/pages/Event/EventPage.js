import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import LocationMap from '../../components/shared/LocationMap';
import './EventPage.sass';
import { useDatabaseContext } from '../../hooks/useDatabaseContext';

function EventPage() {
  const { eventId } = useParams();
  const { databaseData } = useDatabaseContext();
  const [eventDetails, setEventDetails] = useState(null);

  useEffect(() => {
    if (databaseData && databaseData.events && databaseData.venues) {
      const event = databaseData.events.find(e => e.id === Number(eventId));
      const venue = databaseData.venues.find(v => v.id === event.venue_id);
      if (venue) {
          // Ensure latitude and longitude are parsed as numbers
          venue.latitude = parseFloat(venue.latitude);
          venue.longitude = parseFloat(venue.longitude);
          setEventDetails({ ...event, venue }); // Combine event and venue data
      }
    }
  }, [databaseData, eventId]);

  if (!eventDetails) return <div>Loading...</div>;

  return (
    <div className="event-details-container">
      <h1>{eventDetails?.name}</h1>
      <p>Date and Time: {new Date(eventDetails?.date_time).toLocaleString()}</p>
      <p>Location: {eventDetails?.venue?.name}, {eventDetails?.venue?.address}</p>
      <p>Hosted by: {eventDetails?.host?.name}</p>
      <p>Additional Info: {eventDetails?.additional_info}</p>
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
