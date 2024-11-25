const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const { calculateSlotStartTime } = require('../utils/timeCalculations');

router.use((req, res, next) => {
    console.log('Notifications route hit:', {
        method: req.method,
        path: req.path,
        headers: req.headers
    });
    next();
});

// Get notifications for current user
router.get('/', verifyToken, async (req, res) => {
    console.log('Received GET request for notifications');
    try {
        const userId = req.user.userId;
        console.log('User ID:', userId);
        
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const offset = (page - 1) * limit;
        const unreadOnly = req.query.unread === 'true';
        
        let query = `
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
                u.name as host_name,
                u.image as host_image,
                e.host_id = n.user_id as is_host,
                ls.slot_number,
                CASE 
                    WHEN ls.user_id = n.user_id THEN true 
                    ELSE false 
                END as is_performer
            FROM notifications n
            LEFT JOIN events e ON n.event_id = e.id
            LEFT JOIN venues v ON e.venue_id = v.id
            LEFT JOIN users u ON e.host_id = u.id
            LEFT JOIN lineup_slots ls ON e.id = ls.event_id AND ls.user_id = n.user_id
            WHERE n.user_id = $1
            ${unreadOnly ? 'AND n.is_read = FALSE' : ''}
            ORDER BY n.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await db.query(query, [userId, limit, offset]);
        console.log('Query parameters:', { userId, limit, offset });
        console.log('Raw query:', query);
        console.log('Query result count:', result.rows.length);
        console.log('First notification if exists:', result.rows[0]);

        // Get total count for pagination
        const countResult = await db.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
            [userId]
        );
        console.log('Total count:', countResult.rows[0].count);

        const processedNotifications = result.rows.map(notification => {
            if (notification.is_performer && notification.slot_number) {
                const slotTime = calculateSlotStartTime(
                    notification.event_start_time,
                    notification.slot_number,
                    notification.slot_duration,
                    notification.setup_duration
                );
                return {
                    ...notification,
                    performer_slot_time: slotTime
                };
            }
            return notification;
        });

        res.json(processedNotifications);  // Added this line to send the response

    } catch (err) {
        console.error('Detailed error in GET /notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Mark notifications as read
router.post('/mark-read', verifyToken, async (req, res) => {
    try {
        const { notification_ids } = req.body;
        const userId = req.user.userId;

        const result = await db.query(
            `UPDATE notifications 
             SET is_read = TRUE, 
                 read_at = NOW() 
             WHERE id = ANY($1) 
             AND user_id = $2
             RETURNING *`,
            [notification_ids, userId]
        );

        res.json({ 
            success: true,
            updatedNotifications: result.rows 
        });
    } catch (err) {
        console.error('Error marking notifications as read:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get user notification preferences
router.get('/preferences', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await db.query(
            'SELECT * FROM notification_preferences WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            // Create default preferences if none exist
            const defaultPrefs = await db.query(
                `INSERT INTO notification_preferences (user_id) 
                 VALUES ($1) 
                 RETURNING *`,
                [userId]
            );
            res.json(defaultPrefs.rows[0]);
        } else {
            res.json(result.rows[0]);
        }
    } catch (err) {
        console.error('Error fetching notification preferences:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update notification preferences
router.put('/preferences', verifyToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { notify_event_updates, notify_signup_notifications, notify_other } = req.body;

        const result = await db.query(
            `INSERT INTO notification_preferences (
                user_id, 
                notify_event_updates, 
                notify_signup_notifications, 
                notify_other
            ) 
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id) 
            DO UPDATE SET 
                notify_event_updates = $2,
                notify_signup_notifications = $3,
                notify_other = $4
            RETURNING *`,
            [userId, notify_event_updates, notify_signup_notifications, notify_other]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating notification preferences:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

router.delete('/', verifyToken, async (req, res) => {
    try {
        const { eventIds } = req.body;
        const userId = req.user.userId;

        const result = await db.query(
            `DELETE FROM notifications 
             WHERE event_id = ANY($1) 
             AND user_id = $2
             RETURNING *`,
            [eventIds, userId]
        );

        const deletedNotificationIds = result.rows.map(notification => notification.id);
        req.app.locals.broadcastNotification({
            type: 'NOTIFICATION_DELETE',
            userId: userId,
            notificationIds: deletedNotificationIds
        });

        res.json({ 
            success: true,
            deletedNotifications: result.rows 
        });
    } catch (err) {
        console.error('Error deleting notifications:', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
