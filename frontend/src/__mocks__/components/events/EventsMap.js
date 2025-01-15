import React from 'react';

const MockEventsMap = ({ events = [], onMarkerClick }) => (
    <div data-testid="mock-events-map">
        {events.map(event => (
            <div 
                key={event.id || Math.random()}
                onClick={() => onMarkerClick?.(event)}
                data-testid={`map-marker-${event.id}`}
            >
                {event.name}
            </div>
        ))}
    </div>
);

export default MockEventsMap; 