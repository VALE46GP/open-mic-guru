const express = require('express');
const router = express.Router();
const lineupSlotsController = require('../controllers/lineup_slots');

// POST a new lineup slot
router.post('/', lineupSlotsController.createSlot);

// GET lineup slots for an event
router.get('/:eventId', lineupSlotsController.getEventSlots);

// DELETE a lineup slot
router.delete('/:slotId', lineupSlotsController.deleteSlot);

// PUT reorder lineup slots
router.put('/reorder', lineupSlotsController.reorderSlots);

// GET signup status for an event
router.get('/:eventId/status', lineupSlotsController.getSignupStatus);

// PUT toggle signup status for an event
router.put('/:eventId/toggle-signup', lineupSlotsController.toggleSignupStatus);

module.exports = router;
