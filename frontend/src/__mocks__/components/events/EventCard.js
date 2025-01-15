import React from 'react';

const MockEventCard = ({ event }) => (
    <div data-testid={`event-card-${event.event_id}`} className="event-card">
        <h3>{event.event_name}</h3>
        <p>{event.venue_name}</p>
        {!event.active && <div>Event Cancelled</div>}
    </div>
);

export default MockEventCard; 