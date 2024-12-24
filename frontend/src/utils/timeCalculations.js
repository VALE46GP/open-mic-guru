import { format, formatInTimeZone, toZonedTime } from 'date-fns-tz';

const timezoneCache = new Map();

async function getTimezoneFromCoordinates(latitude, longitude) {
    const cacheKey = `${latitude},${longitude}`;
    if (timezoneCache.has(cacheKey)) {
        return timezoneCache.get(cacheKey);
    }

    try {
        const response = await fetch(
            `https://maps.googleapis.com/maps/api/timezone/json?location=${latitude},${longitude}&timestamp=${Math.floor(Date.now() / 1000)}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
        );
        const data = await response.json();

        if (data.timeZoneId) {
            timezoneCache.set(cacheKey, data.timeZoneId);
            return data.timeZoneId;
        }
        return 'America/Los_Angeles';
    } catch (error) {
        console.error('Error getting timezone:', error);
        return 'America/Los_Angeles';
    }
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

async function formatEventTimeInVenueTimezone(utcTimeStr, venue, formatStr = 'MMM d, h:mm aa') {
    if (!venue?.latitude || !venue?.longitude) {
        return new Date(utcTimeStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }

    try {
        const timezone = await getTimezoneFromCoordinates(venue.latitude, venue.longitude);

        // Create a UTC date object
        const utcDate = new Date(utcTimeStr);

        // Convert UTC to venue's timezone
        const options = {
            timeZone: timezone,
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };

        // This will convert the UTC time to the venue's timezone
        const venueTime = utcDate.toLocaleString('en-US', options);

        console.log({
            inputUTC: utcTimeStr,
            timezone,
            outputVenueTime: venueTime
        });

        return venueTime;
    } catch (error) {
        console.error('Error formatting venue time:', error);
        // Fall back to UTC if there's an error
        return new Date(utcTimeStr).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    }
}

function convertToUTC(localTime, timezone) {
    const date = new Date(localTime);
    const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    const offset = tzDate.getTime() - date.getTime();
    return new Date(date.getTime() - offset).toISOString();
}

export {
    calculateSlotStartTime,
    formatEventTimeInVenueTimezone,
    getTimezoneFromCoordinates,
    convertToUTC
};
