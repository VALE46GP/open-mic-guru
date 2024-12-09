import React from 'react';

const EventCard = ({ event }) => {    
    return (
        <div data-testid={`event-card-${event.event_id}`} className="event-card">
            <div className="event-card__title">{event.event_name}</div>
            {event.start_time && <div className="event-card__date">{event.start_time}</div>}
            {!event.active && <div className="event-card__cancelled">Event Cancelled</div>}
        </div>
    );
};

export default EventCard;