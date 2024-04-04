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
      SELECT e.*, v.*, u.id AS host_id, u.name AS host_name
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
      const eventDetails = {
          event: {
              id: eventData.id,
              date_time: eventData.date_time,
              additional_info: eventData.additional_info,
          },
          venue: {
              id: eventData.venue_id, // Assuming venue_id and id should be the same for venue
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
        const { venue_id, date_time, name, additional_info, host_id } = req.body;
        const result = await db.query('INSERT INTO events (venue_id, date_time, name, additional_info) VALUES ($1, $2, $3, $4) RETURNING *', [venue_id, date_time, name, additional_info]);
        const eventId = result.rows[0].id;
        await db.query('INSERT INTO user_roles (user_id, event_id, role) VALUES ($1, $2, \'host\')', [host_id, eventId]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

module.exports = router;
