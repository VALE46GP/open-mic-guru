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

function hasTimeRelatedChanges(originalEvent, updatedFields) {
    if (!updatedFields) return false;
    
    const startTimeChanged = updatedFields.start_time !== undefined && 
        new Date(updatedFields.start_time).getTime() !== new Date(originalEvent.start_time).getTime();
        
    const slotDurationChanged = updatedFields.slot_duration !== undefined &&
        (typeof updatedFields.slot_duration === 'object' 
            ? updatedFields.slot_duration.minutes !== originalEvent.slot_duration.minutes
            : Math.floor(updatedFields.slot_duration / 60) !== Math.floor(originalEvent.slot_duration / 60));
            
    const setupDurationChanged = updatedFields.setup_duration !== undefined &&
        (typeof updatedFields.setup_duration === 'object'
            ? updatedFields.setup_duration.minutes !== originalEvent.setup_duration.minutes
            : Math.floor(updatedFields.setup_duration / 60) !== Math.floor(originalEvent.setup_duration / 60));
    
    return startTimeChanged || slotDurationChanged || setupDurationChanged;
}

function formatTimeToLocalString(date) {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }
    
    // Convert directly to Pacific time
    return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
    });
}

module.exports = { calculateSlotStartTime, hasTimeRelatedChanges, formatTimeToLocalString };