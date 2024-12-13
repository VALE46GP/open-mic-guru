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
            user: 'postgres',
            host: 'localhost',
            database: 'open_mic_guru_test',
            port: '5432'
        });
    });

    it('should connect to test database', async () => {
        const result = await pool.query('SELECT NOW()');
        expect(result.rows).toBeDefined();
    });
});
