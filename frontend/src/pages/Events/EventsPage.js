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
  const [showPastEvents, setShowPastEvents] = useState(false);
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
  
    // Apply text-based filtering
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(event =>
        event.event_name.toLowerCase().includes(searchLower) ||
        event.venue_name.toLowerCase().includes(searchLower) ||
        event.host_name.toLowerCase().includes(searchLower)
      );
    }
  
    // Apply location-based filtering
    if (location) {
      const isSpecificLocation = location.address_components?.some(component =>
        ['street_number', 'route', 'postal_code'].includes(component.types[0])
      );
  
      if (isSpecificLocation && location.lat && location.lng) {
        // Filter by radius (15 miles in meters)
        console.log('Using radius filtering for specific location.');
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
  
          return distance <= 16093.33; // 10 miles in meters
        });
      } else if (location.viewport && Object.keys(location.viewport).length > 0) {
        // Filter by viewport
        console.log('Using viewport filtering.');
        const bounds = new window.google.maps.LatLngBounds(
          location.viewport.getSouthWest(),
          location.viewport.getNorthEast()
        );
  
        filtered = filtered.filter(event => {
          if (!event.venue_latitude || !event.venue_longitude) return false;
  
          const eventLocation = new window.google.maps.LatLng(
            Number(event.venue_latitude),
            Number(event.venue_longitude)
          );
  
          return bounds.contains(eventLocation);
        });
      } else {
        console.warn('Location has no viewport; skipping viewport filtering.');
      }
    }
  
    return filtered;
  };

  const handleSearch = (searchTerm) => {
    setSearchTerm(searchTerm);
    setSelectedEvent(null);
    setFilteredEvents(filterEvents(events, searchTerm, selectedLocation));
  };

  const handleLocationSelected = (place) => {
    if (!place || !place.geometry) return;

    const location = {
      lat: typeof place.geometry.location.lat === 'function' 
        ? place.geometry.location.lat() 
        : place.geometry.location.lat,
      lng: typeof place.geometry.location.lng === 'function' 
        ? place.geometry.location.lng() 
        : place.geometry.location.lng,
      address_components: place.address_components,
      viewport: place.geometry.viewport
    };

    // Store viewport in window for map component to access
    if (location.viewport) {
      window.locationViewport = new window.google.maps.LatLngBounds(
        location.viewport.getSouthWest(),
        location.viewport.getNorthEast()
      );
    } else {
      window.locationViewport = null;
    }

    setSelectedLocation(location);
    setSelectedEvent(null);
    setMapCenter({ lat: location.lat, lng: location.lng });
    const filtered = filterEvents(events, searchTerm, location);
    setFilteredEvents(filtered);
  };

  const handleEventSelect = (selectedEvents) => {
    setSelectedEvent(selectedEvents);
  };

  return (
    <div className="events-page">
      <div className="events-page__section">
        <BorderBox className="events-page__border-box">
          <div className="events-page__map-section">
            <div className="events-page__filter-buttons" >
              <button
                className="events-page__toggle-past-events"
                onClick={() => setShowPastEvents(!showPastEvents)}
              >
                {showPastEvents ? "Hide Past Events" : "Show Past Events"}
              </button>
            </div>
            <EventsMap
              events={showPastEvents ? filteredEvents : filteredEvents.filter(event => new Date(event.start_time) >= new Date())}
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
            .length > 0 ? (
            filteredEvents
              .filter(event => new Date(event.start_time) >= new Date())
              .map(event => (
                <EventCard 
                  key={`event-${event.event_id}`} 
                  event={event}
                  slotTime={event.is_performer ? event.performer_slot_time : null}
                />
              ))
          ) : (
            <div className="events-page__no-events">
              <p>No events found</p>
            </div>
          )}
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
