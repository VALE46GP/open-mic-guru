const express = require('express');
const router = express.Router();
const db = require('../db');

// Check if a venue exists by name and address, or create a new one
router.post('/checkOrCreate', async (req, res) => {
    const { name, address, latitude, longitude } = req.body;

    console.log('Received venue data:', req.body); // Added logging to help debug

    try {
        // Check if venue exists based on name and address
        let venue = await db.query('SELECT * FROM venues WHERE name = $1 AND address = $2', [name, address]);
        if (venue.rows.length > 0) {
            // Venue exists, return its ID
            res.json({ venueId: venue.rows[0].id });
        } else {
            // Venue doesn't exist, create a new one
            const newVenue = await db.query(
                'INSERT INTO venues (name, address, latitude, longitude) VALUES ($1, $2, $3, $4) RETURNING *',
                [name, address, latitude, longitude]
            );
            res.status(201).json({ venueId: newVenue.rows[0].id });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
