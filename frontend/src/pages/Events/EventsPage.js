import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import EventCard from '../../components/events/EventCard';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import './EventsPage.sass';

function EventsPage() {
  const [myEvents, setMyEvents] = useState([]);
  const [otherEvents, setOtherEvents] = useState([]);
  const { getUserId } = useAuth();
  const userId = getUserId();

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/events');
        const events = await response.json();

        // Filter events where user is either host or performer
        const myEvents = events.filter(event => 
          event.host_id === userId || event.performers?.includes(userId)
        ).map(event => ({
          ...event,
          is_host: event.host_id === userId,
          is_performer: event.performers?.includes(userId)
        }));

        const otherEvents = events.filter(event => 
          event.host_id !== userId && !event.performers?.includes(userId)
        );

        setMyEvents(myEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
        setOtherEvents(otherEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [userId]);

  return (
    <div className="events-page">
      {myEvents.length > 0 && (
        <div className="events-page__section">
          <h2 className="events-page__title">My Events</h2>
          <div className="events-page__grid">
            {myEvents.map(event => (
              <div key={`event-${event.event_id}`} className="events-page__event-wrapper">
                <div className="events-page__event-role">
                  {event.is_host && <span className="events-page__role-badge host">Host</span>}
                  {event.is_performer && <span className="events-page__role-badge performer">Performer</span>}
                </div>
                <EventCard 
                  event={event}
                  slotTime={event.is_performer ? event.performer_slot_time : null}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="events-page__section">
        <h2 className="events-page__title">Other Events</h2>
        <div className="events-page__grid">
          {otherEvents.map(event => (
            <EventCard 
              key={`event-${event.event_id}`} 
              event={event}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default EventsPage;
