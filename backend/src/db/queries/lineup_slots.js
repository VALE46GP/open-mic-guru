const db = require('../index');

const lineupSlotsQueries = {
    async checkEventStatus(eventId) {
        const result = await db.query(
            `SELECT active FROM events WHERE id = $1`,
            [eventId]
        );
        return result.rows[0];
    },

    async getEventHost(eventId) {
        const result = await db.query(
            `SELECT host_id FROM events WHERE id = $1`,
            [eventId]
        );
        return result.rows[0];
    },

    async getNotificationPreferences(hostId) {
        const result = await db.query(
            'SELECT * FROM notification_preferences WHERE user_id = $1',
            [hostId]
        );
        return result.rows[0];
    },

    async createNotificationPreferences(hostId) {
        await db.query(
            `INSERT INTO notification_preferences 
             (user_id, notify_event_updates, notify_signup_notifications, notify_other) 
             VALUES ($1, true, true, true)`,
            [hostId]
        );
    },

    async createHostAssignedSlot(eventId, slotNumber, slotName) {
        const result = await db.query(`
            INSERT INTO lineup_slots (event_id, user_id, slot_number, slot_name,
                                   non_user_identifier, ip_address)
            VALUES ($1, NULL, $2, $3, NULL, NULL) 
            RETURNING id AS slot_id, slot_number, slot_name, user_id
        `, [eventId, slotNumber, slotName]);
        return result.rows[0];
    },

    async checkExistingUserSlot(eventId, userId) {
        const result = await db.query(
            `SELECT id FROM lineup_slots WHERE event_id = $1 AND user_id = $2`,
            [eventId, userId]
        );
        return result.rows[0];
    },

    async checkExistingNonUserSlot(eventId, nonUserIdentifier) {
        const result = await db.query(
            `SELECT id FROM lineup_slots WHERE event_id = $1 AND non_user_identifier = $2`,
            [eventId, nonUserIdentifier]
        );
        return result.rows[0];
    },

    async createSlot(eventId, userIdForSlot, slotNumber, slotName, nonUserIdForSlot, ipAddressForSlot) {
        const result = await db.query(`
            WITH inserted AS (
                INSERT INTO lineup_slots 
                    (event_id, user_id, slot_number, slot_name, non_user_identifier, ip_address)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            )
            SELECT inserted.id AS slot_id,
                   inserted.slot_number,
                   inserted.slot_name,
                   inserted.user_id,
                   u.image AS user_image
            FROM inserted
            LEFT JOIN users u ON inserted.user_id = u.id
        `, [eventId, userIdForSlot, slotNumber, slotName, nonUserIdForSlot, ipAddressForSlot]);
        return result.rows[0];
    },

    async getEventDetails(eventId) {
        const result = await db.query(
            'SELECT start_time, slot_duration, setup_duration FROM events WHERE id = $1',
            [eventId]
        );
        return result.rows[0];
    },

    async getEventSlots(eventId) {
        const result = await db.query(`
            SELECT ls.id AS slot_id,
                   ls.slot_number,
                   u.name AS user_name,
                   u.id AS user_id,
                   ls.slot_name
            FROM lineup_slots ls
            LEFT JOIN users u ON ls.user_id = u.id
            WHERE ls.event_id = $1
            ORDER BY ls.slot_number ASC
        `, [eventId]);
        return result.rows;
    },

    async getSlotDetails(slotId) {
        const result = await db.query(`
            SELECT ls.*,
                   e.start_time,
                   e.slot_duration,
                   e.setup_duration,
                   e.host_id,
                   e.name as event_name
            FROM lineup_slots ls
            JOIN events e ON ls.event_id = e.id
            WHERE ls.id = $1
        `, [slotId]);
        return result.rows[0];
    },

    async deleteSlot(slotId) {
        await db.query('DELETE FROM lineup_slots WHERE id = $1', [slotId]);
    },

    async getOldSlotDetails(slotId) {
        const result = await db.query(
            'SELECT slot_number, user_id FROM lineup_slots WHERE id = $1',
            [slotId]
        );
        return result.rows[0];
    },

    async updateSlotNumber(slotId, newSlotNumber) {
        await db.query(
            'UPDATE lineup_slots SET slot_number = $1 WHERE id = $2',
            [newSlotNumber, slotId]
        );
    },

    async getEventDetailsForReorder(slotId) {
        const result = await db.query(`
            SELECT 
                e.id,
                e.name,
                e.start_time,
                EXTRACT(EPOCH FROM e.slot_duration)::integer as slot_duration,
                EXTRACT(EPOCH FROM e.setup_duration)::integer as setup_duration
            FROM events e 
            JOIN lineup_slots ls ON e.id = ls.event_id 
            WHERE ls.id = $1
        `, [slotId]);
        return result.rows[0];
    },

    async getSignupStatus(eventId) {
        const result = await db.query(
            'SELECT is_signup_open FROM events WHERE id = $1',
            [eventId]
        );
        return result.rows[0];
    },

    async updateSignupStatus(eventId, isSignupOpen) {
        await db.query(
            'UPDATE events SET is_signup_open = $1 WHERE id = $2',
            [isSignupOpen, eventId]
        );
    },

    async getVenueUtcOffset(eventId) {
        const result = await db.query(`
            SELECT v.utc_offset
            FROM events e
            JOIN venues v ON e.venue_id = v.id
            WHERE e.id = $1
        `, [eventId]);
        return result.rows[0];
    }
};

module.exports = { lineupSlotsQueries };
