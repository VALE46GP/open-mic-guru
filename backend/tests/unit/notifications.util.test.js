const { mockDb, resetMockDb } = require('../helpers/mockDb');
const db = require('../../src/db');
const { createNotification } = require('../../src/utils/notifications');

// Mock the database
jest.mock('../../src/db', () => mockDb);

describe('Notifications Utility', () => {
    let mockReq;

    beforeEach(() => {
        resetMockDb();
        mockReq = {
            app: {
                locals: {
                    broadcastNotification: jest.fn()
                }
            }
        };
        // Reset the mock implementation for each test
        db.query.mockReset();
    });

    it('should create notification when preferences allow', async () => {
        // Mock notification preferences query
        db.query
            .mockResolvedValueOnce({
                rows: [{
                    notify_event_updates: true,
                    notify_signup_notifications: true,
                    notify_other: true
                }]
            })
            .mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    user_id: 123,
                    type: 'event_update',
                    message: 'Test notification'
                }]
            })
            .mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    user_id: 123,
                    type: 'event_update',
                    message: 'Test notification',
                    event_name: 'Test Event'
                }]
            });

        await createNotification(
            123,
            'event_update',
            'Test notification',
            456,
            null,
            mockReq
        );

        expect(db.query).toHaveBeenCalledTimes(3);
        expect(mockReq.app.locals.broadcastNotification).toHaveBeenCalled();
    });

    it('should not create notification when preferences disallow', async () => {
        db.query.mockResolvedValueOnce({
            rows: [{
                notify_event_updates: false,
                notify_signup_notifications: false,
                notify_other: false
            }]
        });

        await createNotification(
            123,
            'event_update',
            'Test notification',
            456,
            null,
            mockReq
        );

        expect(db.query).toHaveBeenCalledTimes(1);
        expect(mockReq.app.locals.broadcastNotification).not.toHaveBeenCalled();
    });

    it('should handle missing notification preferences', async () => {
        db.query.mockResolvedValueOnce({ rows: [] });

        await createNotification(
            123,
            'event_update',
            'Test notification',
            456,
            null,
            mockReq
        );

        expect(db.query).toHaveBeenCalledTimes(1);
        expect(mockReq.app.locals.broadcastNotification).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
        db.query.mockRejectedValueOnce(new Error('Database error'));

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
