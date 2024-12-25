const { format } = require('date-fns');

function calculateSlotStartTime(eventStartTime, slotNumber, slotDuration, setupDuration) {
    const startTime = new Date(eventStartTime);

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

function formatTimeInTimezone(date, timezone) {
    const formattedTime = new Date(date).toLocaleString('en-US', {
        timeZone: timezone,
        hour: 'numeric',
        minute: new Date(date).getUTCMinutes() === 0 ? undefined : '2-digit',
        hour12: true
    }).replace(':00', '');

    return formattedTime;
}

function formatDateInTimezone(date, timezone) {
    return new Date(date).toLocaleDateString('en-US', {
        timeZone: timezone,
        month: 'short',
        day: 'numeric'
    });
}

function formatTimeToLocalString(date, timezone) {
    if (!timezone) return format(new Date(date), 'MMM d, yyyy h:mm aa');
    
    const time = formatTimeInTimezone(date, timezone);
    const dateStr = formatDateInTimezone(date, timezone);
    return `${dateStr}, ${time}`;
}

module.exports = {
    calculateSlotStartTime,
    hasTimeRelatedChanges,
    formatTimeToLocalString,
    formatTimeInTimezone,
    formatDateInTimezone
};