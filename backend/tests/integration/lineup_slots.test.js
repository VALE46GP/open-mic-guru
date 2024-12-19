const { mockDb, resetMockDb } = require('../helpers/mockDb');
const request = require('supertest');
const express = require('express');
const db = require('../../src/db');
const lineupSlotsController = require('../../src/controllers/lineup_slots');

// Mock dependencies
jest.mock('../../src/db', () => mockDb);
jest.mock('../../src/utils/notifications');

const app = express();
app.use(express.json());
app.locals.broadcastLineupUpdate = jest.fn();

// Mock middleware
const mockVerifyToken = (req, res, next) => {
    req.user = { userId: 1 };
    next();
};
const cookieParser = require('cookie-parser');
app.use(cookieParser());
app.use((req, res, next) => {
    req.ip = '127.0.0.1';
    req.cookies = { nonUserId: 'test-non-user-id' };
    next();
});

// Setup routes
app.post('/lineup-slots', lineupSlotsController.createSlot);
app.get('/lineup-slots/:eventId', lineupSlotsController.getEventSlots);
app.delete('/lineup-slots/:slotId', lineupSlotsController.deleteSlot);
app.put('/lineup-slots/reorder', lineupSlotsController.reorderSlots);

describe('Lineup Slots Controller', () => {
    beforeEach(() => {
        resetMockDb();
    });

    describe('POST /lineup-slots', () => {
        it('should create a new slot', async () => {
            const mockSlot = {
                event_id: 1,
                user_id: null,
                slot_number: 1,
                slot_name: 'Test Slot',
                isHostAssignment: false
            };

            // Mock checks in the correct order
            // 1. Check if event is active
            db.query.mockResolvedValueOnce({
                rows: [{ active: true }]
            });

            // 2. Check for host
            db.query.mockResolvedValueOnce({
                rows: [{ host_id: 2 }]  // Different from userId in mockVerifyToken
            });

            // 3. Check existing notification preferences
            db.query.mockResolvedValueOnce({
                rows: [{
                    notify_signup_notifications: true
                }]
            });

            // 4. Check for existing slots (no slots should exist)
            db.query.mockResolvedValueOnce({
                rows: []
            });

            // 5. Insert new slot
            db.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    slot_id: 1,
                    ...mockSlot,
                    non_user_identifier: 'test-non-user-id',
                    ip_address: '127.0.0.1'
                }]
            });

            // 6. Get event details for notification
            db.query.mockResolvedValueOnce({
                rows: [{
                    start_time: new Date(),
                    slot_duration: { minutes: 10 },
                    setup_duration: { minutes: 5 }
                }]
            });

            const response = await request(app)
                .post('/lineup-slots')
                .send(mockSlot);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('slot_id', 1);
        });
    });

    describe('GET /lineup-slots/:eventId', () => {
        it('should get all slots for an event', async () => {
            const mockSlots = [
                { slot_id: 1, slot_number: 1, slot_name: 'Test Slot 1' },
                { slot_id: 2, slot_number: 2, slot_name: 'Test Slot 2' }
            ];

            db.query.mockResolvedValueOnce({ rows: mockSlots });

            const response = await request(app)
                .get('/lineup-slots/1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('slot_id', 1);
        });
    });

    describe('Lineup Slots Controller - Reordering', () => {
        it('should handle slot reordering with time changes', async () => {
            const mockEvent = {
                id: 1,
                name: 'Test Event',
                start_time: new Date('2024-03-01T19:00:00Z'),
                slot_duration: { minutes: 10 },
                setup_duration: { minutes: 5 }
            };

            // Mock all required database responses in sequence
            db.query
                // Initial event query
                .mockResolvedValueOnce({ 
                    rows: [mockEvent] 
                })
                // BEGIN transaction
                .mockResolvedValueOnce({ 
                    rows: [] 
                })
                // First slot old data query
                .mockResolvedValueOnce({ 
                    rows: [{ slot_number: 1, user_id: 1 }] 
                })
                // First slot update
                .mockResolvedValueOnce({ 
                    rows: [{ id: 1 }] 
                })
                // Second slot old data query
                .mockResolvedValueOnce({ 
                    rows: [{ slot_number: 2, user_id: 2 }] 
                })
                // Second slot update
                .mockResolvedValueOnce({ 
                    rows: [{ id: 2 }] 
                })
                // COMMIT transaction
                .mockResolvedValueOnce({ 
                    rows: [] 
                });

            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [
                        { slot_id: 1, slot_number: 2 },
                        { slot_id: 2, slot_number: 1 }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Slots reordered successfully');
        });

        it('should handle database errors during reordering', async () => {
            db.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [
                        { slot_id: 1, slot_number: 2 },
                        { slot_id: 2, slot_number: 1 }
                    ]
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });
});
