const db = require('../db');
const { createNotification } = require('../utils/notifications');
const { calculateSlotStartTime } = require('../utils/timeCalculations');
const { logger } = require('../../tests/utils/logger');

const lineupSlotsController = {
    async createSlot(req, res) {
        const { event_id, user_id, slot_number, slot_name, isHostAssignment } = req.body;
        const nonUserId = req.cookies?.nonUserId || null;
        const ipAddress = req.ip;

        if (!user_id && !slot_name && !isHostAssignment) {
            return res.status(400).json({ error: 'Non-users must provide a name' });
        }

        try {
            const eventStatusResult = await db.query(
                `SELECT active FROM events WHERE id = $1`,
                [event_id]
            );

            if (!eventStatusResult.rows.length || !eventStatusResult.rows[0].active) {
                return res.status(403).json({ error: 'Cannot sign up for cancelled events' });
            }

            const hostResult = await db.query(
                `SELECT host_id FROM events WHERE id = $1`,
                [event_id]
            );

            if (hostResult.rows.length === 0) {
                return res.status(404).json({ error: 'Host for this event not found' });
            }

            const hostId = hostResult.rows[0].host_id;

            try {
                const prefsResult = await db.query(
                    'SELECT * FROM notification_preferences WHERE user_id = $1',
                    [hostId]
                );

                if (prefsResult.rows.length === 0) {
                    await db.query(
                        `INSERT INTO notification_preferences 
                         (user_id, notify_event_updates, notify_signup_notifications, notify_other) 
                         VALUES ($1, true, true, true)`,
                        [hostId]
                    );
                }
            } catch (err) {
                console.error('Error checking/creating notification preferences:', err);
            }

            if (user_id === hostId && isHostAssignment) {
                const result = await db.query(`
                    INSERT INTO lineup_slots (event_id, user_id, slot_number, slot_name,
                                           non_user_identifier, ip_address)
                    VALUES ($1, NULL, $2, $3, NULL, NULL) 
                    RETURNING id AS slot_id, slot_number, slot_name, user_id
                `, [event_id, slot_number, slot_name]);

                return res.status(201).json(result.rows[0]);
            }

            const userIdForSlot = user_id || null;
            const nonUserIdForSlot = user_id ? null : (isHostAssignment ? null : nonUserId);
            const ipAddressForSlot = user_id ? null : (isHostAssignment ? null : ipAddress);

            if (user_id) {
                const existingUserSlot = await db.query(
                    `SELECT id FROM lineup_slots WHERE event_id = $1 AND user_id = $2`,
                    [event_id, user_id]
                );

                if (existingUserSlot.rows.length > 0) {
                    return res.status(403).json({ error: 'Only one slot per user per event allowed' });
                }
            } else {
                const existingNonUserSlot = await db.query(
                    `SELECT id FROM lineup_slots WHERE event_id = $1 AND non_user_identifier = $2`,
                    [event_id, nonUserIdForSlot]
                );

                if (existingNonUserSlot.rows.length > 0) {
                    return res.status(403).json({ error: 'Only one slot per non-user per event allowed' });
                }
            }

            const result = await db.query(`
                WITH inserted AS (
                INSERT INTO lineup_slots 
                    (event_id, user_id, slot_number, slot_name, non_user_identifier, ip_address)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
                )
                SELECT inserted.id AS slot_id,
                       inserted.slot_number,
                       inserted.slot_name,
                       inserted.user_id,
                       u.image AS user_image
                FROM inserted
                LEFT JOIN users u ON inserted.user_id = u.id
            `, [event_id, userIdForSlot, slot_number, slot_name, nonUserIdForSlot, ipAddressForSlot]);

            const eventQuery = await db.query(
                'SELECT start_time, slot_duration, setup_duration FROM events WHERE id = $1',
                [event_id]
            );
            const eventDetails = eventQuery.rows[0];

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
                    slot_id: result.rows[0].slot_id,
                    slot_number: slot_number,
                    slot_name: slot_name,
                    user_id: userIdForSlot,
                    user_name: null,
                    user_image: result.rows[0].user_image,
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
                    result.rows[0].slot_id,
                    req
                );
            } catch (err) {
                console.error('Failed to create notification:', err);
            }

            req.app.locals.broadcastLineupUpdate(lineupData);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    async getEventSlots(req, res) {
        const { eventId } = req.params;
        try {
            const result = await db.query(`
                SELECT ls.id AS slot_id,
                       ls.slot_number,
                       u.name AS user_name,
                       u.id AS user_id,
                       ls.slot_name
                FROM lineup_slots ls
                LEFT JOIN users u ON ls.user_id = u.id
                WHERE ls.event_id = $1
                ORDER BY ls.slot_number ASC
            `, [eventId]);
            res.json(result.rows);
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    async deleteSlot(req, res) {
        try {
            const { slotId } = req.params;

            const slotQuery = await db.query(`
                SELECT ls.*, e.start_time, e.slot_duration, e.setup_duration, e.host_id, e.name as event_name
                FROM lineup_slots ls
                JOIN events e ON ls.event_id = e.id
                WHERE ls.id = $1
            `, [slotId]);

            if (slotQuery.rows.length === 0) {
                return res.status(404).json({ error: 'Slot not found' });
            }

            const slot = slotQuery.rows[0];
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

            const slotStartTime = new Date(slot.start_time);
            const slotIndex = slot.slot_number - 1;
            const totalMinutesPerSlot = slot.slot_duration.minutes + slot.setup_duration.minutes;
            slotStartTime.setMinutes(slotStartTime.getMinutes() + (slotIndex * totalMinutesPerSlot));

            await db.query('DELETE FROM lineup_slots WHERE id = $1', [slotId]);

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
        try {
            const { slots } = req.body;

            if (!Array.isArray(slots) || slots.length === 0) {
                return res.status(400).json({ error: 'Invalid slots data' });
            }

            // Validate slot numbers
            const isValidSlotNumbers = slots.every(slot =>
                slot.slot_number &&
                Number.isInteger(slot.slot_number) &&
                slot.slot_number > 0 &&
                slot.slot_number <= 100
            );

            if (!isValidSlotNumbers) {
                return res.status(400).json({ error: 'Invalid slot numbers' });
            }

            // Get event details
            const eventQuery = await db.query(
                'SELECT e.* FROM events e JOIN lineup_slots ls ON e.id = ls.event_id WHERE ls.id = $1',
                [slots[0].slot_id]
            );

            const event = eventQuery.rows[0];

            await db.query('BEGIN');

            for (const slot of slots) {
                const oldSlotQuery = await db.query(
                    'SELECT slot_number, user_id FROM lineup_slots WHERE id = $1',
                    [slot.slot_id]
                );
                const oldSlot = oldSlotQuery.rows[0];

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
                            `Your slot time for "${event.name}" has changed from ${oldStartTime.toLocaleTimeString()} to ${newStartTime.toLocaleTimeString()}`,
                            event.id,
                            slot.slot_id
                        );
                    }
                }

                await db.query(
                    'UPDATE lineup_slots SET slot_number = $1 WHERE id = $2',
                    [slot.slot_number, slot.slot_id]
                );
            }

            await db.query('COMMIT');

            const lineupData = {
                type: 'LINEUP_UPDATE',
                eventId: event.id,
                action: 'REORDER',
                data: { slots }
            };

            req.app.locals.broadcastLineupUpdate(lineupData);
            res.json({ message: 'Slots reordered successfully' });
        } catch (err) {
            logger.error('Error reordering slots:', err);
            res.status(500).json({ error: 'Server error' });
        }
    }
};

module.exports = lineupSlotsController;
