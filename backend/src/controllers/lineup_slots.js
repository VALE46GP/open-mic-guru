const { lineupSlotsQueries } = require('../db/queries/lineup_slots');
const { createNotification } = require('../utils/notifications');
const { calculateSlotStartTime, formatTimeToLocalString } = require('../utils/timeCalculations');
const { logger } = require('../../tests/utils/logger');
const db = require('../db');

const lineupSlotsController = {
    async createSlot(req, res) {
        const { event_id, user_id, slot_number, slot_name, isHostAssignment } = req.body;
        const nonUserId = req.cookies?.nonUserId || null;
        const ipAddress = req.ip;

        if (!user_id && !slot_name && !isHostAssignment) {
            return res.status(400).json({ error: 'Non-users must provide a name' });
        }

        try {
            const eventStatus = await lineupSlotsQueries.checkEventStatus(event_id);
            if (!eventStatus || !eventStatus.active) {
                return res.status(403).json({ error: 'Cannot sign up for cancelled events' });
            }

            const hostResult = await lineupSlotsQueries.getEventHost(event_id);
            if (!hostResult) {
                return res.status(404).json({ error: 'Host for this event not found' });
            }

            const hostId = hostResult.host_id;

            try {
                const prefs = await lineupSlotsQueries.getNotificationPreferences(hostId);
                if (!prefs) {
                    await lineupSlotsQueries.createNotificationPreferences(hostId);
                }
            } catch (err) {
                console.error('Error checking/creating notification preferences:', err);
            }

            if (user_id === hostId && isHostAssignment) {
                const result = await lineupSlotsQueries.createHostAssignedSlot(event_id, slot_number, slot_name);
                return res.status(201).json(result);
            }

            const userIdForSlot = user_id || null;
            const nonUserIdForSlot = user_id ? null : (isHostAssignment ? null : nonUserId);
            const ipAddressForSlot = user_id ? null : (isHostAssignment ? null : ipAddress);

            if (user_id) {
                const existingUserSlot = await lineupSlotsQueries.checkExistingUserSlot(event_id, user_id);
                if (existingUserSlot) {
                    return res.status(403).json({ error: 'Only one slot per user per event allowed' });
                }
            } else {
                const existingNonUserSlot = await lineupSlotsQueries.checkExistingNonUserSlot(event_id, nonUserIdForSlot);
                if (existingNonUserSlot) {
                    return res.status(403).json({ error: 'Only one slot per non-user per event allowed' });
                }
            }

            const result = await lineupSlotsQueries.createSlot(
                event_id, 
                userIdForSlot, 
                slot_number, 
                slot_name, 
                nonUserIdForSlot, 
                ipAddressForSlot
            );

            const eventDetails = await lineupSlotsQueries.getEventDetails(event_id);
            const slotStartTime = calculateSlotStartTime(
                eventDetails.start_time,
                slot_number,
                eventDetails.slot_duration,
                eventDetails.setup_duration
            );

            const lineupData = {
                type: 'LINEUP_UPDATE',
                eventId: parseInt(event_id),
                action: 'CREATE',
                data: {
                    slot_id: result.slot_id,
                    slot_number: slot_number,
                    slot_name: slot_name,
                    user_id: userIdForSlot,
                    user_name: null,
                    user_image: result.user_image,
                    slot_start_time: slotStartTime,
                    non_user_identifier: nonUserIdForSlot,
                    ip_address: ipAddressForSlot
                }
            };

            try {
                const slotUserName = slot_name || 'Anonymous';
                await createNotification(
                    hostId,
                    'lineup_signup',
                    `${slotUserName} has signed up for slot ${slot_number}`,
                    event_id,
                    result.slot_id,
                    req
                );
            } catch (err) {
                console.error('Failed to create notification:', err);
            }

            req.app.locals.broadcastLineupUpdate(lineupData);
            res.status(201).json(result);
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    async getEventSlots(req, res) {
        const { eventId } = req.params;
        try {
            const slots = await lineupSlotsQueries.getEventSlots(eventId);
            res.json(slots);
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    async deleteSlot(req, res) {
        try {
            const { slotId } = req.params;
            const slot = await lineupSlotsQueries.getSlotDetails(slotId);

            if (!slot) {
                return res.status(404).json({ error: 'Slot not found' });
            }

            const hostId = slot.host_id;
            const slotUserName = slot.slot_name || 'Anonymous';
            const isDeletedByHost = req.user?.id === hostId;

            if (slot.user_id) {
                try {
                    await createNotification(
                        slot.user_id,
                        'slot_removed',
                        `Your slot in "${slot.event_name}" has been removed${isDeletedByHost ? ' by the host' : ''}`,
                        slot.event_id,
                        slotId,
                        req
                    );
                } catch (err) {
                    console.error('Failed to create notification for user:', err);
                }
            }

            try {
                await createNotification(
                    hostId,
                    'lineup_unsign',
                    `${slotUserName} has been removed from slot ${slot.slot_number}`,
                    slot.event_id,
                    slotId,
                    req
                );
            } catch (err) {
                console.error('Failed to create notification for host:', err);
            }

            const slotStartTime = calculateSlotStartTime(
                slot.start_time,
                slot.slot_number,
                slot.slot_duration,
                slot.setup_duration
            );

            await lineupSlotsQueries.deleteSlot(slotId);

            const lineupData = {
                type: 'LINEUP_UPDATE',
                eventId: slot.event_id,
                action: 'DELETE',
                data: {
                    slotId: parseInt(slotId),
                    slot_number: slot.slot_number,
                    slot_start_time: slotStartTime
                }
            };

            req.app.locals.broadcastLineupUpdate(lineupData);
            res.status(200).json({ message: 'Slot deleted successfully' });
        } catch (err) {
            console.error('Error deleting slot:', err);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    async reorderSlots(req, res) {
        const client = await db.connect();
        
        try {
            const { slots } = req.body;

            if (!Array.isArray(slots) || slots.length === 0) {
                return res.status(400).json({ error: 'Invalid slots data' });
            }

            const isValidSlotNumbers = slots.every(slot =>
                slot.slot_number &&
                Number.isInteger(slot.slot_number) &&
                slot.slot_number > 0 &&
                slot.slot_number <= 100
            );

            if (!isValidSlotNumbers) {
                return res.status(400).json({ error: 'Invalid slot numbers' });
            }

            const event = await lineupSlotsQueries.getEventDetailsForReorder(slots[0].slot_id);
            
            await client.query('BEGIN');

            try {
                for (const slot of slots) {
                    const oldSlot = await lineupSlotsQueries.getOldSlotDetails(slot.slot_id);

                    if (oldSlot.slot_number !== slot.slot_number && oldSlot.user_id) {
                        const oldStartTime = calculateSlotStartTime(
                            event.start_time,
                            oldSlot.slot_number,
                            event.slot_duration,
                            event.setup_duration
                        );

                        const newStartTime = calculateSlotStartTime(
                            event.start_time,
                            slot.slot_number,
                            event.slot_duration,
                            event.setup_duration
                        );

                        if (oldStartTime.getTime() !== newStartTime.getTime()) {
                            await createNotification(
                                oldSlot.user_id,
                                'slot_time_change',
                                `Your slot time for "${event.name}" has changed from ${formatTimeToLocalString(oldStartTime)} to ${formatTimeToLocalString(newStartTime)}`,
                                event.id,
                                slot.slot_id
                            );
                        }
                    }

                    await lineupSlotsQueries.updateSlotNumber(slot.slot_id, slot.slot_number);
                }

                await client.query('COMMIT');

                const lineupData = {
                    type: 'LINEUP_UPDATE',
                    eventId: event.id,
                    action: 'REORDER',
                    data: { slots }
                };

                req.app.locals.broadcastLineupUpdate(lineupData);
                res.json({ message: 'Slots reordered successfully' });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            }
        } catch (err) {
            logger.error('Error reordering slots:', err);
            res.status(500).json({ error: 'Server error', details: err.message });
        } finally {
            client.release();
        }
    }
};

module.exports = lineupSlotsController;
