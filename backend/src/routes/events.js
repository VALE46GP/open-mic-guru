const express = require('express');
const router = express.Router();
const db = require('../db');

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

// POST a new event
router.post('/', async (req, res) => {
    try {
        const { venue_id, date_time, name, additional_info, host_id } = req.body;
        const result = await db.query('INSERT INTO events (venue_id, date_time, name, additional_info) VALUES ($1, $2, $3, $4) RETURNING *', [venue_id, date_time, name, additional_info]);
        const eventId = result.rows[0].id;
        await db.query('INSERT INTO user_roles (user_id, event_id, role) VALUES ($1, $2, \'host\')', [host_id, eventId]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;
