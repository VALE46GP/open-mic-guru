const db = require('../index');

const eventQueries = {
    async getAllEvents() {
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
                            e.active,
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
        return result.rows;
    },

    async getEventById(eventId) {
        const result = await db.query(`
            SELECT e.id        AS event_id,
                   e.name      AS event_name,
                   e.start_time,
                   e.end_time,
                   e.slot_duration,
                   e.setup_duration,
                   e.additional_info,
                   e.types AS event_types,
                   e.image     AS event_image,
                   e.active,
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
            WHERE e.id = $1
        `, [eventId]);
        return result.rows[0];
    },

    async getEventLineup(eventId, nonUserId, ipAddress) {
        const result = await db.query(`
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
        return result.rows;
    },

    async checkEventHost(eventId) {
        const result = await db.query('SELECT host_id FROM events WHERE id = $1', [eventId]);
        return result.rows[0];
    },

    async createEvent(eventData) {
        const {
            venue_id,
            start_time,
            end_time,
            slot_duration,
            setup_duration,
            name,
            additional_info,
            image,
            host_id,
            types
        } = eventData;

        const result = await db.query(
            'INSERT INTO events (venue_id, start_time, end_time, slot_duration, setup_duration, name, additional_info, image, host_id, types) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
            [venue_id, start_time, end_time, slot_duration, setup_duration, name, additional_info, image, host_id, types]
        );
        return result.rows[0];
    },

    async getOriginalEvent(eventId) {
        const result = await db.query(
            'SELECT name, venue_id, start_time, end_time, slot_duration, setup_duration, types, active FROM events WHERE id = $1',
            [eventId]
        );
        return result.rows[0];
    },

    async updateEvent(eventId, updates, values) {
        const query = `
            UPDATE events 
            SET ${updates.join(', ')} 
            WHERE id = $${values.length} 
            RETURNING *
        `;
        const result = await db.query(query, values);
        return result.rows[0];
    },

    async getLineupUsers(eventId) {
        const result = await db.query(`
            SELECT 
                ls.user_id,
                ls.slot_number,
                u.name as user_name
            FROM lineup_slots ls
            JOIN users u ON ls.user_id = u.id
            WHERE ls.event_id = $1 
            AND ls.user_id IS NOT NULL`,
            [eventId]
        );
        return result.rows;
    },

    async deleteEvent(eventId) {
        await db.query('DELETE FROM lineup_slots WHERE event_id = $1', [eventId]);
        await db.query('DELETE FROM events WHERE id = $1', [eventId]);
    },

    async extendEvent(eventId, newEndTime) {
        const result = await db.query(
            'UPDATE events SET end_time = $1 WHERE id = $2 RETURNING *',
            [newEndTime, eventId]
        );
        return result.rows[0];
    }
};

module.exports = { eventQueries };
