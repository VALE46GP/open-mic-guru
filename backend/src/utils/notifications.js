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
    } catch (err) {
        console.error('Error creating notification:', err);
        throw err; // Re-throw to see the error in the lineup_slots route
    }
}

module.exports = {
    createNotification
};
