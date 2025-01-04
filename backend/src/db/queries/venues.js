const db = require('../index');

const venueQueries = {
    async getVenueByNameAndAddress(name, address) {
        const result = await db.query(
            'SELECT * FROM venues WHERE name = $1 AND address = $2',
            [name, address]
        );
        return result.rows[0];
    },

    async createVenue(venue) {
        const result = await db.query(
            'INSERT INTO venues (name, address, latitude, longitude, utc_offset) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [venue.name, venue.address, venue.latitude, venue.longitude, venue.utc_offset ?? -420]
        );
        return result.rows[0];
    },

    async getVenueById(id) {
        const result = await db.query(
            'SELECT * FROM venues WHERE id = $1',
            [id]
        );
        return result.rows[0];
    },

    async getVenueInfo(venueId) {
        const result = await db.query(
            'SELECT id, name, address, latitude, longitude, utc_offset FROM venues WHERE id = $1',
            [venueId]
        );
        return result.rows[0];
    }
};

module.exports = { venueQueries };
