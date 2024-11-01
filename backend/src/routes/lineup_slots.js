const express = require('express');
const router = express.Router();
const db = require('../db');

// POST a new lineup slot
router.post('/', async (req, res) => {
    const { event_id, user_id, slot_number, slot_name } = req.body;

    // Allow sign-ups without a user_id
    if (!user_id && !slot_name) {
        return res.status(400).json({ error: 'Non-users must provide a name' });
    }

    try {
        const result = await db.query(
            'INSERT INTO lineup_slots (event_id, user_id, slot_number, slot_name) VALUES ($1, $2, $3, $4) RETURNING *',
            [event_id, user_id || null, slot_number, slot_name]
        );
        console.log('Sign-up successful:', result.rows[0]);
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
