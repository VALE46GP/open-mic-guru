const initializeDatabase = require('./init');
const tables = require('./schema');

// Mock the database pools
jest.mock('./index', () => ({
    connect: jest.fn()
}));

jest.mock('../../tests/helpers/testDb', () => ({
    connect: jest.fn()
}));

describe('Database Initialization', () => {
    let mockClient;
    
    beforeEach(() => {
        jest.clearAllMocks();
        mockClient = {
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn()
        };
        // Setup mock for both pools
        require('./index').connect.mockResolvedValue(mockClient);
        require('../../tests/helpers/testDb').connect.mockResolvedValue(mockClient);
    });

    it('should create all required tables', async () => {
        const client = mockClient;
        client.query.mockResolvedValue({ rows: [] });

        await initializeDatabase(true);

        // Verify BEGIN was called
        expect(client.query).toHaveBeenCalledWith('BEGIN');

        // Verify each table creation was called
        const tableOrder = ['users', 'venues', 'events', 'lineup_slots', 'notification_preferences', 'notifications', 'links'];
        
        for (const tableName of tableOrder) {
            expect(client.query).toHaveBeenCalledWith(tables[tableName]);
        }

        // Verify COMMIT was called
        expect(client.query).toHaveBeenCalledWith('COMMIT');
        expect(client.release).toHaveBeenCalled();
    });

    it('should handle initialization errors', async () => {
        const client = mockClient;
        client.query.mockRejectedValueOnce(new Error('Database error'));

        await expect(initializeDatabase(true)).rejects.toThrow('Database error');
        expect(client.release).toHaveBeenCalled();
    });
});
