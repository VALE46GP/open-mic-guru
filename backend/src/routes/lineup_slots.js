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
                `SELECT id FROM lineup_slots WHERE event_id = $1 AND (non_user_identifier = $2 OR ip_address = $3)`,
                [event_id, nonUserIdForSlot, ipAddressForSlot]
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

router.delete('/:slotId', async (req, res) => {
    const { slotId } = req.params;
    try {
        await db.query('DELETE FROM lineup_slots WHERE id = $1', [slotId]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;
