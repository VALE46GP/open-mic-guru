const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const AWS = require('aws-sdk');

// Configure AWS SDK (matching users.js pattern)
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// GET all events
router.get('/', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT DISTINCT
                e.id AS event_id,
                e.name AS event_name,
                e.start_time,
                e.end_time,
                e.slot_duration,
                e.setup_duration,
                e.additional_info,
                e.image AS event_image,
                v.id AS venue_id,
                v.name AS venue_name,
                v.address AS venue_address,
                v.latitude AS venue_latitude,
                v.longitude AS venue_longitude,
                u.id AS host_id,
                u.name AS host_name,
                ls.user_id AS performer_id,
                ls.slot_number,
                e.start_time + 
                    (INTERVAL '1 minute' * 
                        (ls.slot_number - 1) * 
                        (EXTRACT(EPOCH FROM e.slot_duration + e.setup_duration) / 60)
                    ) AS performer_slot_time
            FROM events e
            JOIN venues v ON e.venue_id = v.id
            LEFT JOIN user_roles ur ON e.id = ur.event_id AND ur.role = 'host'
            LEFT JOIN users u ON ur.user_id = u.id
            LEFT JOIN lineup_slots ls ON e.id = ls.event_id
        `);

        // Group performers by event
        const eventsMap = new Map();
        result.rows.forEach(row => {
            const eventId = row.event_id;
            if (!eventsMap.has(eventId)) {
                eventsMap.set(eventId, {
                    ...row,
                    performers: [],
                    performer_slot_times: {}
                });
            }
            if (row.performer_id) {
                const event = eventsMap.get(eventId);
                if (!event.performers.includes(row.performer_id)) {
                    event.performers.push(row.performer_id);
                    event.performer_slot_times[row.performer_id] = row.performer_slot_time;
                }
            }
        });

        res.json(Array.from(eventsMap.values()));
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// GET event details, including venue and host information
router.get('/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const nonUserId = req.cookies?.nonUserId;
        const ipAddress = req.ip;

        const eventQuery = await db.query(`
            SELECT
                e.id AS event_id,
                e.name AS event_name,
                e.start_time,
                e.end_time,
                e.slot_duration,
                e.setup_duration,
                e.additional_info,
                e.image AS event_image,
                v.id AS venue_id,
                v.name AS venue_name,
                v.address AS venue_address,
                v.latitude AS venue_latitude,
                v.longitude AS venue_longitude,
                u.id AS host_id,
                u.name AS host_name,
                u.image AS host_image
            FROM events e
                     JOIN venues v ON e.venue_id = v.id
                     JOIN user_roles ur ON e.id = ur.event_id AND ur.role = 'host'
                     JOIN users u ON ur.user_id = u.id
            WHERE e.id = $1;

        `, [eventId]);

        if (eventQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const eventData = eventQuery.rows[0];
        const lineupQuery = await db.query(`
            SELECT 
                ls.id AS slot_id, 
                ls.slot_number,
                ls.event_id,
                ls.non_user_identifier,
                ls.ip_address,
                u.name AS user_name, 
                u.id AS user_id, 
                u.image AS user_image,
                ls.slot_name,
                ls.non_user_identifier,
                ls.ip_address,
                CASE 
                    WHEN ls.non_user_identifier = $1 OR ls.ip_address = $2 THEN true 
                    ELSE false 
                END AS is_current_non_user
            FROM lineup_slots ls
            LEFT JOIN users u ON ls.user_id = u.id
            WHERE ls.event_id = $3
            ORDER BY ls.slot_number ASC
        `, [nonUserId, ipAddress, eventId]);

        const lineup = lineupQuery.rows;
        const eventDetails = {
            event: {
                id: eventData.event_id,
                name: eventData.event_name,
                start_time: eventData.start_time,
                end_time: eventData.end_time,
                slot_duration: eventData.slot_duration,
                setup_duration: eventData.setup_duration,
                additional_info: eventData.additional_info,
                image: eventData.event_image,
            },
            venue: {
                id: eventData.venue_id,
                name: eventData.venue_name,
                address: eventData.venue_address,
                latitude: eventData.venue_latitude,
                longitude: eventData.venue_longitude,
            },
            host: {
                id: eventData.host_id,
                name: eventData.host_name,
                image: eventData.host_image
            },
            lineup: lineup
        };

        res.json({ 
            event: eventDetails.event,
            venue: eventDetails.venue,
            host: eventDetails.host,
            lineup: lineup,
            currentNonUser: {
                identifier: nonUserId,
                ipAddress: ipAddress
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// POST a new event
router.post('/', async (req, res) => {
    try {
        const { venue_id, start_time, end_time, slot_duration, setup_duration = 5, name, additional_info, host_id, image } = req.body;

        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        const result = await db.query(
            'INSERT INTO events (venue_id, start_time, end_time, slot_duration, setup_duration, name, additional_info, image) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
            [venue_id, start_time, end_time, slot_duration, setup_duration, name, additional_info, image]
        );

        const eventId = result.rows[0].id;
        await db.query('INSERT INTO user_roles (user_id, event_id, role) VALUES ($1, $2, \'host\')', [host_id, eventId]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// PUT an existing event
router.put('/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const { name, start_time, end_time, slot_duration, setup_duration, venue_id, additional_info } = req.body;

    try {
        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        // Update the event in the database
        const result = await db.query(
            'UPDATE events SET name = $1, start_time = $2, end_time = $3, slot_duration = $4, setup_duration = $5, venue_id = $6, additional_info = $7 WHERE id = $8 RETURNING *',
            [name, start_time, end_time, slot_duration, setup_duration, venue_id, additional_info, eventId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Send back the updated event data
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// DELETE an event
router.delete('/:eventId', verifyToken, async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.id; // Assuming req.user is populated by authentication middleware

    try {
        const hostCheck = await db.query('SELECT host_id FROM events WHERE id = $1', [eventId]);
        if (hostCheck.rows.length === 0 || hostCheck.rows[0].host_id !== userId) {
            return res.status(403).json({ error: 'Only the host can delete this event' });
        }

        await db.query('DELETE FROM events WHERE id = $1', [eventId]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// Add new endpoint for extending event duration
router.put('/:eventId/extend', async (req, res) => {
    const { eventId } = req.params;
    const { additional_slots } = req.body;

    try {
        // Get current event details
        const eventQuery = await db.query(
            'SELECT end_time, slot_duration, setup_duration FROM events WHERE id = $1',
            [eventId]
        );

        if (eventQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const event = eventQuery.rows[0];
        const totalMinutesPerSlot = 
            event.slot_duration.minutes + 
            event.setup_duration.minutes;

        // Calculate new end time
        const currentEndTime = new Date(event.end_time);
        const additionalMinutes = totalMinutesPerSlot * additional_slots;
        currentEndTime.setMinutes(currentEndTime.getMinutes() + additionalMinutes);

        // Update the event
        const result = await db.query(
            'UPDATE events SET end_time = $1 WHERE id = $2 RETURNING *',
            [currentEndTime, eventId]
        );

        // Broadcast the update via WebSocket
        const updateData = {
            type: 'EVENT_UPDATE',
            eventId: parseInt(eventId),
            data: {
                end_time: currentEndTime
            }
        };
        
        req.app.locals.broadcastLineupUpdate(updateData);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.post('/upload', async (req, res) => {
  const { fileName, fileType } = req.body;
  const uniqueFileName = `${Date.now()}-${fileName}`;
  const s3Params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `events/${uniqueFileName}`,
    Expires: 60,
    ContentType: fileType
  };

  try {
    const uploadURL = await s3.getSignedUrlPromise('putObject', s3Params);
    res.json({ uploadURL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating upload URL' });
  }
});

module.exports = router;
