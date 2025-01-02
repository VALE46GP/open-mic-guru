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

function calculateSlotStartTime(eventStartTime, slotNumber, slotDuration, setupDuration) {
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
    if (typeof utc_offset !== 'number') {
        console.warn('No UTC offset provided for time formatting, using -420 (PDT)');
        return DateTime.fromISO(date, { zone: 'UTC-7' }).toLocaleString(DateTime.DATETIME_MED);
    }

    const dt = DateTime.fromISO(date).setZone(`UTC${utc_offset >= 0 ? '+' : ''}${utc_offset / 60}`);
    return `${dt.toFormat('MMM d')}, ${dt.toFormat('h:mm a')}`;
}

module.exports = {
    convertToUTC,
    convertFromUTC,
    calculateSlotStartTime,
    hasTimeRelatedChanges,
    formatTimeToLocalString,
    formatTimeInTimezone,
    formatDateInTimezone
};
