function calculateSlotStartTime(eventStartTime, slotNumber, slotDuration, setupDuration) {
    const startTime = new Date(eventStartTime);
    
    // Handle both object and number formats for durations
    const slotDurationMinutes = typeof slotDuration === 'object' 
        ? slotDuration.minutes 
        : Math.floor(slotDuration / 60);
    
    const setupDurationMinutes = typeof setupDuration === 'object'
        ? setupDuration.minutes
        : Math.floor(setupDuration / 60);
    
    const totalMinutesPerSlot = slotDurationMinutes + setupDurationMinutes;
    const slotOffsetMinutes = (slotNumber - 1) * totalMinutesPerSlot;
    
    return new Date(startTime.getTime() + slotOffsetMinutes * 60000);
}

export { calculateSlotStartTime };
