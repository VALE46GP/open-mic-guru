const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/events');
const verifyToken = require('../middleware/verifyToken');

// GET all events
router.get('/', eventsController.getAllEvents);

// GET event details by ID
router.get('/:eventId', eventsController.getEventById);

// POST a new event
router.post('/', verifyToken, eventsController.createEvent);

// PATCH an existing event
router.patch('/:eventId', verifyToken, eventsController.updateEvent);

// DELETE an event
router.delete('/:eventId', verifyToken, eventsController.deleteEvent);

// PUT extend event duration
router.put('/:eventId/extend', verifyToken, eventsController.extendEvent);

// POST get upload URL
router.post('/upload', eventsController.getUploadUrl);

module.exports = router;