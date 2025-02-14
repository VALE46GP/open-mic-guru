const { Pool } = require('pg');
require('dotenv').config();
const { logger } = require('../../tests/utils/logger');

const poolConfig = {
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    port: process.env.PGPORT
};

if (process.env.NODE_ENV === 'production') {
    poolConfig.ssl = {
        rejectUnauthorized: true,
        ca: process.env.RDS_CA_CERT
    };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// pool.on('connect', () => {
//     logger.log('Database connected successfully');
// });

module.exports = pool;
