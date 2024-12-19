const db = require('../db');

const venuesController = {
    async checkOrCreateVenue(req, res) {
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
    }
};

module.exports = venuesController;
