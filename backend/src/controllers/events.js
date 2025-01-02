const AWS = require('aws-sdk');
const { eventQueries } = require('../db/queries/events');
const { calculateSlotStartTime, formatTimeToLocalString, formatTimeInTimezone, formatDateInTimezone, formatTimeComparison } = require('../utils/timeCalculations');
const { createNotification, NOTIFICATION_TYPES } = require('../utils/notifications');
const { createApiResponse, createErrorResponse } = require('../utils/apiResponse');
const { logger } = require('../../tests/utils/logger');
const db = require('../db')
const { DateTime } = require('luxon');

// Configure AWS SDK
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

async function getUpdateMessage(originalEvent, updatedFields, venueUtcOffset) {
    const changes = [];

    try {
        console.log('Debug - getUpdateMessage inputs:', {
            originalStartTime: originalEvent.start_time,
            updatedStartTime: updatedFields.start_time,
            venueUtcOffset,
            originalEvent,
            updatedFields
        });

        // Check for event cancellation/reinstatement first
        if (updatedFields.active !== undefined) {
            if (updatedFields.active === false) {
                return 'This event has been cancelled.';
            } else if (updatedFields.active === true && !originalEvent.active) {
                return 'This event has been reinstated.';
            }
        }

        // Handle start time changes
        if (updatedFields.start_time !== undefined) {
            const originalDate = originalEvent.start_time instanceof Date 
                ? DateTime.fromJSDate(originalEvent.start_time)
                : DateTime.fromISO(originalEvent.start_time);

            const updatedDate = DateTime.fromISO(updatedFields.start_time);

            if (originalDate.isValid && updatedDate.isValid) {
                if (originalDate.toMillis() !== updatedDate.toMillis()) {
                    const formatConfig = formatTimeComparison(originalDate.toISO(), updatedDate.toISO(), venueUtcOffset);
                    
                    const originalFormatted = DateTime.fromISO(originalDate.toISO())
                        .setZone(`UTC${venueUtcOffset >= 0 ? '+' : ''}${venueUtcOffset / 60}`)
                        .toFormat(formatConfig.format);
                        
                    const updatedFormatted = DateTime.fromISO(updatedDate.toISO())
                        .setZone(`UTC${venueUtcOffset >= 0 ? '+' : ''}${venueUtcOffset / 60}`)
                        .toFormat(formatConfig.format);

                    changes.push(`• The event start time has been changed from ${originalFormatted} to ${updatedFormatted}`);
                }
            }
        }

        // Handle slot duration changes
        if (updatedFields.slot_duration !== undefined) {
            const originalDuration = originalEvent.slot_duration.minutes;
            const newDuration = typeof updatedFields.slot_duration === 'object' 
                ? updatedFields.slot_duration.minutes 
                : Math.floor(updatedFields.slot_duration / 60);

            if (originalDuration !== newDuration) {
                changes.push(`• Performance time slots have been changed from ${originalDuration} minutes to ${newDuration} minutes`);
            }
        }

        // Handle setup duration changes
        if (updatedFields.setup_duration !== undefined) {
            const originalSetup = originalEvent.setup_duration.minutes;
            const newSetup = typeof updatedFields.setup_duration === 'object'
                ? updatedFields.setup_duration.minutes
                : Math.floor(updatedFields.setup_duration / 60);

            if (originalSetup !== newSetup) {
                changes.push(`• Setup time between performances has been changed from ${originalSetup} minutes to ${newSetup} minutes`);
            }
        }

        // Only add venue change message if venue actually changed
        if (updatedFields.venue_id && updatedFields.venue_name && updatedFields.venue_id !== originalEvent.venue_id) {
            changes.push(`• Location changed to ${updatedFields.venue_name}`);
        }

        console.log('Debug - Final changes array:', changes);
        return changes.length > 0 ? changes.join('\n') + '\n\nYour new performance time is ' : '';
    } catch (error) {
        console.error('Error generating update message:', error);
        return 'Event details have been updated';
    }
}

