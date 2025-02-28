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

        if (!process.env.RDS_CA_CERT) {
            console.error('RDS_CA_CERT environment variable is not set!');
            // Continue without SSL rather than exiting to avoid app crash
            console.warn('Continuing without SSL configuration - connection may fail');
        } else {
            const certData = Buffer.from(process.env.RDS_CA_CERT, 'base64').toString('ascii');
            console.log('RDS certificate loaded, length:', certData.length);

            // Show a small portion of the certificate to confirm it's valid
            if (certData.length > 0) {
                console.log('Certificate begins with:', certData.substring(0, 20) + '...');
                console.log('Certificate ends with:', '...' + certData.substring(certData.length - 20));
            }

            poolConfig.ssl = {
                rejectUnauthorized: true,
                ca: certData
            };
        }
    } catch (error) {
        console.error('Error configuring SSL:', error);
        // Log error but don't exit to allow app to try connecting
        console.warn('Will attempt connection without SSL configuration');
    }
}

console.log('Creating database pool with config:', {
    host: poolConfig.host,
    database: poolConfig.database,
    port: poolConfig.port,
    ssl: poolConfig.ssl ? 'configured' : 'not configured'
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

// Export a function to test the connection
const testConnection = async () => {
    try {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT NOW() as time');
            console.log('Database connection test successful:', result.rows[0].time);
            return { success: true, time: result.rows[0].time };
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Database connection test failed:', error);
        return { success: false, error: error.message };
    }
};

module.exports = pool;
module.exports.testConnection = testConnection;