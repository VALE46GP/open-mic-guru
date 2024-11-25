const express = require('express');
const router = express.Router();
const db = require('../db');
const { createNotification } = require('../utils/notifications');
const { calculateSlotStartTime, hasTimeRelatedChanges } = require('../utils/timeCalculations');

// POST a new lineup slot
router.post('/', async (req, res) => {
    const { event_id, user_id, slot_number, slot_name, isHostAssignment } = req.body;
    const nonUserId = req.cookies?.nonUserId || null;
    const ipAddress = req.ip;

    // Validate that non-users provide a name for the slot
    if (!user_id && !slot_name && !isHostAssignment) {
        return res.status(400).json({ error: 'Non-users must provide a name' });
    }

    try {
        // Step 1: Check if the current user is the event host
        const hostResult = await db.query(
            `SELECT host_id
             FROM events
             WHERE id = $1`,
            [event_id]
        );

        if (hostResult.rows.length === 0) {
            return res.status(404).json({ error: 'Host for this event not found' });
        }

        const hostId = hostResult.rows[0].host_id;

        // Check/create notification preferences for host
        try {
            const prefsResult = await db.query(
                'SELECT * FROM notification_preferences WHERE user_id = $1',
                [hostId]
            );
            
            if (prefsResult.rows.length === 0) {
                // Create default preferences
                await db.query(
                    `INSERT INTO notification_preferences 
                     (user_id, notify_event_updates, notify_signup_notifications, notify_other) 
                     VALUES ($1, true, true, true)`,
                    [hostId]
                );
                console.log('Created default notification preferences for host:', hostId);
            }
        } catch (err) {
            console.error('Error checking/creating notification preferences:', err);
        }

        // Step 2: If host assignment, set user_id, non_user_identifier and ip_address to NULL
        if (user_id === hostId && isHostAssignment) {
            const result = await db.query(`
                INSERT INTO lineup_slots (event_id, user_id, slot_number, slot_name,
                                          non_user_identifier, ip_address)
                VALUES ($1, NULL, $2, $3, NULL,
                        NULL) RETURNING id AS slot_id, slot_number, slot_name, user_id
            `, [event_id, slot_number, slot_name]);

            return res.status(201).json(result.rows[0]);
        }

        // Step 3: Set non_user_identifier and ip_address
        const userIdForSlot = user_id || null;
        const nonUserIdForSlot = user_id ? null : (isHostAssignment ? null : nonUserId); // Set to NULL if user is logged in or if host assignment
        const ipAddressForSlot = user_id ? null : (isHostAssignment ? null : ipAddress); // Set to NULL if user is logged in or if host assignment

        console.log("Proceeding with regular slot assignment:", {
            userIdForSlot,
            nonUserIdForSlot,
            ipAddressForSlot
        });

        if (user_id) {
            // Check if the user (logged-in non-host) has already signed up for a slot in this event
            const existingUserSlot = await db.query(
                `SELECT id
                 FROM lineup_slots
                 WHERE event_id = $1
                   AND user_id = $2`,
                [event_id, user_id]
            );

            if (existingUserSlot.rows.length > 0) {
                return res.status(403).json({ error: 'Only one slot per user per event allowed' });
            }
        } else {
            // Check if the non-user has already signed up for a slot in this event
            const existingNonUserSlot = await db.query(
                `SELECT id
                 FROM lineup_slots
                 WHERE event_id = $1
                   AND non_user_identifier = $2`,
                [event_id, nonUserIdForSlot]
            );

            if (existingNonUserSlot.rows.length > 0) {
                return res.status(403).json({ error: 'Only one slot per non-user per event allowed' });
            }
        }

        // Proceed with sign-up for a non-host, ensuring no duplicate slot assignment
        const result = await db.query(`
            WITH inserted AS (
            INSERT
            INTO lineup_slots (event_id, user_id, slot_number, slot_name, non_user_identifier,
                               ip_address)
            VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
                )
            SELECT inserted.id AS slot_id,
                   inserted.slot_number,
                   inserted.slot_name,
                   inserted.user_id,
                   u.image     AS user_image
            FROM inserted
                     LEFT JOIN users u ON inserted.user_id = u.id
        `, [event_id, userIdForSlot, slot_number, slot_name, nonUserIdForSlot, ipAddressForSlot]);

        // After successful slot creation, broadcast the update
        const eventQuery = await db.query('SELECT start_time, slot_duration, setup_duration FROM events WHERE id = $1', [event_id]);
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

        // Create notification for event host
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
            // Don't return here, continue with the response
        }

        // Before broadcasting the update
        req.app.locals.broadcastLineupUpdate(lineupData);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error signing up for lineup:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// GET lineup slots for an event
router.get('/:eventId', async (req, res) => {
    const { eventId } = req.params;
    try {
        const result = await db.query(`
            SELECT ls.id AS  slot_id,
                   ls.slot_number,
                   u.name AS user_name,
                   u.id AS   user_id,
                   ls.slot_name
            FROM lineup_slots ls
                     LEFT JOIN users u ON ls.user_id = u.id
            WHERE ls.event_id = $1
            ORDER BY ls.slot_number ASC
        `, [eventId]);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Update the delete endpoint to broadcast deletions
router.delete('/:slotId', async (req, res) => {
    try {
        const { slotId } = req.params;

        // Get slot and event details before deletion
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

        // If there's a user_id and the request is from the host, create notification for the user
        if (slot.user_id && req.user && req.user.id === hostId) {
            try {
                await createNotification(
                    slot.user_id,
                    'slot_removed',
                    `Your slot in "${slot.event_name}" has been removed by the host`,
                    slot.event_id,
                    slotId,
                    req
                );
            } catch (err) {
                console.error('Failed to create notification for user:', err);
            }
        }

        // Create notification for the event host
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

        // Calculate slot start time
        const slotStartTime = new Date(slot.start_time);
        const slotIndex = slot.slot_number - 1;
        const totalMinutesPerSlot = slot.slot_duration.minutes + slot.setup_duration.minutes;
        slotStartTime.setMinutes(slotStartTime.getMinutes() + (slotIndex * totalMinutesPerSlot));

        // Delete the slot
        await db.query('DELETE FROM lineup_slots WHERE id = $1', [slotId]);

        // Broadcast the update
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

        console.log('Broadcasting delete update:', lineupData);
        req.app.locals.broadcastLineupUpdate(lineupData);

        res.status(200).json({ message: 'Slot deleted successfully' });
    } catch (err) {
        console.error('Error deleting slot:', err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Add this new endpoint for reordering slots
router.put('/reorder', async (req, res) => {
    const { slots } = req.body;

    try {
        // Get event details
        const eventQuery = await db.query(
            'SELECT e.* FROM events e JOIN lineup_slots ls ON e.id = ls.event_id WHERE ls.id = $1',
            [slots[0].slot_id]
        );
        const event = eventQuery.rows[0];

        // Use a transaction to ensure all updates succeed or none do
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

        // Broadcast the update via WebSocket
        const lineupData = {
            type: 'LINEUP_UPDATE',
            eventId: event.id,
            action: 'REORDER',
            data: { slots }
        };

        req.app.locals.broadcastLineupUpdate(lineupData);
        res.json({ message: 'Slots reordered successfully' });
    } catch (err) {
        await db.query('ROLLBACK');
        console.error('Error reordering slots:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
