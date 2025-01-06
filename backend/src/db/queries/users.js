const pool = require('../index');

const userQueries = {
    async getAllUsers() {
        const result = await pool.query(`
            WITH user_event_types AS (
                SELECT DISTINCT
                    u.id as user_id,
                    unnest(e.types) as event_type
                FROM users u
                         LEFT JOIN events e ON e.host_id = u.id
                WHERE e.types IS NOT NULL

                UNION

                SELECT DISTINCT
                    ls.user_id,
                    unnest(e.types) as event_type
                FROM lineup_slots ls
                         JOIN events e ON e.id = ls.event_id
                WHERE e.types IS NOT NULL
            )
            SELECT
                users.id,
                users.name,
                users.image,
                users.social_media_accounts,
                users.bio,
                CASE
                    WHEN EXISTS(
                            SELECT 1
                            FROM events
                            WHERE events.host_id = users.id
                        ) THEN true
                    ELSE false
                    END AS is_host,
                CASE
                    WHEN EXISTS(
                            SELECT 1
                            FROM lineup_slots
                            WHERE lineup_slots.user_id = users.id
                        ) THEN true
                    ELSE false
                    END AS is_performer,
                array_agg(DISTINCT uet.event_type) FILTER (WHERE uet.event_type IS NOT NULL) as event_types
            FROM users
                     LEFT JOIN user_event_types uet ON users.id = uet.user_id
            GROUP BY users.id, users.name, users.image, users.social_media_accounts
        `);
        return result.rows;
    },

    async createUser(email, hashedPassword, name, photoUrl, socialMediaJson, bio) {
        const result = await pool.query(
            `INSERT INTO users (email, password, name, image, social_media_accounts, bio)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [email, hashedPassword, name, photoUrl, socialMediaJson, bio]
        );
        return result.rows[0];
    },

    async updateUser(client, email, name, photoUrl, socialMediaJson, hashedPassword, userId, bio) {
        let updateQuery = `
            UPDATE users
            SET email = $1,
                name = $2,
                image = $3,
                social_media_accounts = $4::jsonb,
                bio = $5
        `;
        let queryParams = [email, name, photoUrl, socialMediaJson, bio];

        if (hashedPassword) {
            queryParams.push(hashedPassword);
            updateQuery += `, password = $${queryParams.length}`;
        }

        queryParams.push(userId);
        updateQuery += ` WHERE id = $${queryParams.length} RETURNING *`;

        const result = await client.query(updateQuery, queryParams);
        return result.rows[0];
    },

    async getUserByEmail(email) {
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1',
            [email]
        );
        return result.rows[0];
    },

    async getUserProfileById(userId) {
        const result = await pool.query(
            'SELECT id, name, email, image, social_media_accounts, bio FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    },

    async getUserEvents(userId) {
        const result = await pool.query(`
            SELECT DISTINCT 
                e.id AS event_id,
                e.name AS event_name,
                e.start_time,
                e.end_time,
                e.slot_duration,
                e.additional_info,
                e.types AS event_types,
                e.image     AS event_image,
                e.active,
                v.id AS venue_id,
                v.name AS venue_name,
                u.name AS host_name,
                CASE
                    WHEN e.host_id = $1 THEN true
                    ELSE false
                END AS is_host,
                CASE
                    WHEN ls.user_id IS NOT NULL THEN true
                    ELSE false
                END AS is_performer,
                ls.slot_number,
                e.start_time +
                (INTERVAL '1 minute' * (ls.slot_number - 1) *
                    (EXTRACT (EPOCH FROM e.slot_duration + e.setup_duration) / 60)
                ) AS performer_slot_time
            FROM events e
                JOIN venues v ON e.venue_id = v.id
                JOIN users u ON e.host_id = u.id
                LEFT JOIN lineup_slots ls ON e.id = ls.event_id
                    AND ls.user_id = $1
            WHERE (e.host_id = $1 OR ls.user_id = $1)
                AND e.deleted = false
            ORDER BY e.start_time DESC
        `, [userId]);
        return result.rows;
    },

    async getUserPassword(userId) {
        const result = await pool.query(
            'SELECT password FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    },

    async checkUserExists(userId) {
        const result = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    },

    async deleteUser(client, userId) {
        return await client.query('DELETE FROM users WHERE id = $1', [userId]);
    }
};

module.exports = { userQueries };
