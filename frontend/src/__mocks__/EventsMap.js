import React from 'react';

const EventsMap = ({ events, onEventSelect }) => (
    <div data-testid="mock-events-map">
        {events?.map((event) => (
            <div key={event.event_id} data-testid={`map-marker-${event.event_id}`}>
                {event.event_name}
            </div>
        ))}
    </div>
);

export default EventsMap;
