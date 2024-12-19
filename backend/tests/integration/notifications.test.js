const request = require('supertest');
const express = require('express');
const db = require('../../src/db');
const notificationsController = require('../../src/controllers/notifications');

// Mock database
jest.mock('../../src/db');

const app = express();
app.use(express.json());
app.locals.broadcastNotification = jest.fn();

// Mock middleware
const mockVerifyToken = (req, res, next) => {
    req.user = { userId: 1 };
    next();
};

// Setup routes for testing
app.get('/notifications', mockVerifyToken, notificationsController.getUserNotifications);
app.post('/notifications/mark-read', mockVerifyToken, notificationsController.markAsRead);
app.get('/notifications/preferences', mockVerifyToken, notificationsController.getPreferences);
app.put('/notifications/preferences', mockVerifyToken, notificationsController.updatePreferences);
app.delete('/notifications', mockVerifyToken, notificationsController.deleteNotifications);

describe('Notifications Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        db.query.mockReset();
    });

    describe('GET /notifications', () => {
        it('should get user notifications successfully', async () => {
            const mockNotifications = [
                {
                    id: 1,
                    user_id: 1,
                    event_id: 1,
                    message: 'Test notification',
                    is_read: false,
                    created_at: new Date(),
                    event_name: 'Test Event',
                    event_start_time: new Date(),
                    slot_number: 1
                }
            ];

            db.query.mockResolvedValueOnce({ rows: mockNotifications });

            const response = await request(app)
                .get('/notifications')
                .query({ page: 1, limit: 10 });

            expect(response.status).toBe(200);
            expect(response.body).toEqual(expect.arrayContaining([
                expect.objectContaining({
                    id: 1,
                    message: 'Test notification'
                })
            ]));
        });

        it('should handle database errors', async () => {
            db.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .get('/notifications');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });

    describe('POST /notifications/mark-read', () => {
        it('should mark notifications as read', async () => {
            const mockUpdatedNotifications = [
                { id: 1, is_read: true }
            ];

            db.query.mockResolvedValueOnce({ rows: mockUpdatedNotifications });

            const response = await request(app)
                .post('/notifications/mark-read')
                .send({ notification_ids: [1] });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body).toHaveProperty('updatedNotifications');
        });
    });

    describe('GET /notifications/preferences', () => {
        it('should get user notification preferences', async () => {
            const mockPreferences = {
                user_id: 1,
                notify_event_updates: true,
                notify_signup_notifications: true,
                notify_other: true
            };

            db.query.mockResolvedValueOnce({ rows: [mockPreferences] });

            const response = await request(app)
                .get('/notifications/preferences');

            expect(response.status).toBe(200);
            expect(response.body).toEqual(mockPreferences);
        });

        it('should create default preferences if none exist', async () => {
            db.query
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({
                    rows: [{
                        user_id: 1,
                        notify_event_updates: true,
                        notify_signup_notifications: true,
                        notify_other: true
                    }]
                });

            const response = await request(app)
                .get('/notifications/preferences');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('notify_event_updates', true);
        });
    });

    describe('PUT /notifications/preferences', () => {
        it('should update notification preferences', async () => {
            const updatedPreferences = {
                notify_event_updates: false,
                notify_signup_notifications: true,
                notify_other: false
            };

            db.query.mockResolvedValueOnce({
                rows: [{
                    user_id: 1,
                    ...updatedPreferences
                }]
            });

            const response = await request(app)
                .put('/notifications/preferences')
                .send(updatedPreferences);

            expect(response.status).toBe(200);
            expect(response.body).toMatchObject(updatedPreferences);
        });
    });

    describe('DELETE /notifications', () => {
        it('should delete notifications for specified events', async () => {
            const mockDeletedNotifications = [
                { id: 1, event_id: 1 },
                { id: 2, event_id: 1 }
            ];

            db.query.mockResolvedValueOnce({ rows: mockDeletedNotifications });

            const response = await request(app)
                .delete('/notifications')
                .send({ eventIds: [1] });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.deletedNotifications).toEqual(mockDeletedNotifications);
        });
    });
});
