const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const AWS = require('aws-sdk');
const { calculateSlotStartTime, hasTimeRelatedChanges } = require('../utils/timeCalculations');
const { createNotification } = require('../utils/notifications');

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
    
    if (updatedFields.types && 
        (!originalEvent.types || 
         JSON.stringify(updatedFields.types.sort()) !== JSON.stringify(originalEvent.types.sort()))) {
        const oldTypes = (originalEvent.types || [])
            .map(t => t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' '));
        const newTypes = updatedFields.types
            .map(t => t.charAt(0).toUpperCase() + t.slice(1).replace('_', ' '));
        
        if (oldTypes.length === 0) {
            changes.push(`Event types added: ${newTypes.join(', ')}`);
        } else if (newTypes.length === 0) {
            changes.push('Event types removed');
        } else {
            changes.push(`Event types changed to ${newTypes.join(', ')}`);
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
                            e.types AS event_types,
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
                   e.types AS event_types,
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
                event_types: eventData.event_types
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
router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const {
            venue_id,
            start_time,
            end_time,
            slot_duration,
            setup_duration = 5,
            name,
            additional_info,
            image,
            types
        } = req.body;

        // Since this is a new event, the user creating it will be the host
        const host_id = userId;

        if (new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        const result = await db.query(
            'INSERT INTO events (venue_id, start_time, end_time, slot_duration, setup_duration, name, additional_info, image, host_id, types) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [venue_id, start_time, end_time, slot_duration, setup_duration, name, additional_info, image, host_id, types]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

// PATCH an existing event
router.patch('/:eventId', verifyToken, async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.userId;

    try {
        // Check if user is the host
        const hostCheck = await db.query(
            'SELECT host_id FROM events WHERE id = $1',
            [eventId]
        );

        if (hostCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (hostCheck.rows[0].host_id !== userId) {
            return res.status(403).json({ error: 'Only the host can modify this event' });
        }

        const {
            name,
            start_time,
            end_time,
            slot_duration,
            setup_duration,
            venue_id,
            additional_info,
            image,
            types
        } = req.body;

        if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
            return res.status(400).json({ error: 'Start time must be before end time' });
        }

        // Get the original event details to check what changed
        const originalEvent = await db.query(
            'SELECT name, venue_id, start_time, end_time, slot_duration, setup_duration, types FROM events WHERE id = $1',
            [eventId]
        );

        if (originalEvent.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        // Build the update query dynamically based on provided fields
        const updates = [];
        const values = [];
        let paramCount = 1;

        const fields = {
            name, start_time, end_time, slot_duration, 
            setup_duration, venue_id, additional_info, 
            image, types
        };

        for (const [key, value] of Object.entries(fields)) {
            if (value !== undefined) {
                updates.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        values.push(eventId);

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        const updateQuery = `
            UPDATE events 
            SET ${updates.join(', ')} 
            WHERE id = $${paramCount} 
            RETURNING *
        `;

        const result = await db.query(updateQuery, values);

        // Generate notification message for the changes
        const updateMessage = getUpdateMessage(originalEvent.rows[0], {
            ...(name !== undefined && { name }),
            ...(start_time !== undefined && { start_time }),
            ...(end_time !== undefined && { end_time }),
            ...(venue_id !== undefined && { venue_id }),
            ...(slot_duration !== undefined && { slot_duration }),
            ...(setup_duration !== undefined && { setup_duration }),
            ...(types !== undefined && { types })
        });

        if (updateMessage) {
            // Create notifications for all users in the lineup
            const lineupUsers = await db.query(
                'SELECT DISTINCT user_id FROM lineup_slots WHERE event_id = $1 AND user_id IS NOT NULL',
                [eventId]
            );

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

            // Broadcast the update via WebSocket
            const updateData = {
                type: 'EVENT_UPDATE',
                eventId: parseInt(eventId),
                data: result.rows[0]
            };
            req.app.locals.broadcastLineupUpdate(updateData);
        }

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
router.put('/:eventId/extend', verifyToken, async (req, res) => {
    const { eventId } = req.params;
    const userId = req.user.userId;
    const { additional_slots } = req.body;

    try {
        // Check if user is the host
        const eventQuery = await db.query(
            'SELECT host_id, end_time, slot_duration, setup_duration, name FROM events WHERE id = $1',
            [eventId]
        );

        if (eventQuery.rows.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }

        if (eventQuery.rows[0].host_id !== userId) {
            return res.status(403).json({ error: 'Only the host can modify this event' });
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
