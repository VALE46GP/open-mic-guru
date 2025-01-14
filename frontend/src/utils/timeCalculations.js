// frontend/src/utils/timeCalculations.js

import { DateTime } from 'luxon';

export function convertToUTC(dateTimeStr, utc_offset) {
    if (typeof utc_offset !== 'number') {
        console.warn('No UTC offset provided for conversion to UTC, using local timezone');
        return DateTime.fromISO(dateTimeStr).toUTC().toISO();
    }
    return DateTime.fromISO(dateTimeStr, { zone: `UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}` }).toUTC().toISO();
}

export function convertFromUTC(utcStr, utc_offset) {
    if (typeof utc_offset !== 'number') {
        console.warn('No UTC offset provided for conversion from UTC, using local timezone');
        return DateTime.fromISO(utcStr).toLocal().toISO();
    }
    return DateTime.fromISO(utcStr).setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`).toISO();
}

// export async function getTimezoneOffsetFromCoordinates(latitude, longitude) {
//     try {
//         const timestamp = Math.floor(Date.now() / 1000);
//         const response = await fetch(
//             `https://maps.googleapis.com/maps/api/timezone/json?location=${latitude},${longitude}&timestamp=${timestamp}&key=${process.env.REACT_APP_GOOGLE_MAPS_API_KEY}`
//         );
//         const data = await response.json();
//
//         if (data.status === 'OK') {
//             // Convert total offset (rawOffset + dstOffset) to minutes
//             const totalOffset = (data.rawOffset + data.dstOffset) / 60;
//             return totalOffset;
//         }
//
//         console.warn('Timezone API error, falling back to default:', data);
//         return -420; // Default to PDT (-7 hours)
//     } catch (error) {
//         console.error('Error fetching timezone:', error);
//         return -420;
//     }
// }

export function formatEventTimeInVenueTimezone(dateString, venue, format = 'MMM d, yyyy h:mm a') {
    if (typeof venue?.utc_offset !== 'number') {
        console.warn('No venue UTC offset provided, falling back to local timezone');
        const dt = DateTime.fromISO(dateString, { zone: 'utc' });
        return dt.toLocaleString(DateTime.DATETIME_MED);
    }

    try {
        const dt = DateTime.fromISO(dateString, { zone: 'utc' });
        const converted = dt.setZone(`UTC${venue.utc_offset >= 0 ? '+' : ''}${venue.utc_offset / 60}`);
        
        if (!converted.isValid) {
            console.error('Invalid UTC offset:', venue.utc_offset);
            return dt.toLocaleString(DateTime.DATETIME_MED);
        }
        
        return converted.toFormat(format);
    } catch (error) {
        console.error('Error formatting time:', error);
        return 'Invalid DateTime';
    }
}

export function calculateSlotStartTime(eventStartTime, slotNumber, slotDuration, setupDuration) {
    const startTime = DateTime.fromISO(eventStartTime);

    const slotDurationMinutes = typeof slotDuration === 'object'
        ? slotDuration.minutes
        : Math.floor(slotDuration / 60);

    const setupDurationMinutes = typeof setupDuration === 'object'
        ? setupDuration.minutes
        : Math.floor(setupDuration / 60);

    const totalMinutesPerSlot = slotDurationMinutes + setupDurationMinutes;
    const slotOffsetMinutes = (slotNumber - 1) * totalMinutesPerSlot;

    return startTime.plus({ minutes: slotOffsetMinutes }).toJSDate();
}

// export function formatTimeInTimezone(date, utc_offset) {
//     if (typeof utc_offset !== 'number') {
//         console.warn('No UTC offset provided for time formatting, using local timezone');
//         return DateTime.fromISO(date).toLocaleString(DateTime.TIME_SIMPLE);
//     }
//
//     return DateTime.fromISO(date)
//         .setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`)
//         .toLocaleString({
//             hour: 'numeric',
//             minute: '2-digit',
//             hour12: true
//         })
//         .replace(':00', '');
// }
//
// export function formatDateInTimezone(date, utc_offset) {
//     if (typeof utc_offset !== 'number') {
//         console.warn('No UTC offset provided for date formatting, using local timezone');
//         return DateTime.fromISO(date).toLocaleString({ month: 'short', day: 'numeric' });
//     }
//
//     return DateTime.fromISO(date)
//         .setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`)
//         .toLocaleString({
//             month: 'short',
//             day: 'numeric'
//         });
// }

export function formatTimeToLocalString(date, utc_offset) {
    if (typeof utc_offset !== 'number') {
        console.warn('No UTC offset provided for time formatting, using local timezone');
        return DateTime.fromISO(date).toLocaleString(DateTime.DATETIME_MED);
    }

    const dt = DateTime.fromISO(date).setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`);
    return `${dt.toFormat('MMM d')}, ${dt.toFormat('h:mm a')}`;
}

export function formatTimeComparison(date1, date2, utc_offset) {
    if (!date1 || !date2) return 'Invalid DateTime';
    
    try {
        const dt1 = DateTime.fromISO(date1, { zone: 'utc' })
            .setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`);
        const dt2 = DateTime.fromISO(date2, { zone: 'utc' })
            .setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`);

        if (!dt1.isValid || !dt2.isValid) {
            return 'Invalid DateTime';
        }

        // Compare years
        if (dt1.year !== dt2.year) {
            return {
                format: 'MMM d, yyyy h:mm a',
                showFullDate: true
            };
        }

        // Compare months and days
        if (dt1.month !== dt2.month || dt1.day !== dt2.day) {
            return {
                format: 'MMM d h:mm a',
                showFullDate: true
            };
        }

        // If only time is different
        return {
            format: 'h:mm a',
            showFullDate: false
        };
    } catch (error) {
        console.error('Error comparing dates:', error);
        return 'Invalid DateTime';
    }
}

export function formatEventStartEndTimes(startTime, endTime, venue) {
    if (!venue) return { start: '', end: '' };
    
    const start = formatEventTimeInVenueTimezone(
        startTime, 
        venue, 
        'MMM d, yyyy h:mm a'
    );
    
    const comparison = formatTimeComparison(startTime, endTime, venue.utc_offset);
    const endFormat = typeof comparison === 'object' ? comparison.format : 'MMM d, yyyy h:mm a';
    
    const end = formatEventTimeInVenueTimezone(endTime, venue, endFormat);
    
    return { start, end };
}

export function formatPerformerTime(eventStartTime, slotTime, venueUtcOffset) {
    if (!slotTime) return '';
    
    const comparison = formatTimeComparison(eventStartTime, slotTime, venueUtcOffset);
    const format = typeof comparison === 'object' ? comparison.format : 'MMM d, yyyy h:mm a';
    
    return formatEventTimeInVenueTimezone(
        slotTime,
        { utc_offset: venueUtcOffset },
        format
    );
}
