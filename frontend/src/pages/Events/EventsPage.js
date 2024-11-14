import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EventCard from '../../components/events/EventCard';
import EventsMap from '../../components/events/EventsMap';
import './EventsPage.sass';

function EventsPage() {
  const [events, setEvents] = useState([]);
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

  return (
    <div className="events-page">
      <div className="events-page__section">
        <h2 className="events-page__title">Events</h2>
        <EventsMap events={events} userId={userId} />
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
