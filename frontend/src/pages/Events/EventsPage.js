import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EventCard from '../../components/events/EventCard';
import EventsMap from '../../components/events/EventsMap';
import VenueAutocomplete from '../../components/shared/VenueAutocomplete';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './EventsPage.sass';

function EventsPage() {
  const [events, setEvents] = useState([]);
  const [mapCenter, setMapCenter] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const { getUserId } = useAuth();
  const userId = getUserId();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const eventsData = await response.json();

        const processedEvents = eventsData.map(event => ({
          ...event,
          is_host: event.host_id === userId,
          is_performer: event.performers?.includes(userId)
        }));

        setEvents(processedEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [userId]);

  const handleLocationSelected = async (place) => {
    if (!place || !place.geometry) return;

    const location = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };

    setMapCenter(location);

    // Filter events within 15 miles (approximately 24140 meters)
    const filteredEvents = events.filter(event => {
      if (!event.venue_latitude || !event.venue_longitude) return false;
      
      const eventLocation = new window.google.maps.LatLng(
        Number(event.venue_latitude),
        Number(event.venue_longitude)
      );
      
      const distance = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(location.lat, location.lng),
        eventLocation
      );
      
      return distance <= 24140; // 15 miles in meters
    });

    setEvents(filteredEvents);
  };

  const handleEventSelect = (event) => {
    setSelectedEvent(event);
  };

  return (
    <div className="events-page">
      <div className="events-page__section">
        <h2 className="events-page__title">Events</h2>
        <BorderBox className="events-page__border-box">
          <div className="events-page__map-section">
            <div className="events-page__search">
              <VenueAutocomplete
                onPlaceSelected={handleLocationSelected}
                resetTrigger={false}
                onResetComplete={() => {}}
                placeholder="Search by location (address, city, or coordinates)"
                specificCoordinates={false}
              />
            </div>
            <EventsMap 
              events={events} 
              userId={userId} 
              center={mapCenter} 
              onEventSelect={handleEventSelect}
            />
            {selectedEvent && (
              <div className="events-page__selected-event">
                <EventCard 
                  event={selectedEvent}
                  slotTime={selectedEvent.is_performer ? selectedEvent.performer_slot_time : null}
                />
              </div>
            )}
          </div>
        </BorderBox>
        <div className="events-page__grid">
          {events.map(event => (
            <EventCard 
              key={`event-${event.event_id}`} 
              event={event}
              slotTime={event.is_performer ? event.performer_slot_time : null}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default EventsPage;
