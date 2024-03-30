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
        const { venue_id, date_time } = req.body;
        const result = await db.query('INSERT INTO events (venue_id, date_time) VALUES ($1, $2) RETURNING *', [venue_id, date_time]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
