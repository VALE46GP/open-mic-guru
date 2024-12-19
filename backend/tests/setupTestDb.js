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
            INSERT INTO users (email, password, name, image) VALUES
            ('test@example.com', 'test123', 'Test User', 'test-image.jpg'),
            ('host@example.com', 'host123', 'Host User', 'host-image.jpg'),
            ('performer@example.com', 'perf123', 'Performer User', 'performer-image.jpg')
            ON CONFLICT (email) DO NOTHING;
        `);

        // 2. Venues
        await client.query(`
            INSERT INTO venues (name, address, latitude, longitude) VALUES
            ('Test Venue', '123 Test St', 40.7128, -74.0060),
            ('Comedy Club', '456 Laugh Ave', 40.7589, -73.9851)
            RETURNING id;
        `);

        // 3. Events (using returned venue id)
        await client.query(`
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
                (SELECT id FROM users WHERE email = 'host@example.com'),
                ARRAY['comedy', 'music']
            FROM venues v
            WHERE v.name = 'Test Venue'
            RETURNING id;
        `);

        // 4. Lineup Slots
        await client.query(`
            INSERT INTO lineup_slots (event_id, user_id, slot_number, slot_name)
            SELECT 
                e.id,
                u.id,
                1,
                'Test Performance'
            FROM events e, users u
            WHERE u.email = 'performer@example.com'
            LIMIT 1;
        `);

        // 5. Notification Preferences
        await client.query(`
            INSERT INTO notification_preferences (user_id, notify_event_updates)
            SELECT id, true FROM users;
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
