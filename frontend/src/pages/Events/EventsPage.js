import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EventCard from '../../components/events/EventCard';
import EventsMap from '../../components/events/EventsMap';
import VenueAutocomplete from '../../components/shared/VenueAutocomplete';
import EventSearch from '../../components/shared/EventSearch';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './EventsPage.sass';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
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

        const sortedEvents = processedEvents.sort((a, b) => 
          new Date(a.start_time) - new Date(b.start_time)
        );

        setEvents(sortedEvents);
        setFilteredEvents(sortedEvents);
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [userId]);

  const filterEvents = (events, searchTerm, location) => {
    let filtered = [...events];

    // Apply text search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.event_name.toLowerCase().includes(searchLower) ||
        event.venue_name.toLowerCase().includes(searchLower) ||
        event.host_name.toLowerCase().includes(searchLower)
      );
    }

    // Apply location filter
    if (location) {
      filtered = filtered.filter(event => {
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
    }

    return filtered;
  };

  const handleSearch = (searchTerm) => {
    setSearchTerm(searchTerm);
    setFilteredEvents(filterEvents(events, searchTerm, selectedLocation));
  };

  const handleLocationSelected = (place) => {
    if (!place || !place.geometry) return;

    const location = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng()
    };

    setSelectedLocation(location);
    setMapCenter(location);
    setFilteredEvents(filterEvents(events, searchTerm, location));
  };

  const handleEventSelect = (selectedEvents) => {
    setSelectedEvent(selectedEvents);
  };

  return (
    <div className="events-page">
      <div className="events-page__section">
        <BorderBox className="events-page__border-box">
          <div className="events-page__map-section">
            <EventsMap
              events={filteredEvents}
              userId={userId}
              center={mapCenter}
              onEventSelect={handleEventSelect}
            />
            <VenueAutocomplete
              onPlaceSelected={handleLocationSelected}
              resetTrigger={false}
              onResetComplete={() => {}}
              placeholder="Filter by location"
              specificCoordinates={false}
            />
            <EventSearch
              onSearch={handleSearch}
              placeholder="Filter events by name, venue, or host"
            />
            {selectedEvent && (
              <div className="events-page__selected-events">
                <EventCard
                  key={`selected-${selectedEvent.event_id}`}
                  event={selectedEvent}
                  placeholder="Filter by location"
                  slotTime={selectedEvent.is_performer ? selectedEvent.performer_slot_time : null}
                  compact={true}
                />
              </div>
            )}
          </div>
        </BorderBox>
        <h2 className="events-page__title">Upcoming Events</h2>
        <div className="events-page__grid">
          {filteredEvents
            .filter(event => new Date(event.start_time) >= new Date())
            .map(event => (
              <EventCard 
                key={`event-${event.event_id}`} 
                event={event}
                slotTime={event.is_performer ? event.performer_slot_time : null}
              />
            ))}
        </div>
      </div>

      {filteredEvents.filter(event => new Date(event.start_time) < new Date()).length > 0 && (
        <div className="events-page__section">
          <h2 className="events-page__title">Past Events</h2>
          <div className="events-page__grid">
            {filteredEvents
              .filter(event => new Date(event.start_time) < new Date())
              .sort((a, b) => new Date(b.start_time) - new Date(a.start_time))
              .map(event => (
                <EventCard 
                  key={`event-${event.event_id}`} 
                  event={event}
                  slotTime={event.is_performer ? event.performer_slot_time : null}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsPage;
