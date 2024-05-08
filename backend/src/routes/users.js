const express = require('express');
const router = express.Router();
const db = require('../db');
const verifyToken = require('../middleware/verifyToken');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// GET all users
router.get('/', verifyToken, async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// POST a new user
router.post('/register', [
  // Validate and sanitize fields.
  body('email').trim().isEmail().withMessage('Email is required and must be valid.'),
  body('password').isLength({ min: 5 }).withMessage('Password must be at least 5 characters long.'),
], async (req, res) => {
    // Check for validation errors.
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { email, password, name } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert the user into the database
        const result = await db.query('INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING *', [email, hashedPassword, name]); // Include name in the query

        // Generate a JWT token
        const user = result.rows[0];
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' });

        // Return the token to the client
        res.status(201).json({ token });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
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

// GET user details and their events
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const userDetails = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userDetails.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const userEvents = await db.query(`
            SELECT e.id, e.name, e.start_time, e.end_time, e.slot_duration, e.additional_info
            FROM events e
            JOIN user_roles ur ON e.id = ur.event_id
            JOIN users u ON ur.user_id = u.id
            WHERE u.id = $1
        `, [userId]);
        res.json({
            user: userDetails.rows[0],
            events: userEvents.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

module.exports = router;
