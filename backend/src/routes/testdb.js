const express = require('express');
const router = express.Router();
const db = require('../db/index');

router.get('/testdb', async (req, res) => {
    try {
        const usersCountQuery = await db.query('SELECT COUNT(*) AS users_count FROM users');
        const venuesCountQuery = await db.query('SELECT COUNT(*) AS venues_count FROM venues');
        const eventsCountQuery = await db.query('SELECT COUNT(*) AS events_count FROM events');
        const linksCountQuery = await db.query('SELECT COUNT(*) AS links_count FROM links');

        const upcomingEventsQuery = await db.query(`
            SELECT e.id,
                   e.start_time,
                   v.name AS venue_name,
                   e.venue_id,
                   e.additional_info,
                   e.host_id
            FROM events e
                     JOIN venues v ON e.venue_id = v.id
            WHERE e.start_time > NOW()
            ORDER BY e.start_time ASC LIMIT 5
        `);

        const eventsQuery = await db.query(`
            SELECT e.id, e.start_time, e.name, e.venue_id, e.additional_info, e.slot_duration, e.host_id
        `);
        const usersQuery = await db.query('SELECT * FROM users');
        const venuesQuery = await db.query('SELECT * FROM venues');

        res.json({
            counts: {
                users: usersCountQuery.rows[0].users_count,
                venues: venuesCountQuery.rows[0].venues_count,
                events: eventsCountQuery.rows[0].events_count,
                links: linksCountQuery.rows[0].links_count,
            },
            upcomingEvents: upcomingEventsQuery.rows,
            users: usersQuery.rows,
            events: eventsQuery.rows,
            venues: venuesQuery.rows
        });
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).send('Database connection error');
    }
});
module.exports = router;
