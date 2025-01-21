export const sortEventsByDate = (events) => {
    const now = new Date();
    
    // Separate future and past events, considering venue timezone
    const futureEvents = events.filter(event => {
        const eventTime = new Date(event.start_time);
        // Add venue's UTC offset to get local time
        const venueOffset = (event.venue_utc_offset || -420) * 60 * 1000; // Convert minutes to milliseconds
        const localEventTime = new Date(eventTime.getTime() + venueOffset);
        return localEventTime >= now;
    });
    
    const pastEvents = events.filter(event => {
        const eventTime = new Date(event.start_time);
        const venueOffset = (event.venue_utc_offset || -420) * 60 * 1000;
        const localEventTime = new Date(eventTime.getTime() + venueOffset);
        return localEventTime < now;
    });
    
    // Sort future events ascending (closest future date first)
    const sortedFutureEvents = futureEvents.sort((a, b) => 
        new Date(a.start_time) - new Date(b.start_time)
    );
    
    // Sort past events descending (most recent past date first)
    const sortedPastEvents = pastEvents.sort((a, b) => 
        new Date(b.start_time) - new Date(a.start_time)
    );
    
    return [...sortedFutureEvents, ...sortedPastEvents];
}; 