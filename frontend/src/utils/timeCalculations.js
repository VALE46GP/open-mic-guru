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
        
        // Convert directly to venue timezone
        const venueTime = utcDate.toLocaleString('en-US', {
            timeZone: timezone,
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });

        console.log('Simple timezone conversion:', {
            input: utcTimeStr,
            utcDate: utcDate.toISOString(),
            timezone,
            result: venueTime
        });

        return venueTime;
    } catch (error) {
        console.error('Error formatting venue time:', error);
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
    // Create a date object in the local timezone
    const localDate = new Date(localTime);
    
    // Get the parts of the date in the specified timezone
    const parts = new Date(localDate.toLocaleString('en-US', { timeZone: timezone }))
        .toISOString()
        .match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    
    if (!parts) {
        throw new Error('Invalid date format');
    }
    
    // Create UTC date using the timezone-adjusted components
    const utcTime = Date.UTC(
        parseInt(parts[1]), // year
        parseInt(parts[2]) - 1, // month (0-based)
        parseInt(parts[3]), // day
        parseInt(parts[4]), // hour
        parseInt(parts[5]), // minute
        parseInt(parts[6])  // second
    );
    
    return new Date(utcTime).toISOString();
}

export {
    calculateSlotStartTime,
    formatEventTimeInVenueTimezone,
    getTimezoneFromCoordinates,
    convertToUTC
};
