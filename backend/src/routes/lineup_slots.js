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

module.exports = router;
