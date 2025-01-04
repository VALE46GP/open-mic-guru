const { venueQueries } = require('../db/queries/venues');
const { logger } = require('../../tests/utils/logger');
const { createApiResponse, createErrorResponse } = require('../utils/apiResponse');

const venuesController = {
    async checkOrCreateVenue(req, res) {
        const { name, address, latitude, longitude, utc_offset } = req.body;

        try {
            let venue = await venueQueries.getVenueByNameAndAddress(name, address);

            if (venue) {
                res.json({ venueId: venue.id });
            } else {
                const newVenue = await venueQueries.createVenue({
                    name,
                    address,
                    latitude,
                    longitude,
                    utc_offset: utc_offset || -420 // Default to PDT if not provided
                });
                res.json({ venueId: newVenue.id });
            }
        } catch (err) {
            logger.error('Venue creation error:', err);
            res.status(500).json(createErrorResponse('Failed to process venue'));
        }
    },

    async getVenueById(req, res) {
        try {
            const venue = await venueQueries.getVenueById(req.params.id);
            if (!venue) {
                return res.status(404).json(createErrorResponse('Venue not found'));
            }
            res.json(createApiResponse(venue));
        } catch (err) {
            logger.error('Error fetching venue:', err);
            res.status(500).json(createErrorResponse('Server error'));
        }
    }
};

module.exports = venuesController;
