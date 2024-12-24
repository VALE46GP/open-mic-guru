function getTimezoneFromOffset(offsetMinutes) {
    // Get current date to handle DST correctly
    const date = new Date();

    // Convert offset to hours
    const offsetHours = offsetMinutes / 60;

    // Common timezone mappings for US/Pacific coast
    // We'll use America/Los_Angeles as default since that's what we were using before
    if (offsetHours === -7 || offsetHours === -8) {
        return 'America/Los_Angeles';
    }

    // For other offsets, we'll use a UTC timezone
    // This is a simplification but works for our current needs
    const absOffset = Math.abs(offsetHours);
    const offsetStr =
        (offsetHours <= 0 ? '+' : '-') + // Note: The sign is inverted for UTC timezone names
        String(Math.floor(absOffset)).padStart(2, '0') +
        ':' +
        String((absOffset % 1) * 60).padStart(2, '0');

    return `Etc/GMT${offsetStr}`;
}
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

    // Times from backend are in UTC, keep calculations in UTC
    return new Date(startTime.getTime() + slotOffsetMinutes * 60000);
}

function formatEventTimeInVenueTimezone(utcTimeStr, venue) {
    if (!venue?.timezone) {
        return new Date(utcTimeStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    const utcDate = new Date(utcTimeStr);
    return utcDate.toLocaleString('en-US', {
        timeZone: venue.timezone,
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: utcDate.getUTCMinutes() === 0 ? undefined : '2-digit',
        hour12: true
    }).replace(':00', '');
}

function convertToUTC(localTime, timezone) {
    if (!timezone) {
        console.warn('No timezone provided, using America/Los_Angeles as default');
        timezone = 'America/Los_Angeles';
    }

    // Parse the local time string
    const [datePart, timePart] = localTime.split('T');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes] = timePart.split(':').map(Number);

    // Create a timestamp that represents the local time in the venue's timezone
    const localDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // Add the timezone offset (8 hours for PST)
    const offset = timezone === 'America/Los_Angeles' ? 8 : 0;
    const utcTime = new Date(localDate.getTime() + (offset * 60 * 60 * 1000));

    return utcTime.toISOString();
}

export {
    getTimezoneFromOffset,
    calculateSlotStartTime,
    formatEventTimeInVenueTimezone,
    convertToUTC
};
