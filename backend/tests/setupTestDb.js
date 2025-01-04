const pool = require('../src/db');
const tables = require('../src/db/schema');
const { logger } = require('../tests/utils/logger');

async function setupTestDb() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Drop existing tables
        await client.query(`
            DROP TABLE IF EXISTS 
                links,
                notifications, 
                notification_preferences,
                lineup_slots,
                events,
                venues,
                users
            CASCADE;
        `);

        // Create tables in order
        const tableOrder = [
            'users',
            'venues',
            'events',
            'lineup_slots',
            'notification_preferences',
            'notifications',
            'links'
        ];

        for (const tableName of tableOrder) {
            await client.query(tables[tableName]);
        }

        // Add test data
        // 1. Users
        await client.query(`
            INSERT INTO users (email, password, name, image) 
            SELECT * FROM (VALUES
                ('test@example.com', 'test123', 'Test User', 'test-image.jpg'),
                ('host@example.com', 'host123', 'Host User', 'host-image.jpg'),
                ('performer@example.com', 'perf123', 'Performer User', 'performer-image.jpg')
            ) AS new_values(email, password, name, image)
            WHERE NOT EXISTS (
                SELECT 1 FROM users 
                WHERE users.email = new_values.email
            );
        `);

        // 2. Venues - Remove RETURNING if not needed
        await client.query(`
            INSERT INTO venues (name, address, latitude, longitude) 
            SELECT * FROM (VALUES
                ('Test Venue', '123 Test St', 40.7128, -74.0060),
                ('Comedy Club', '456 Laugh Ave', 40.7589, -73.9851)
            ) AS new_values(name, address, latitude, longitude)
            WHERE NOT EXISTS (
                SELECT 1 FROM venues 
                WHERE venues.name = new_values.name
            );
        `);

        // 3. Events - Modified to be more robust
        await client.query(`
            WITH venue_id AS (
                SELECT id FROM venues WHERE name = 'Test Venue' LIMIT 1
            ), host_id AS (
                SELECT id FROM users WHERE email = 'host@example.com' LIMIT 1
            )
            INSERT INTO events (
                venue_id, 
                name, 
                start_time, 
                end_time, 
                slot_duration, 
                setup_duration,
                host_id,
                types
            )
            SELECT 
                v.id,
                'Test Open Mic',
                NOW() + interval '1 day',
                NOW() + interval '1 day 3 hours',
                interval '10 minutes',
                interval '2 minutes',
                h.id,
                ARRAY['comedy', 'music']::text[]
            FROM venue_id v, host_id h
            WHERE NOT EXISTS (
                SELECT 1 FROM events 
                WHERE name = 'Test Open Mic' 
                AND start_time = NOW() + interval '1 day'
            );
        `);

        // 4. Lineup Slots
        await client.query(`
            WITH event_id AS (
                SELECT id FROM events WHERE name = 'Test Open Mic' LIMIT 1
            ), performer_id AS (
                SELECT id FROM users WHERE email = 'performer@example.com' LIMIT 1
            )
            INSERT INTO lineup_slots (event_id, user_id, slot_number, slot_name)
            SELECT 
                e.id,
                p.id,
                1,
                'Test Performance'
            FROM event_id e, performer_id p
            WHERE NOT EXISTS (
                SELECT 1 FROM lineup_slots ls
                WHERE ls.event_id = e.id 
                AND ls.slot_number = 1
            );
        `);

        // 5. Notification Preferences
        await client.query(`
            INSERT INTO notification_preferences (user_id, notify_event_updates)
            SELECT id, true 
            FROM users u
            WHERE NOT EXISTS (
                SELECT 1 FROM notification_preferences np
                WHERE np.user_id = u.id
            );
        `);

        await client.query('COMMIT');
        logger.log('Test database setup completed successfully');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Test database setup failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

module.exports = setupTestDb;
