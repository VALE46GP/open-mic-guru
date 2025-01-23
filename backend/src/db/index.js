const { Pool } = require('pg');
require('dotenv').config();
const { logger } = require('../../tests/utils/logger');

const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// pool.on('connect', () => {
//     logger.log('Database connected successfully');
// });

module.exports = pool;