const eventsController = {
    async getAllEvents(req, res) {
        try {
            const events = await eventQueries.getAllEvents();
            const eventsMap = new Map();

            events.forEach(row => {
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

            res.json(createApiResponse({
                events: Array.from(eventsMap.values())
            }));
        } catch (err) {
            logger.error(err);
            res.status(500).json(createErrorResponse('Server error'));
        }
    },

    async getEventById(req, res) {
        try {
            const { eventId } = req.params;
            const nonUserId = req.cookies?.nonUserId;
            const ipAddress = req.ip;

            const eventData = await eventQueries.getEventById(eventId);
            if (!eventData) {
                return res.status(404).json(createErrorResponse('Event not found'));
            }

            const lineup = await eventQueries.getEventLineup(eventId, nonUserId, ipAddress);

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
                    event_types: eventData.event_types,
                    active: eventData.active
                },
                venue: {
                    id: eventData.venue_id,
                    name: eventData.venue_name,
                    address: eventData.venue_address,
                    latitude: eventData.venue_latitude,
                    longitude: eventData.venue_longitude,
                    utc_offset: eventData.venue_utc_offset
                },
                host: {
                    id: eventData.host_id,
                    name: eventData.host_name,
                    image: eventData.host_image
                }
            };

            res.json(createApiResponse({
                event: eventDetails.event,
                venue: eventDetails.venue,
                host: eventDetails.host,
                lineup,
                currentNonUser: {
                    identifier: nonUserId,
                    ipAddress
                }
            }));
        } catch (err) {
            logger.error(err);
            res.status(500).json(createErrorResponse('Server error'));
        }
    },

    async createEvent(req, res) {
        try {
            const {
                venue_id,
                start_time, // UTC
                end_time,   // UTC
                slot_duration,
                setup_duration = 5,
                name,
                additional_info,
                image,
                types
            } = req.body;

            // Validate UTC times
            if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
                return res.status(400).json(createErrorResponse('Start time must be before end time'));
            }

            const eventData = {
                venue_id,
                start_time,  // UTC
                end_time,    // UTC
                slot_duration,
                setup_duration,
                name,
                additional_info,
                image,
                host_id: req.user.userId,
                types
            };

            const result = await eventQueries.createEvent(eventData);
            res.status(201).json(result);
        } catch (err) {
            logger.error(err);
            res.status(500).json(createErrorResponse('Server error'));
        }
    },

    // TODO: check that images and additional_info are being updated
    async updateEvent(req, res) {
        const { eventId } = req.params;
        const userId = req.user.userId;

        try {
            // Set timezone to UTC explicitly
            await db.query("SET timezone TO 'UTC'");

            const hostCheck = await eventQueries.checkEventHost(eventId);
            if (!hostCheck) {
                return res.status(404).json(createErrorResponse('Event not found'));
            }

            if (hostCheck.host_id !== userId) {
                return res.status(403).json(createErrorResponse('Only the host can modify this event'));
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
                types,
                active
            } = req.body;

            // Validate times first
            if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
                return res.status(400).json(createErrorResponse('Start time must be before end time'));
            }

            const originalEvent = await eventQueries.getOriginalEvent(eventId);
            if (!originalEvent) {
                return res.status(404).json(createErrorResponse('Event not found'));
            }

            // Build update query
            const updates = [];
            const values = [];
            let paramCount = 1;

            // Handle start_time and end_time specifically to ensure UTC storage

            if (start_time !== undefined) {
                updates.push(`start_time = $${paramCount}::timestamptz`);
                values.push(start_time);
                paramCount++;
            }

            if (end_time !== undefined) {
                updates.push(`end_time = $${paramCount}::timestamptz`);
                values.push(end_time);
                paramCount++;
            }

            // Handle other fields
            if (name !== undefined) {
                updates.push(`name = $${paramCount}`);
                values.push(name);
                paramCount++;
            }

            if (venue_id !== undefined) {
                updates.push(`venue_id = $${paramCount}`);
                values.push(venue_id);
                paramCount++;
            }

            if (slot_duration !== undefined) {
                updates.push(`slot_duration = $${paramCount} * interval '1 second'`);
                values.push(slot_duration);
                paramCount++;
            }

            if (setup_duration !== undefined) {
                updates.push(`setup_duration = $${paramCount} * interval '1 second'`);
                values.push(setup_duration);
                paramCount++;
            }

            if (types !== undefined) {
                updates.push(`types = $${paramCount}`);
                values.push(types);
                paramCount++;
            }

            if (active !== undefined) {
                updates.push(`active = $${paramCount}`);
                values.push(active);
                paramCount++;
            }

            if (image !== undefined) {
                console.log('Debug - Image before update:', {
                    imageValue: image,
                    imageType: typeof image,
                    isS3URL: typeof image === 'string' && image.includes('amazonaws.com')
                });
                updates.push(`image = $${paramCount}`);
                values.push(image);
                paramCount++;
            }

            if (updates.length === 0) {
                return res.status(400).json(createErrorResponse('No fields to update'));
            }

            // Add eventId as the last parameter
            values.push(eventId);

            const updatedEvent = await eventQueries.updateEvent(eventId, updates, values);

            // TODO: Improve notification message for when slot_time or setup_duration are changed.
            // Create Notifications
            if (start_time !== undefined || end_time !== undefined || slot_duration !== undefined || setup_duration !== undefined || active === false) {
                console.log('Time-related changes detected, preparing notifications...');
                try {
                    // Get venue info with UTC offset
                    let venueInfo;
                    if (venue_id && venue_id !== originalEvent.venue_id) {
                        venueInfo = await eventQueries.getVenueInfo(venue_id);
                    } else {
                        venueInfo = await eventQueries.getVenueInfo(originalEvent.venue_id);
                    }

                    console.log('Venue info:', venueInfo);
                    console.log('Original Event:', originalEvent);

                    if (!venueInfo) {
                        console.error('Venue info not found');
                        return res.status(404).json(createErrorResponse('Venue not found'));
                    }

                    const venueUtcOffset = venueInfo.utc_offset ?? -420; // Default to PDT if not found

                    // Get all users in the lineup
                    const lineupUsers = await eventQueries.getLineupUsers(eventId);
                    console.log('Lineup users found:', lineupUsers);

                    // Get the update message
                    const updateMessage = await getUpdateMessage(originalEvent, {
                        start_time,
                        end_time,
                        slot_duration,
                        setup_duration,
                        active,
                        ...(venue_id !== originalEvent.venue_id && venueInfo ? {
                            venue_id,
                            venue_name: venueInfo.name
                        } : {})
                    }, venueUtcOffset);

                    // Create notifications for each user
                    for (const performer of lineupUsers) {
                        try {
                            // Only add performance time if event wasn't cancelled
                            if (active !== false) {
                                const slotTime = calculateSlotStartTime(
                                    start_time || originalEvent.start_time,
                                    performer.slot_number,
                                    slot_duration || originalEvent.slot_duration,
                                    setup_duration || originalEvent.setup_duration
                                );
                                
                                // First get the base update message
                                let message = updateMessage;
                                
                                // Then append the performer's specific time if there is a base message
                                if (message) {
                                    message += formatTimeToLocalString(slotTime, venueUtcOffset) + '.';
                                } else {
                                    // If no base message (shouldn't happen), just show the time update
                                    message = `Your new performance time is ${formatTimeToLocalString(slotTime, venueUtcOffset)}.`;
                                }

                                await createNotification(
                                    performer.user_id,
                                    active === false || (active === true && !originalEvent.active) 
                                        ? NOTIFICATION_TYPES.EVENT_STATUS 
                                        : NOTIFICATION_TYPES.EVENT_UPDATE,
                                    message,
                                    eventId,
                                    null,
                                    req
                                );
                            }
                        } catch (err) {
                            console.error('Error creating notification for performer:', performer.user_id, err);
                        }
                    }

                    // Broadcast update to connected clients
                    if (req.app.locals.broadcastLineupUpdate) {
                        const updateData = {
                            type: 'EVENT_UPDATE',
                            eventId: parseInt(eventId),
                            data: updatedEvent
                        };
                        req.app.locals.broadcastLineupUpdate(updateData);
                    }
                } catch (err) {
                    console.error('Error sending notifications:', err);
                    // Don't throw error here - we still want to return the updated event
                }
            }

            res.json(updatedEvent);
        } catch (err) {
            console.error('Error updating event:', err);
            res.status(500).json(createErrorResponse('Server error'));
        }
    },

    async deleteEvent(req, res) {
        const { eventId } = req.params;
        const userId = req.user?.userId;

        try {
            const hostCheck = await eventQueries.checkEventHost(eventId);
            if (!hostCheck) {
                return res.status(404).json(createErrorResponse('Event not found'));
            }

            if (hostCheck.host_id !== userId) {
                return res.status(403).json(createErrorResponse('Only the host can delete this event'));
            }

            await eventQueries.deleteEvent(eventId);
            res.status(204).send();
        } catch (err) {
            logger.error('Error while deleting event:', err);
            res.status(500).json(createErrorResponse('Server error'));
        }
    },

    async extendEvent(req, res) {
        const { eventId } = req.params;
        const userId = req.user.userId;
        const { additional_slots } = req.body;

        try {
            const eventData = await eventQueries.getEventById(eventId);
            if (!eventData) {
                return res.status(404).json(createErrorResponse('Event not found'));
            }

            if (eventData.host_id !== userId) {
                return res.status(403).json(createErrorResponse('Only the host can modify this event'));
            }

            const totalMinutesPerSlot =
                eventData.slot_duration.minutes +
                eventData.setup_duration.minutes;

            const currentEndTime = new Date(eventData.end_time);
            const additionalMinutes = totalMinutesPerSlot * additional_slots;
            currentEndTime.setMinutes(currentEndTime.getMinutes() + additionalMinutes);

            const updatedEvent = await eventQueries.extendEvent(eventId, currentEndTime);
            const lineupUsers = await eventQueries.getLineupUsers(eventId);

            for (const performer of lineupUsers) {
                try {
                    const slotTime = calculateSlotStartTime(
                        eventData.start_time,
                        performer.slot_number,
                        eventData.slot_duration,
                        eventData.setup_duration
                    );

                    const message = `The event "${eventData.name}" has been extended. Your performance time is ${formatTimeToLocalString(slotTime)}`;

                    await createNotification(
                        performer.user_id,
                        'event_update',
                        message,
                        eventId,
                        null,
                        req
                    );
                } catch (err) {
                    console.error('Error creating notification for performer:', performer.user_id, err);
                }
            }

            const updateData = {
                type: 'EVENT_UPDATE',
                eventId: parseInt(eventId),
                data: {
                    end_time: currentEndTime
                }
            };

            req.app.locals.broadcastLineupUpdate(updateData);
            res.json(updatedEvent);
        } catch (err) {
            logger.error(err);
            res.status(500).json(createErrorResponse('Server error'));
        }
    },

    async getUploadUrl(req, res) {
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
            logger.error(err);
            res.status(500).json(createErrorResponse('Error generating upload URL'));
        }
    }
};

module.exports = eventsController;
module.exports = eventsController;