const express = require('express');
const router = express.Router();
const db = require('../db');

// Check if a venue exists by name and address, or create a new one
router.post('/checkOrCreate', async (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    try {
        let venue = await db.query(
            'SELECT * FROM venues WHERE name = $1 AND address = $2',
            [name, address]
        );

        if (venue.rows.length > 0) {
            res.json({ venueId: venue.rows[0].id });
        } else {
            const newVenue = await db.query(
                'INSERT INTO venues (name, address, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, address, latitude, longitude]
            );
            res.status(201).json({ venueId: newVenue.rows[0].id });
        }
    } catch (err) {
        console.error('Venue creation error:', err);
        res.status(500).json({ error: 'Failed to process venue' });
    }
});

module.exports = router;
