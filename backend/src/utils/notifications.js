const db = require('../db');

async function createNotification(userId, type, message, eventId = null, lineupSlotId = null) {
    try {
        // Check user's notification preferences
        const prefsResult = await db.query(
            'SELECT * FROM notification_preferences WHERE user_id = $1',
            [userId]
        );
        
        console.log('Notification preferences for user:', userId, prefsResult.rows[0]);
        
        const prefs = prefsResult.rows[0];
        if (!prefs) {
            console.log('No notification preferences found for user:', userId);
            return;
        }
        
        // Check if this type of notification is enabled
        if (type.includes('event') && !prefs.notify_event_updates) {
            console.log('Event notifications disabled for user:', userId);
            return;
        }
        if (type.includes('lineup') && !prefs.notify_signup_notifications) {
            console.log('Lineup notifications disabled for user:', userId);
            return;
        }
        if (!type.includes('event') && !type.includes('lineup') && !prefs.notify_other) {
            console.log('Other notifications disabled for user:', userId);
            return;
        }

        // Create the notification
        const result = await db.query(
            `INSERT INTO notifications 
             (user_id, type, message, event_id, lineup_slot_id) 
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, type, message, eventId, lineupSlotId]
        );
        
        console.log('Notification created:', result.rows[0]);

        // Get complete notification data for broadcast
        const notificationData = await db.query(`
            SELECT 
                n.*,
                e.name as event_name,
                e.start_time as event_start_time,
                e.image as event_image,
                v.name as venue_name,
                u.name as host_name
            FROM notifications n
            LEFT JOIN events e ON n.event_id = e.id
            LEFT JOIN venues v ON e.venue_id = v.id
            LEFT JOIN users u ON e.host_id = u.id
            WHERE n.id = $1
        `, [result.rows[0].id]);

        // Broadcast the notification
        if (global.app && global.app.locals.broadcastNotification) {
            const notificationPayload = {
                type: 'NOTIFICATION_UPDATE',
                userId: userId,
                notification: notificationData.rows[0]
            };
            console.log('Broadcasting notification:', notificationPayload);
            global.app.locals.broadcastNotification(notificationPayload);
        }

        return result.rows[0];
    } catch (err) {
        console.error('Error creating notification:', err);
        throw err;
    }
}

module.exports = {
    createNotification
};
