import React, { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Link } from 'react-router-dom';

function parseInterval(interval) {
    let totalMinutes = 0;
    if (interval.hours) totalMinutes += interval.hours * 60;
    if (interval.minutes) totalMinutes += interval.minutes;
    if (interval.seconds) totalMinutes += interval.seconds / 60;

    return `${totalMinutes} minutes`;
}

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

        const myEvents = events.filter(event => event.host_id === userId);
        const otherEvents = events.filter(event => event.host_id !== userId);

        setMyEvents(myEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
        setOtherEvents(otherEvents.sort((a, b) => new Date(a.start_time) - new Date(b.start_time)));
      } catch (error) {
        console.error('Error fetching events:', error);
      }
    };

    fetchEvents();
  }, [userId]);

  return (
    <div>
      <h1>Events</h1>
      <h2>My Events</h2>
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>name</th>
            <th>additional_info</th>
            <th>start_time</th>
            <th>end_time</th>
            <th>slot_duration</th>
            <th>venue_id</th>
            <th>host_id</th>
          </tr>
        </thead>
        <tbody>
          {myEvents.map(event => (
            <tr key={`event-${event.event_id}`}>
              <td><Link to={`/events/${event.event_id}`}>{event.event_id}</Link></td>
              <td>{event.event_name}</td>
              <td>{event.additional_info}</td>
              <td>{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td>{new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td>{parseInterval(event.slot_duration)}</td>
              <td><Link to={`/venues/${event.venue_id}`}>{event.venue_id}</Link></td>
              <td><Link to={`/users/${event.host_id}`}>{event.host_id}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Other Events</h2>
      <table>
        <thead>
          <tr>
            <th>id</th>
            <th>name</th>
            <th>additional_info</th>
            <th>start_time</th>
            <th>end_time</th>
            <th>slot_duration</th>
            <th>venue_id</th>
            <th>host_id</th>
          </tr>
        </thead>
        <tbody>
          {otherEvents.map(event => (
            <tr key={`event-${event.event_id}`}>
              <td><Link to={`/events/${event.event_id}`}>{event.event_id}</Link></td>
              <td>{event.event_name}</td>
              <td>{event.additional_info}</td>
              <td>{new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td>{new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              <td>{parseInterval(event.slot_duration)}</td>
              <td><Link to={`/venues/${event.venue_id}`}>{event.venue_id}</Link></td>
              <td><Link to={`/users/${event.host_id}`}>{event.host_id}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EventsPage;
