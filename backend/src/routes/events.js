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

function getUpdateMessage(originalEvent, updatedFields) {
    const changes = [];
    
    if (updatedFields.name !== undefined && updatedFields.name !== originalEvent.name) {
        changes.push(`Name changed to "${updatedFields.name}"`);
    }
    
    if (updatedFields.start_time !== undefined && 
        new Date(updatedFields.start_time).getTime() !== new Date(originalEvent.start_time).getTime()) {
        const oldTime = new Date(originalEvent.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const newTime = new Date(updatedFields.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        changes.push(`Start time changed from ${oldTime} to ${newTime}`);
    }
    
    if (updatedFields.end_time !== undefined && 
        new Date(updatedFields.end_time).getTime() !== new Date(originalEvent.end_time).getTime()) {
        const oldTime = new Date(originalEvent.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        const newTime = new Date(updatedFields.end_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        changes.push(`End time changed from ${oldTime} to ${newTime}`);
    }
    
    if (updatedFields.venue_id !== undefined && updatedFields.venue_id !== originalEvent.venue_id) {
        changes.push('Venue has been changed');
    }
    
    if (updatedFields.slot_duration !== undefined && originalEvent.slot_duration) {
        const newDuration = typeof updatedFields.slot_duration === 'object' 
            ? updatedFields.slot_duration.minutes 
            : Math.floor(updatedFields.slot_duration / 60);
        const oldDuration = typeof originalEvent.slot_duration === 'object'
            ? originalEvent.slot_duration.minutes
            : Math.floor(originalEvent.slot_duration / 60);
        
        if (newDuration !== oldDuration) {
            changes.push(`Slot duration changed from ${oldDuration} to ${newDuration} minutes`);
        }
    }

    return changes.join(', ');
}

// GET all events
router.get('/', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT DISTINCT e.id        AS event_id,
                            e.name      AS event_name,
                            e.start_time,
                            e.end_time,
                            e.slot_duration,
                            e.setup_duration,
                            e.additional_info,
                            e.image     AS event_image,
                            v.id        AS venue_id,
                            v.name      AS venue_name,
                            v.address   AS venue_address,
                            v.latitude  AS venue_latitude,
                            v.longitude AS venue_longitude,
                            e.host_id,
                            u.name      AS host_name,
                            ls.user_id  AS performer_id,
                            ls.slot_number,
                            e.start_time +
                            (INTERVAL '1 minute' * (ls.slot_number - 1) *
                                (EXTRACT (EPOCH FROM e.slot_duration + e.setup_duration) / 60)
                                )       AS performer_slot_time
            FROM events e
                     JOIN venues v ON e.venue_id = v.id
                     LEFT JOIN users u ON e.host_id = u.id
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
            SELECT e.id        AS event_id,
                   e.name      AS event_name,
                   e.start_time,
                   e.end_time,
                   e.slot_duration,
                   e.setup_duration,
                   e.additional_info,
                   e.image     AS event_image,
                   v.id        AS venue_id,
                   v.name      AS venue_name,
                   v.address   AS venue_address,
                   v.latitude  AS venue_latitude,
                   v.longitude AS venue_longitude,
                   u.id        AS host_id,
                   u.name      AS host_name,
                   u.image     AS host_image
            FROM events e
                     JOIN venues v ON e.venue_id = v.id
                     JOIN users u ON e.host_id = u.id
            WHERE e.id = $1;

        `, [eventId]);

        if (eventQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        const eventData = eventQuery.rows[0];
        const lineupQuery = await db.query(`
            SELECT ls.id   AS slot_id,
                   ls.slot_number,
                   ls.event_id,
                   ls.non_user_identifier,
                   ls.ip_address,
                   u.name  AS user_name,
                   u.id    AS user_id,
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
        const {
            venue_id,
            start_time,
            end_time,
            slot_duration,
            setup_duration = 5,
            name,
            additional_info,
            host_id,
            image
        } = req.body;

        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        const result = await db.query(
            'INSERT INTO events (venue_id, start_time, end_time, slot_duration, setup_duration, name, additional_info, image, host_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [venue_id, start_time, end_time, slot_duration, setup_duration, name, additional_info, image, host_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// PUT an existing event
router.put('/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const {
        name,
        start_time,
        end_time,
        slot_duration,
        setup_duration,
        venue_id,
        additional_info,
        image
    } = req.body;

    try {
        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        // Get the original event details to check what changed
        const originalEvent = await db.query(
            'SELECT name, venue_id, start_time, end_time, slot_duration, setup_duration FROM events WHERE id = $1',
            [eventId]
        );

        const updateMessage = getUpdateMessage(originalEvent.rows[0], {
            ...(name !== undefined && { name }),
            ...(start_time !== undefined && { start_time }),
            ...(end_time !== undefined && { end_time }),
            ...(venue_id !== undefined && { venue_id }),
            ...(slot_duration !== undefined && { slot_duration }),
            ...(setup_duration !== undefined && { setup_duration })
        });

        if (updateMessage) {
            // Create notifications for all users in the lineup
            const lineupUsers = await db.query(
                'SELECT DISTINCT user_id FROM lineup_slots WHERE event_id = $1 AND user_id IS NOT NULL',
                [eventId]
            );

            const { createNotification } = require('../utils/notifications');
            for (const user of lineupUsers.rows) {
                try {
                    await createNotification(
                        user.user_id,
                        'event_update',
                        updateMessage,
                        eventId
                    );
                } catch (err) {
                    console.error('Error creating notification for user:', user.user_id, err);
                }
            }
        }

        // Update the event in the database
        const result = await db.query(
            'UPDATE events SET name = $1, start_time = $2, end_time = $3, slot_duration = $4, setup_duration = $5, venue_id = $6, additional_info = $7, image = $8 WHERE id = $9 RETURNING *',
            [name, start_time, end_time, slot_duration, setup_duration, venue_id, additional_info, image, eventId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Get venue details if venue changed
        let venueChange = '';
        if (venue_id !== originalEvent.rows[0].venue_id) {
            const venueResult = await db.query(
                'SELECT name FROM venues WHERE id = $1',
                [venue_id]
            );
            venueChange = ` Location changed to ${venueResult.rows[0].name}.`;
        }

        // Broadcast the update via WebSocket with all updated event data
        const updateData = {
            type: 'EVENT_UPDATE',
            eventId: parseInt(eventId),
            data: {
                name,
                start_time,
                end_time,
                slot_duration,
                setup_duration,
                venue_id,
                additional_info,
                image
            }
        };

        req.app.locals.broadcastLineupUpdate(updateData);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// DELETE an event
router.delete('/:eventId', verifyToken, async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user?.userId; // Access the userId from `req.user`

    try {
        // Validate if the user is the host of the event
        const hostCheck = await db.query(
            'SELECT host_id FROM events WHERE id = $1',
            [eventId]
        );

        if (hostCheck.rows.length === 0) {
            console.log('Event not found or no host associated with it');
            return res.status(404).json({ error: 'Event not found' });
        }

        const hostId = hostCheck.rows[0].host_id;

        if (hostId !== userId) {
            console.log(`User ${userId} is not the host of the event ${eventId}`);
            return res.status(403).json({ error: 'Only the host can delete this event' });
        }

        // Proceed to delete event
        await db.query('DELETE FROM lineup_slots WHERE event_id = $1', [eventId]);
        await db.query('DELETE FROM events WHERE id = $1', [eventId]);

        console.log(`Event ${eventId} deleted successfully`);
        res.status(204).send();
    } catch (err) {
        console.error('Error while deleting event:', err);
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
            'SELECT end_time, slot_duration, setup_duration, name FROM events WHERE id = $1',
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

        // Get all unique users in the lineup
        const lineupUsers = await db.query(
            'SELECT DISTINCT user_id FROM lineup_slots WHERE event_id = $1 AND user_id IS NOT NULL',
            [eventId]
        );

        // Create notifications for all users in the lineup
        const { createNotification } = require('../utils/notifications');
        for (const user of lineupUsers.rows) {
            try {
                await createNotification(
                    user.user_id,
                    'event_update',
                    `The end time for "${event.name}" has been extended`,
                    eventId
                );
            } catch (err) {
                console.error('Error creating notification for user:', user.user_id, err);
                // Continue with other notifications even if one fails
            }
        }

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
