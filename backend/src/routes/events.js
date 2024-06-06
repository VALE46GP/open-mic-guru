const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

// GET all events
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM events');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// GET event details, including venue and host information
router.get('/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const eventQuery = await db.query(`
            SELECT
                e.id AS event_id,
                e.name AS event_name,
                e.start_time,
                e.end_time,
                e.slot_duration,
                e.setup_duration,
                e.additional_info,
                v.id AS venue_id,
                v.name AS venue_name,
                v.address AS venue_address,
                v.latitude AS venue_latitude,
                v.longitude AS venue_longitude,
                u.id AS host_id,
                u.name AS host_name
            FROM events e
                     JOIN venues v ON e.venue_id = v.id
                     JOIN user_roles ur ON e.id = ur.event_id AND ur.role = 'host'
                     JOIN users u ON ur.user_id = u.id
            WHERE e.id = $1;

        `, [eventId]);

        if (eventQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const eventData = eventQuery.rows[0];
        const lineupQuery = await db.query(`
            SELECT ls.id AS slot_id, ls.slot_number, u.name AS user_name, u.id AS user_id, ls.slot_name
            FROM lineup_slots ls
                     LEFT JOIN users u ON ls.user_id = u.id
            WHERE ls.event_id = $1
            ORDER BY ls.slot_number ASC
        `, [eventId]);
        const lineup = lineupQuery.rows;
        const eventDetails = {
            event: {
                id: eventData.event_id,
                name: eventData.event_name,
                start_time: eventData.start_time,
                end_time: eventData.end_time,
                slot_duration: eventData.slot_duration,
                setup_duration: eventData.setup_duration,
                additional_info: eventData.additional_info,
            },
            venue: {
                id: eventData.venue_id,
                name: eventData.venue_name,
                address: eventData.venue_address,
                latitude: eventData.venue_latitude,
                longitude: eventData.venue_longitude,
            },
            host: {
                id: eventData.host_id,
                name: eventData.host_name,
            },
            lineup: lineup
        };

        res.json(eventDetails);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// POST a new event
router.post('/', async (req, res) => {
    try {
        const { venue_id, start_time, end_time, slot_duration, setup_duration = 5, name, additional_info, host_id } = req.body;
        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }
        const result = await db.query('INSERT INTO events (venue_id, start_time, end_time, slot_duration, setup_duration, name, additional_info) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', [venue_id, start_time, end_time, slot_duration, setup_duration, name, additional_info]);
        const eventId = result.rows[0].id;
        await db.query('INSERT INTO user_roles (user_id, event_id, role) VALUES ($1, $2, \'host\')', [host_id, eventId]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// PUT an existing event
router.put('/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const { name, start_time, end_time, slot_duration, setup_duration, venue_id, additional_info } = req.body;

    try {
        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        // Update the event in the database
        const result = await db.query(
            'UPDATE events SET name = $1, start_time = $2, end_time = $3, slot_duration = $4, setup_duration = $5, venue_id = $6, additional_info = $7 WHERE id = $8 RETURNING *',
            [name, start_time, end_time, slot_duration, setup_duration, venue_id, additional_info, eventId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Send back the updated event data
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// DELETE an event
router.delete('/:eventId', verifyToken, async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id; // Assuming req.user is populated by authentication middleware

    try {
        const hostCheck = await db.query('SELECT host_id FROM events WHERE id = $1', [eventId]);
        if (hostCheck.rows.length === 0 || hostCheck.rows[0].host_id !== userId) {
            return res.status(403).json({ error: 'Only the host can delete this event' });
        }

        await db.query('DELETE FROM events WHERE id = $1', [eventId]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;
