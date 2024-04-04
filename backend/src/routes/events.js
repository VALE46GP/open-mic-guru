const express = require('express');
const router = express.Router();
const db = require('../db');

// GET all events
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM events');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// GET event details, including venue and host information
router.get('/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const eventQuery = await db.query(`
      SELECT e.*, v.*, u.id AS host_id, u.name AS host_name, e.start_time, e.end_time, e.slot_duration
      FROM events e
      JOIN venues v ON e.venue_id = v.id
      JOIN user_roles ur ON e.id = ur.event_id AND ur.role = 'host'
      JOIN users u ON ur.user_id = u.id
      WHERE e.id = $1
    `, [eventId]);

    if (eventQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const eventData = eventQuery.rows[0];
    const lineupQuery = await db.query('SELECT * FROM lineup_slots WHERE event_id = $1 ORDER BY slot_start_time ASC', [eventId]);
    const lineup = lineupQuery.rows;
    const eventDetails = {
        event: {
            id: eventData.id,
            start_time: eventData.start_time,
            end_time: eventData.end_time,
            slot_duration: eventData.slot_duration,
            additional_info: eventData.additional_info,
        },
        venue: {
            id: eventData.venue_id,
            name: eventData.name,
            address: eventData.address,
            latitude: eventData.latitude,
            longitude: eventData.longitude,
            phone: eventData.phone,
            url: eventData.url,
        },
        host: {
            id: eventData.host_id,
            name: eventData.host_name,
        },
        lineup: lineup
    };

    res.json(eventDetails);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// POST a new event
router.post('/', async (req, res) => {
    try {
        const { venue_id, start_time, end_time, slot_duration, name, additional_info, host_id } = req.body;
        const result = await db.query('INSERT INTO events (venue_id, start_time, end_time, slot_duration, name, additional_info) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', [venue_id, start_time, end_time, slot_duration, name, additional_info]);
        const eventId = result.rows[0].id;
        await db.query('INSERT INTO user_roles (user_id, event_id, role) VALUES ($1, $2, \'host\')', [host_id, eventId]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;
