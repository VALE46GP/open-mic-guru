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
                AND u.email_verified = true

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
            WHERE users.email_verified = true
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

    async updateUser(client, email, name, photoUrl, socialMediaJson, userId, bio) {
        const result = await client.query(
            `UPDATE users
             SET email = $1,
                 name = $2,
                 image = $3,
                 social_media_accounts = $4::jsonb,
                 bio = $5
             WHERE id = $6
             RETURNING *`,
            [email, name, photoUrl, socialMediaJson, bio, userId]
        );
        return result.rows[0];
    },

    async getUserByEmail(email) {
        const result = await pool.query(
            `SELECT *,
                CASE 
                    WHEN verification_token_expires > NOW() THEN verification_token_expires
                    ELSE NULL 
                END as active_token_expires
         FROM users 
         WHERE email = $1`,
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

    async checkUserExists(userId) {
        const result = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [userId]
        );
        return result.rows[0];
    },

    async deleteUser(client, userId) {
        return await client.query('DELETE FROM users WHERE id = $1', [userId]);
    },

    async getHostedEvents(userId) {
        const result = await pool.query(
            'SELECT id FROM events WHERE host_id = $1 AND deleted = false',
            [userId]
        );
        return result.rows;
    },

    async createUserWithVerification(email, hashedPassword, name, photoUrl, socialMediaJson, bio, verificationToken, tokenExpires) {
        const result = await pool.query(
            `INSERT INTO users (
                email, password, name, image, social_media_accounts, bio, 
                verification_token, verification_token_expires, email_verified
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
            RETURNING *`,
            [email, hashedPassword, name, photoUrl, socialMediaJson, bio, verificationToken, tokenExpires]
        );
        return result.rows[0];
    },

    async verifyEmail(verificationToken) {
        const result = await pool.query(
            `UPDATE users 
             SET email_verified = true,
                 verification_token = NULL,
                 verification_token_expires = NULL,
                 updated_at = CURRENT_TIMESTAMP
             WHERE verification_token = $1 
             AND verification_token_expires > NOW()
             AND email_verified = false
             RETURNING *`,
            [verificationToken]
        );
        return result.rows[0];
    },

    async getUserByVerificationToken(token) {
        const result = await pool.query(
            `SELECT * FROM users 
             WHERE verification_token = $1 
             AND verification_token_expires > NOW()
             AND email_verified = false`,
            [token]
        );
        return result.rows[0];
    },

    async updateVerificationToken(email, verificationToken, tokenExpires) {
        const result = await pool.query(
            `UPDATE users 
             SET verification_token = $1,
                 verification_token_expires = $2,
                 email_verified = false
             WHERE email = $3
             RETURNING *`,
            [verificationToken, tokenExpires, email]
        );
        return result.rows[0];
    },

    async getRecentlyVerifiedUser(token) {
        const result = await pool.query(`
            SELECT * FROM users 
            WHERE verification_token = $1
            AND email_verified = true 
            LIMIT 1
        `, [token]);
        return result.rows[0];
    },

    async getJustVerifiedUser(originalToken) {
        const result = await pool.query(`
            SELECT * FROM users 
            WHERE email_verified = true 
            AND updated_at >= NOW() - INTERVAL '5 minutes'
            ORDER BY updated_at DESC
            LIMIT 1
        `);
        return result.rows[0];
    },

    async updateResetToken(email, resetToken, tokenExpires) {
        const result = await pool.query(
            `UPDATE users 
             SET reset_password_token = $1,
                 reset_password_expires = $2
             WHERE email = $3
             RETURNING *`,
            [resetToken, tokenExpires, email]
        );
        return result.rows[0];
    },

    async getUserByResetToken(token) {
        const result = await pool.query(
            `SELECT * FROM users 
             WHERE reset_password_token = $1`,
            [token]
        );
        return result.rows[0];
    },

    async updatePasswordAndClearResetToken(email, hashedPassword) {
        const result = await pool.query(
            `UPDATE users 
             SET password = $1,
                 reset_password_token = NULL,
                 reset_password_expires = NULL
             WHERE email = $2
             RETURNING *`,
            [hashedPassword, email]
        );
        return result.rows[0];
    }
};

module.exports = { userQueries };
