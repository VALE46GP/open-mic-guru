const pool = require('./index');
const tables = require('./schema');
const { logger } = require('../../tests/utils/logger');

async function initializeDatabase(isTest = false) {
    // Use test pool if isTest is true
    const dbPool = isTest ? 
        require('../../tests/helpers/testDb') :
        pool;
    const client = await dbPool.connect();
    try {
        await client.query('BEGIN');
        
        // Create tables in correct order (handling dependencies)
        const tableOrder = [
            'users',
            'venues',
            'events',
            'lineup_slots',
            'notification_preferences',
            'notifications',
            'links'
        ];

        for (const tableName of tableOrder) {
            await client.query(tables[tableName]);
            logger.log(`Created table: ${tableName}`);
        }

        await client.query('COMMIT');
        logger.log(`Database initialization completed successfully for ${isTest ? 'test' : 'production'} environment`);
    } catch (error) {
        await client.query('ROLLBACK');
        logger.error('Database initialization failed:', error);
        throw error;
    } finally {
        client.release();
    }
}

// Run if called directly (not imported)
if (require.main === module) {
    const isTest = process.argv.includes('--test');
    initializeDatabase(isTest)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = initializeDatabase;
