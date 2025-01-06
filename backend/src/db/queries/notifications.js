const db = require('../index');

const notificationQueries = {
    async getUserNotifications(userId, limit, offset, unreadOnly) {
        const query = `
            SELECT 
                n.*,
                e.name as event_name,
                e.start_time as event_start_time,
                e.image as event_image,
                e.slot_duration,
                e.setup_duration,
                e.types as event_types,
                e.active,
                e.deleted,
                v.name as venue_name,
                v.address as venue_address,
                v.latitude as venue_latitude,
                v.longitude as venue_longitude,
                v.utc_offset as venue_utc_offset,
                u.name as host_name,
                u.image as host_image,
                e.host_id = n.user_id as is_host,
                COALESCE(ls.slot_number, NULL) as slot_number,
                CASE 
                    WHEN ls.user_id = n.user_id THEN true 
                    ELSE false 
                END as is_performer,
                CASE
                    WHEN ls.user_id = n.user_id THEN
                        e.start_time + 
                        (INTERVAL '1 minute' * (ls.slot_number - 1) * 
                        (EXTRACT(EPOCH FROM e.slot_duration + e.setup_duration) / 60))
                    ELSE NULL
                END as performer_slot_time
            FROM notifications n
            LEFT JOIN events e ON n.event_id = e.id
            LEFT JOIN venues v ON e.venue_id = v.id
            LEFT JOIN users u ON e.host_id = u.id
            LEFT JOIN lineup_slots ls ON (
                e.id = ls.event_id 
                AND ls.user_id = n.user_id
            )
            WHERE n.user_id = $1
            ${unreadOnly ? 'AND n.is_read = FALSE' : ''}
            ORDER BY n.created_at DESC
            LIMIT $2 OFFSET $3
        `;
        const result = await db.query(query, [userId, limit, offset]);
        return result.rows;
    },

    async markNotificationsAsRead(notificationIds, userId) {
        await db.query("SET timezone TO 'UTC'");
        
        const result = await db.query(
            `UPDATE notifications 
             SET is_read = TRUE, 
                 read_at = NOW() 
             WHERE id = ANY($1) 
             AND user_id = $2
             RETURNING *`,
            [notificationIds, userId]
        );
        return result.rows;
    },

    async getNotificationPreferences(userId) {
        const result = await db.query(
            'SELECT * FROM notification_preferences WHERE user_id = $1',
            [userId]
        );
        return result.rows[0];
    },

    async createDefaultPreferences(userId) {
        const result = await db.query(
            `INSERT INTO notification_preferences (user_id) 
             VALUES ($1) 
             RETURNING *`,
            [userId]
        );
        return result.rows[0];
    },

    async updateNotificationPreferences(userId, preferences) {
        const { notify_event_updates, notify_signup_notifications, notify_other } = preferences;
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
        return result.rows[0];
    },

    async deleteNotifications(eventIds, userId) {
        const result = await db.query(
            `DELETE FROM notifications 
             WHERE event_id = ANY($1) 
             AND user_id = $2
             RETURNING *`,
            [eventIds, userId]
        );
        return result.rows;
    }
};

module.exports = { notificationQueries };
