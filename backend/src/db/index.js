// backend/db/index.js
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
    try {
        console.log('Configuring SSL for database connection in production');

        // OPTION 1: Use this for testing only - will accept self-signed certificates
        poolConfig.ssl = {
            rejectUnauthorized: false // Temporarily allowing self-signed certs for testing
        };

        /* OPTION 2: Use this after testing is complete
        if (!process.env.RDS_CA_CERT) {
            console.error('RDS_CA_CERT environment variable is not set!');
            console.warn('Using rejectUnauthorized: false as fallback');
            poolConfig.ssl = {
                rejectUnauthorized: false
            };
        } else {
            const certData = Buffer.from(process.env.RDS_CA_CERT, 'base64').toString('ascii');
            console.log('RDS certificate loaded, length:', certData.length);

            poolConfig.ssl = {
                rejectUnauthorized: true,
                ca: certData
            };
        }
        */
    } catch (error) {
        console.error('Error configuring SSL:', error);
        console.warn('Will attempt connection without strict SSL verification');
        poolConfig.ssl = {
            rejectUnauthorized: false
        };
    }
}

console.log('Creating database pool with config:', {
    host: poolConfig.host,
    database: poolConfig.database,
    port: poolConfig.port,
    ssl: poolConfig.ssl ? `configured (rejectUnauthorized: ${poolConfig.ssl.rejectUnauthorized})` : 'not configured'
});

const pool = new Pool(poolConfig);

// Add connection event handler for debugging
pool.on('connect', () => {
    console.log('New database connection established successfully');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    // Don't exit the process to allow recovery
    console.warn('Database error occurred but application will continue running');
});

module.exports = pool;