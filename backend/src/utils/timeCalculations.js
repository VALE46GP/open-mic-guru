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

function formatTimeToLocalString(date) {
    return format(new Date(date), 'MMM d, yyyy h:mm aa');
}

module.exports = {
    calculateSlotStartTime,
    hasTimeRelatedChanges,
    formatTimeToLocalString
};