const { Pool } = require('pg');
require('dotenv').config();
const { logger } = require('../../tests/utils/logger');

const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'open_mic_guru',
    password: process.env.PGPASSWORD || 'yourefuckingout',
    port: process.env.PGPORT || 5432
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

pool.on('connect', () => {
    logger.log('Database connected successfully');
});

module.exports = pool;
