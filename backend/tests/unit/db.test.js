const pool = require('../../src/db');
const setupTestDb = require('../setupTestDb');

describe('Database Connection', () => {
    beforeAll(async () => {
        await setupTestDb();
    });

    afterAll(async () => {
        await pool.end();
    });

    it('should create a pool instance', () => {
        expect(pool).toBeDefined();
    });

    it('should have correct database configuration', () => {
        const { user, host, database, port } = pool.options;
        expect({ user, host, database, port }).toEqual({
            user: process.env.POSTGRES_USER || 'postgres',
            host: process.env.POSTGRES_HOST || 'localhost',
            database: process.env.POSTGRES_TEST_DB || 'open_mic_guru_test',
            port: process.env.POSTGRES_PORT || '5432'
        });
    });

    it('should connect to test database', async () => {
        const client = await pool.connect();
        try {
            const result = await client.query('SELECT NOW()');
            expect(result.rows).toBeDefined();
        } finally {
            await client.release();
        }
    });
});
