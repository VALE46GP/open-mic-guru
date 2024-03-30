const { Pool } = require('pg');

// TODO: figure out how to use this .env file
// const pool = new Pool({
//     connectionString: process.env.DATABASE_URL,
// });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'open_mic_guru',
    password: 'yourefuckingout',
    port: 5432,
});

module.exports = pool;
