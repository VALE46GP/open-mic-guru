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
    return (
        (updatedFields.start_time !== undefined && 
         new Date(updatedFields.start_time).getTime() !== new Date(originalEvent.start_time).getTime()) ||
        (updatedFields.slot_duration !== undefined && 
         JSON.stringify(updatedFields.slot_duration) !== JSON.stringify(originalEvent.slot_duration)) ||
        (updatedFields.setup_duration !== undefined && 
         JSON.stringify(updatedFields.setup_duration) !== JSON.stringify(originalEvent.setup_duration))
    );
}

module.exports = { calculateSlotStartTime, hasTimeRelatedChanges };