// backend/src/utils/timeCalculations.js

const { DateTime } = require('luxon');

function convertToUTC(dateTimeStr, utc_offset) {
    if (typeof utc_offset !== 'number') {
        console.warn('No UTC offset provided for conversion to UTC, using -420 (PDT)');
        return DateTime.fromISO(dateTimeStr, { zone: 'UTC-7' }).toUTC().toISO();
    }
    return DateTime.fromISO(dateTimeStr, { zone: `UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}` }).toUTC().toISO();
}

function convertFromUTC(utcStr, utc_offset) {
    if (typeof utc_offset !== 'number') {
        console.warn('No UTC offset provided for conversion from UTC, using -420 (PDT)');
        return DateTime.fromISO(utcStr, { zone: 'UTC-7' }).toISO();
    }
    return DateTime.fromISO(utcStr).setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`).toISO();
}

function calculateSlotStartTime(startTime, slotNumber, slotDuration, setupDuration) {
    if (!startTime || !slotNumber || !slotDuration || !setupDuration) {
        console.error('Invalid parameters:', { startTime, slotNumber, slotDuration, setupDuration });
        return null;
    }

    try {
        const baseTime = new Date(startTime);
        if (isNaN(baseTime.getTime())) {
            console.error('Invalid start time:', startTime);
            return null;
        }

        // Convert durations from seconds to milliseconds
        const totalDurationPerSlot = (slotDuration + setupDuration) * 1000;
        const offsetMilliseconds = (slotNumber - 1) * totalDurationPerSlot;

        return new Date(baseTime.getTime() + offsetMilliseconds);
    } catch (error) {
        console.error('Error calculating slot start time:', error);
        return null;
    }
}

function hasTimeRelatedChanges(originalEvent, updatedFields) {
    if (!updatedFields) return false;

    const startTimeChanged = updatedFields.start_time !== undefined &&
        DateTime.fromISO(updatedFields.start_time).toMillis() !==
        DateTime.fromISO(originalEvent.start_time).toMillis();

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

function formatTimeInTimezone(date, utc_offset) {
    if (typeof utc_offset !== 'number') {
        console.warn('No UTC offset provided for time formatting, using -420 (PDT)');
        return DateTime.fromISO(date, { zone: 'UTC-7' }).toLocaleString(DateTime.TIME_SIMPLE);
    }

    return DateTime.fromISO(date)
        .setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`)
        .toLocaleString({
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        })
        .replace(':00', '');
}

function formatDateInTimezone(date, utc_offset) {
    if (typeof utc_offset !== 'number') {
        console.warn('No UTC offset provided for date formatting, using -420 (PDT)');
        return DateTime.fromISO(date, { zone: 'UTC-7' }).toLocaleString({ month: 'short', day: 'numeric' });
    }

    return DateTime.fromISO(date)
        .setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`)
        .toLocaleString({
            month: 'short',
            day: 'numeric'
        });
}

function formatTimeToLocalString(date, utc_offset) {
    if (!date) return 'Invalid DateTime';
    
    try {
        if (typeof utc_offset !== 'number') {
            console.warn('No UTC offset provided for time formatting, using -420 (PDT)');
            utc_offset = -420;
        }

        // Handle both Date objects and ISO strings
        const dateToFormat = date instanceof Date ? date.toISOString() : date;

        // Convert to DateTime object with UTC timezone first
        const dt = DateTime.fromISO(dateToFormat, { zone: 'utc' })
            .setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`);

        if (!dt.isValid) {
            console.error('Invalid date:', date);
            return 'Invalid DateTime';
        }

        return dt.toFormat('MMM d, yyyy h:mm a');
    } catch (error) {
        console.error('Error formatting time:', error, { date, utc_offset });
        return 'Invalid DateTime';
    }
}

function formatTimeComparison(date1, date2, utc_offset) {
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

module.exports = {
    convertToUTC,
    convertFromUTC,
    calculateSlotStartTime,
    hasTimeRelatedChanges,
    formatTimeToLocalString,
    formatTimeInTimezone,
    formatDateInTimezone,
    formatTimeComparison
};
