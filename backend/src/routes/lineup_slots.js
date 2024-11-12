const express = require('express');
const router = express.Router();
const db = require('../db');

// POST a new lineup slot
router.post('/', async (req, res) => {
    const { event_id, user_id, slot_number, slot_name, isHostAssignment } = req.body;
    const nonUserId = req.cookies?.nonUserId || null;
    const ipAddress = req.ip;

    console.log("Request received:", { event_id, user_id, slot_number, slot_name, isHostAssignment, nonUserId, ipAddress });

    // Validate that non-users provide a name for the slot
    if (!user_id && !slot_name) {
        return res.status(400).json({ error: 'Non-users must provide a name' });
    }

    try {
        // Step 1: Check if the current user is the event host
        const hostResult = await db.query(
            `SELECT user_id AS host_id FROM user_roles WHERE event_id = $1 AND role = 'host'`,
            [event_id]
        );

        if (hostResult.rows.length === 0) {
            return res.status(404).json({ error: 'Host for this event not found' });
        }

        const hostId = hostResult.rows[0].host_id;
        console.log("Host ID found:", hostId);

        // Step 2: If host assignment, set non_user_identifier and ip_address to NULL and bypass the one-slot rule
        if (user_id === hostId && isHostAssignment) {
            console.log("Host assignment detected, setting non_user_identifier and ip_address to NULL.");

            const result = await db.query(`
                INSERT INTO lineup_slots (event_id, user_id, slot_number, slot_name, non_user_identifier, ip_address) 
                VALUES ($1, NULL, $2, $3, NULL, NULL) -- NULL for user_id, non_user_identifier, and ip_address
                RETURNING id AS slot_id, slot_number, slot_name, user_id
            `, [event_id, slot_number, slot_name]);

            console.log("Host-assigned slot successfully created:", result.rows[0]);

            // After successful slot creation, broadcast the update
            const eventQuery = await db.query('SELECT start_time, slot_duration, setup_duration FROM events WHERE id = $1', [event_id]);
            const eventDetails = eventQuery.rows[0];

            const slotStartTime = new Date(eventDetails.start_time);
            const slotIndex = slot_number - 1;
            const totalMinutesPerSlot = eventDetails.slot_duration.minutes + eventDetails.setup_duration.minutes;
            slotStartTime.setMinutes(slotStartTime.getMinutes() + (slotIndex * totalMinutesPerSlot));

            const lineupData = {
                type: 'LINEUP_UPDATE',
                eventId: parseInt(event_id),
                action: 'CREATE',
                data: {
                    slot_id: result.rows[0].slot_id,
                    slot_number: slot_number,
                    slot_name: slot_name,
                    user_id: null,
                    user_name: null,
                    slot_start_time: slotStartTime,
                    non_user_identifier: null,
                    ip_address: null
                }
            };
            
            req.app.locals.broadcastLineupUpdate(lineupData);
            return res.status(201).json(result.rows[0]);
        }

        // Step 3: Set non_user_identifier and ip_address for non-host assignments
        const userIdForSlot = user_id || null;
        const nonUserIdForSlot = isHostAssignment ? null : nonUserId; // Set to NULL if host assignment
        const ipAddressForSlot = isHostAssignment ? null : ipAddress; // Set to NULL if host assignment

        console.log("Proceeding with regular slot assignment:", { userIdForSlot, nonUserIdForSlot, ipAddressForSlot });

        if (user_id) {
            // Check if the user (logged-in non-host) has already signed up for a slot in this event
            const existingUserSlot = await db.query(
                `SELECT id FROM lineup_slots WHERE event_id = $1 AND user_id = $2`,
                [event_id, user_id]
            );

            if (existingUserSlot.rows.length > 0) {
                return res.status(403).json({ error: 'Only one slot per user per event allowed' });
            }
        } else {
            // Check if the non-user has already signed up for a slot in this event
            const existingNonUserSlot = await db.query(
                `SELECT id FROM lineup_slots 
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
            INSERT INTO lineup_slots (event_id, user_id, slot_number, slot_name, non_user_identifier, ip_address) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id AS slot_id, slot_number, slot_name, user_id
        `, [event_id, userIdForSlot, slot_number, slot_name, nonUserIdForSlot, ipAddressForSlot]);

        console.log("Regular slot assigned:", result.rows[0]);

        // After successful slot creation, broadcast the update
        const eventQuery = await db.query('SELECT start_time, slot_duration, setup_duration FROM events WHERE id = $1', [event_id]);
        const eventDetails = eventQuery.rows[0];

        const slotStartTime = new Date(eventDetails.start_time);
        const slotIndex = slot_number - 1;
        const totalMinutesPerSlot = eventDetails.slot_duration.minutes + eventDetails.setup_duration.minutes;
        slotStartTime.setMinutes(slotStartTime.getMinutes() + (slotIndex * totalMinutesPerSlot));

        const lineupData = {
            type: 'LINEUP_UPDATE',
            eventId: parseInt(event_id),
            action: 'CREATE',
            data: {
                slot_id: result.rows[0].slot_id,
                slot_number: slot_number,
                slot_name: slot_name,
                user_id: null,
                user_name: null,
                slot_start_time: slotStartTime,
                non_user_identifier: null,
                ip_address: null
            }
        };
        
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
            SELECT ls.id AS slot_id, ls.slot_number, u.name AS user_name, u.id AS user_id, ls.slot_name
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
            SELECT ls.*, e.start_time, e.slot_duration, e.setup_duration 
            FROM lineup_slots ls
            JOIN events e ON ls.event_id = e.id
            WHERE ls.id = $1
        `, [slotId]);
        
        if (slotQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Slot not found' });
        }
        
        const slot = slotQuery.rows[0];
        
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

module.exports = router;
