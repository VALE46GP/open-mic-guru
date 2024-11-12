const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const AWS = require('aws-sdk');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION
});

const s3 = new AWS.S3();

// GET all users
router.get('/', verifyToken, async (req, res) => {
    try {
        const result = await db.query('SELECT id, email, name, image, social_media_accounts FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// POST a new user OR edit an existing user
router.post('/register', async (req, res) => {
    const { email, password, name, photoUrl, socialMediaAccounts, isUpdate, userId } = req.body;
    let hashedPassword = null;

    if (password) {
        hashedPassword = await bcrypt.hash(password, 10);
    }

    try {
        if (isUpdate) {
            const socialMediaJson = JSON.stringify(socialMediaAccounts || []);
            const client = await db.connect();
            
            try {
                await client.query('BEGIN');
                const result = await client.query(
                    `UPDATE users 
                    SET email = $1, 
                        name = $2, 
                        image = $3, 
                        social_media_accounts = $4::jsonb 
                    WHERE id = $5 
                    RETURNING *`,
                    [email, name, photoUrl, socialMediaJson, userId]
                );

                await client.query('COMMIT');
                return res.status(200).json({ user: result.rows[0] });
            } catch (err) {
                await client.query('ROLLBACK');
                throw err;
            } finally {
                client.release();
            }
        } else {
            const socialMediaJson = JSON.stringify(socialMediaAccounts || []);
            const result = await db.query(
                `INSERT INTO users (email, password, name, image, social_media_accounts) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING *`,
                [email, hashedPassword, name, photoUrl, socialMediaJson]
            );
            return res.status(201).json({ user: result.rows[0] });
        }
    } catch (err) {
        console.error('Database Error:', err);
        return res.status(500).json({ 
            error: 'Server error',
            details: err.message
        });
    }
});

// POST login user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        // Find the user by email
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Authentication failed' });
        }
        const user = result.rows[0];
        // Check if the password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Authentication failed' });
        }
        // Generate a JWT token
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        // Return the token to the client
        res.json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// GET a single user's details and their events
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        // Fetch user details including social media accounts
        const userQuery = await db.query(
            'SELECT id, email, name, image, social_media_accounts FROM users WHERE id = $1',
            [userId]
        );
        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userQuery.rows[0];

        // Fetch both hosted events and events where user is in lineup
        const eventsQuery = await db.query(`
            SELECT DISTINCT
                e.id AS event_id,
                e.name AS event_name,
                e.start_time,
                e.end_time,
                e.slot_duration,
                e.additional_info,
                v.id AS venue_id,
                v.name AS venue_name,
                CASE 
                    WHEN ur.user_id IS NOT NULL THEN true 
                    ELSE false 
                END AS is_host,
                CASE 
                    WHEN ls.user_id IS NOT NULL THEN true 
                    ELSE false 
                END AS is_performer,
                ls.slot_number,
                e.slot_duration,
                e.setup_duration,
                e.start_time + 
                    (INTERVAL '1 minute' * 
                        (ls.slot_number - 1) * 
                        (EXTRACT(EPOCH FROM e.slot_duration + e.setup_duration) / 60)
                    ) AS performer_slot_time
            FROM events e
            JOIN venues v ON e.venue_id = v.id
            LEFT JOIN user_roles ur ON e.id = ur.event_id 
                AND ur.role = 'host' 
                AND ur.user_id = $1
            LEFT JOIN lineup_slots ls ON e.id = ls.event_id 
                AND ls.user_id = $1
            WHERE ur.user_id = $1 OR ls.user_id = $1
            ORDER BY e.start_time DESC
        `, [userId]);

        const events = eventsQuery.rows;

        // Include user details and events in the response
        res.json({ user, events });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// DELETE a user
router.delete('/:userId', verifyToken, async (req, res) => {
    const { userId } = req.params;
    const requesterId = req.user.id; // Assuming req.user is populated by authentication middleware

    if (userId !== requesterId) {
        return res.status(403).json({ error: 'You can only delete your own account' });
    }

    try {
        await db.query('DELETE FROM users WHERE id = $1', [userId]);
        res.status(204).send();
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error', details: err.message });
    }
});

router.post('/upload', async (req, res) => {
  const { fileName, fileType, userId } = req.body;
  const uniqueFileName = `${userId}-${fileName}`;
  const s3Params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `users/${uniqueFileName}`,
    Expires: 60,
    ContentType: fileType
  };

  try {
    const uploadURL = await s3.getSignedUrlPromise('putObject', s3Params);
    res.json({ uploadURL });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating upload URL' });
  }
});

module.exports = router;
