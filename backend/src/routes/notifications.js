const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');

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
                v.name as venue_name,
                u.name as host_name,
                u.image as host_image,
                e.host_id = n.user_id as is_host,
                EXISTS (
                    SELECT 1 FROM lineup_slots ls 
                    WHERE ls.event_id = e.id 
                    AND ls.user_id = n.user_id
                ) as is_performer
            FROM notifications n
            LEFT JOIN events e ON n.event_id = e.id
            LEFT JOIN venues v ON e.venue_id = v.id
            LEFT JOIN users u ON e.host_id = u.id
            WHERE n.user_id = $1
            ORDER BY n.created_at DESC
        `;

        if (unreadOnly) {
            query += ' AND n.is_read = FALSE';
        }

        query += ` LIMIT $2 OFFSET $3`;

        console.log('Query:', query);
        console.log('Parameters:', [userId, limit, offset]);
        
        const result = await db.query(query, [userId, limit, offset]);
        console.log('Query result count:', result.rows.length);
        if (result.rows.length > 0) {
            console.log('First notification:', result.rows[0]);
        }

        // Get total count for pagination
        const countResult = await db.query(
            'SELECT COUNT(*) FROM notifications WHERE user_id = $1',
            [userId]
        );
        console.log('Total count:', countResult.rows[0].count);

        res.json({
            notifications: result.rows,
            total: parseInt(countResult.rows[0].count),
            currentPage: page,
            totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit)
        });
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
