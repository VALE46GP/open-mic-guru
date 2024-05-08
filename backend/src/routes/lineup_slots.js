const express = require('express');
const router = express.Router();
const db = require('../db');

// POST a new lineup slot
router.post('/', async (req, res) => {
    const { event_id, user_id, slot_number } = req.body;
    try {
        let result = await db.query('UPDATE lineup_slots SET user_id = $2 WHERE event_id = $1 AND slot_number = $3 AND user_id IS NULL RETURNING *', [event_id, user_id, slot_number]);
        
        if (result.rows.length === 0) {
            result = await db.query('INSERT INTO lineup_slots (event_id, user_id, slot_number) VALUES ($1, $2, $3) RETURNING *', [event_id, user_id, slot_number]);
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// GET lineup slots for an event
router.get('/:eventId', async (req, res) => {
    const { eventId } = req.params;
    try {
        const result = await db.query(`
            SELECT ls.slot_number, u.name AS user_name, u.id AS user_id
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

module.exports = router;

