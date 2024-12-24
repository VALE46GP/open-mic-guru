const { mockDb, resetMockDb } = require('../helpers/mockDb');
const db = require('../../src/db');
const { createNotification } = require('../../src/utils/notifications');

jest.mock('../../src/db', () => mockDb);

describe('Notifications Utility', () => {
    let mockReq;

    beforeEach(() => {
        jest.clearAllMocks();
        mockReq = {
            app: {
                locals: {
                    broadcastNotification: jest.fn()
                }
            }
        };
    });

    it('should create notification successfully', async () => {
        // Mock timezone query
        mockDb.query
            .mockResolvedValueOnce({ rows: [] })  // timezone query
            .mockResolvedValueOnce({ rows: [{ notify_event_updates: true }] })  // preferences check
            .mockResolvedValueOnce({ rows: [{ id: 1 }] })  // insert notification
            .mockResolvedValueOnce({ rows: [{ // Get notification data
                    id: 1,
                    message: 'Test notification',
                    type: 'event_update',
                    user_id: 123,
                    event_id: 456
                }] });

        await createNotification(
            123,
            'event_update',
            'Test notification',
            456,
            null,
            mockReq
        );

        const calls = mockDb.query.mock.calls;
        // Get the third call which should be the INSERT
        const insertCall = calls[2];
        expect(insertCall[0]).toContain('INSERT INTO notifications');
        expect(mockReq.app.locals.broadcastNotification).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
        mockDb.query.mockRejectedValueOnce(new Error('Database error'));

        const result = await createNotification(
            123,
            'event_update',
            'Test notification',
            456,
            null,
            mockReq
        );

        expect(result).toBeUndefined();
        expect(mockReq.app.locals.broadcastNotification).not.toHaveBeenCalled();
    });
});