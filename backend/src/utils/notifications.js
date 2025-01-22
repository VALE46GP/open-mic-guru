const db = require('../db');
const { logger } = require('../../tests/utils/logger');
const { sendNotification } = require('./notifications.util');

// Define notification types enum for consistency
const NOTIFICATION_TYPES = {
    EVENT_STATUS: 'event_status',     // Event cancelled/reinstated
    EVENT_UPDATE: 'event_update',     // Event details changed
    LINEUP_SIGNUP: 'lineup_signup',   // New signup to lineup
    LINEUP_UNSIGN: 'lineup_unsign',   // Removal from lineup
    SLOT_REMOVED: 'slot_removed',     // Slot was removed
    SLOT_TIME_CHANGE: 'slot_time_change', // Performance time changed
};

async function createNotification(userId, type, message, eventId = null, lineupSlotId = null, req = null) {
    try {
        // Set timezone to UTC
        await db.query("SET timezone TO 'UTC'");
        
        // Check user's notification preferences
        const prefsResult = await db.query(
            'SELECT * FROM notification_preferences WHERE user_id = $1',
            [userId]
        );

        // logger.log('Notification preferences for user:', userId, prefsResult.rows[0]);

        const prefs = prefsResult.rows[0];
        if (!prefs) {
            logger.log('No notification preferences found for user:', userId);
            return;
        }

        // Determine notification type for preferences check
        let notificationType;
        if (type === NOTIFICATION_TYPES.EVENT_STATUS || type === NOTIFICATION_TYPES.EVENT_UPDATE) {
            notificationType = 'event';
        } else if (type.includes('lineup') || type.includes('slot')) {
            notificationType = 'lineup';
        } else {
            notificationType = 'other';
        }

        // Check if this type of notification is enabled
        if (notificationType === 'event' && !prefs.notify_event_updates) {
            logger.log('Event notifications disabled for user:', userId);
            return;
        }
        if (notificationType === 'lineup' && !prefs.notify_signup_notifications) {
            logger.log('Lineup notifications disabled for user:', userId);
            return;
        }
        if (notificationType === 'other' && !prefs.notify_other) {
            logger.log('Other notifications disabled for user:', userId);
            return;
        }

        // Create the notification in database
        const result = await db.query(
            `INSERT INTO notifications 
             (user_id, type, message, event_id, lineup_slot_id, created_at) 
             VALUES ($1, $2, $3, $4, $5, NOW())
             RETURNING *`,
            [userId, type, message, eventId, lineupSlotId]
        );

        // Get complete notification data
        const notificationData = await db.query(`
            SELECT 
                n.*,
                e.name as event_name,
                e.start_time as event_start_time,
                e.image as event_image,
                e.slot_duration,
                e.setup_duration,
                e.types as event_types,
                e.active,
                v.name as venue_name,
                v.utc_offset as venue_utc_offset,
                u.name as host_name
            FROM notifications n
            LEFT JOIN events e ON n.event_id = e.id
            LEFT JOIN venues v ON e.venue_id = v.id
            LEFT JOIN users u ON e.host_id = u.id
            WHERE n.id = $1
        `, [result.rows[0].id]);

        // Broadcast through WebSocket
        if (req?.app?.locals?.broadcastNotification) {
            const notificationPayload = {
                type: 'NEW_NOTIFICATION',
                userId,
                notification: notificationData.rows[0]
            };
            req.app.locals.broadcastNotification(notificationPayload);
        }

        // If user has external notifications enabled (e.g., email via SNS)
        if (prefs.notify_external && process.env.AWS_SNS_TOPIC_ARN) {
            try {
                await sendNotification(notificationData.rows[0], process.env.AWS_SNS_TOPIC_ARN);
            } catch (snsError) {
                logger.error('Error sending SNS notification:', snsError);
                // Don't throw error here - we still created the notification in our DB
            }
        }

        return result.rows[0];
    } catch (err) {
        logger.error('Error creating notification:', err);
        throw err;
    }
}

module.exports = {
    createNotification,
    NOTIFICATION_TYPES
};
