const { Pool } = require('pg');
const db = require('../../src/db');

jest.mock('pg', () => {
    const mPool = {
        connect: jest.fn(),
        query: jest.fn(),
        end: jest.fn(),
    };
    return { Pool: jest.fn(() => mPool) };
});

describe('Database Connection', () => {
    it('should create a pool instance', () => {
        expect(db).toBeDefined();
        expect(Pool).toHaveBeenCalled();
    });

    it('should use correct database configuration', () => {
        expect(Pool).toHaveBeenCalledWith({
            user: 'postgres',
            host: 'localhost',
            database: 'open_mic_guru',
            password: expect.any(String),
            port: 5432,
        });
    });
});
