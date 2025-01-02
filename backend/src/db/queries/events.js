const db = require('../index');
const { convertToUTC } = require('../../utils/timeCalculations');

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
                            v.utc_offset AS venue_utc_offset,
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
                   e.types     AS event_types,
                   e.image     AS event_image,
                   e.active,
                   e.is_signup_open,
                   v.id        AS venue_id,
                   v.name      AS venue_name,
                   v.address   AS venue_address,
                   v.latitude  AS venue_latitude,
                   v.longitude AS venue_longitude,
                   v.utc_offset AS venue_utc_offset,
                   u.id        AS host_id,
                   u.name      AS host_name,
                   u.image     AS host_image
            FROM events e
                     JOIN venues v ON e.venue_id = v.id
                     JOIN users u ON e.host_id = u.id
            WHERE e.id = $1
        `, [eventId]);
        console.log('getEventById: ', result.rows[0])
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
        // First get venue utc_offset
        const venueResult = await db.query(
            'SELECT utc_offset FROM venues WHERE id = $1',
            [eventData.venue_id]
        );

        const venue_utc_offset = venueResult.rows[0]?.utc_offset ?? -420;

        const result = await db.query(`
            INSERT INTO events (
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
            ) VALUES ($1, $2::timestamptz, $3::timestamptz, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
                eventData.venue_id,
                eventData.start_time,
                eventData.end_time,
                eventData.slot_duration,
                eventData.setup_duration,
                eventData.name,
                eventData.additional_info,
                eventData.image,
                eventData.host_id,
                eventData.types
            ]
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

    // TODO: test that all fields update
    async updateEvent(eventId, updates, values) {
        await db.query("SET timezone TO 'UTC'");

        const query = `
            WITH updated AS (
            UPDATE events
            SET start_time = $1::timestamptz,
                end_time = $2::timestamptz,
                name = $3,
                venue_id = $4,
                slot_duration = $5 * interval '1 second',
                setup_duration = $6 * interval '1 second',
                types = $7,
                active = $8,
                image = $9
            WHERE id = $10
                RETURNING *
                )
            SELECT * FROM updated;
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
    },

    async getVenueInfo(venueId) {
        const result = await db.query(`
            SELECT v.id, v.name, v.latitude, v.longitude, v.timezone, v.address
            FROM venues v
            WHERE v.id = $1`,
            [venueId]
        );
        return result.rows[0];
    }
};

module.exports = { eventQueries };
