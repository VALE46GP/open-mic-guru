export const sortEventsByDate = (events) => {
    const now = new Date();
    
    // Separate future and past events
    const futureEvents = events.filter(event => new Date(event.start_time) >= now);
    const pastEvents = events.filter(event => new Date(event.start_time) < now);
    
    // Sort future events ascending (closest future date first)
    const sortedFutureEvents = futureEvents.sort((a, b) => 
        new Date(a.start_time) - new Date(b.start_time)
    );
    
    // Sort past events descending (most recent past date first)
    const sortedPastEvents = pastEvents.sort((a, b) => 
        new Date(b.start_time) - new Date(a.start_time)
    );
    
    // Combine the sorted arrays with future events first
    return [...sortedFutureEvents, ...sortedPastEvents];
}; 