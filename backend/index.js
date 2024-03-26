const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(express.json()); // Middleware for parsing JSON

// Set up PostgreSQL connection
const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Use environment variable for database URL
    // If you're not using additional configuration like SSL, you can remove those properties
});

// GET all users
app.get('/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM users');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// POST a new user
app.post('/users', async (req, res) => {
    try {
        const { name } = req.body;
        const result = await pool.query('INSERT INTO users (name) VALUES ($1) RETURNING *', [name]);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error');
    }
});

// Additional routes for events, links, user_roles, etc., would follow a similar pattern...


// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
