const express = require('express');
const router = express.Router();
const venuesController = require('../controllers/venues');

// Check if a venue exists by name and address, or create a new one
router.post('/checkOrCreate', venuesController.checkOrCreateVenue);

module.exports = router;
