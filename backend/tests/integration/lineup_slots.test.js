const request = require('supertest');
const express = require('express');
const { mockDb, resetMockDb } = require('../helpers/mockDb');
const lineupSlotsController = require('../../src/controllers/lineup_slots');

// Mock dependencies before requiring the controller
jest.mock('../../src/db', () => mockDb);
jest.mock('../../src/utils/notifications', () => ({
    createNotification: jest.fn().mockResolvedValue({ id: 1 })
}));

// Setup express app with proper middleware
const app = express();
app.use(express.json());

// Set trust proxy to get proper IP address
app.set('trust proxy', true);

// Mock context middleware with better setup
app.use((req, res, next) => {
    // Set IP address directly on request
    req.ip = '127.0.0.1';

    // Set cookies
    req.cookies = { nonUserId: 'test-non-user-id' };

    // Set app.locals with broadcast function
    if (!req.app.locals) {
        req.app.locals = {};
    }
    req.app.locals.broadcastLineupUpdate = jest.fn();

    next();
});

// Setup routes
app.post('/lineup-slots', lineupSlotsController.createSlot);
app.get('/lineup-slots/:eventId', lineupSlotsController.getEventSlots);
app.put('/lineup-slots/reorder', lineupSlotsController.reorderSlots);
app.delete('/lineup-slots/:slotId', lineupSlotsController.deleteSlot);

describe('Lineup Slots Controller', () => {
    beforeEach(() => {
        resetMockDb();
        jest.clearAllMocks();
    });

    describe('POST /lineup-slots', () => {
        // Increase timeout for these tests
        jest.setTimeout(10000);

        it('should create a new slot for registered user', async () => {
            const mockResponses = [
                { rows: [{ active: true }] },                    // Event active check
                { rows: [{ host_id: 2 }] },                     // Host check
                { rows: [{ notify_signup_notifications: true }] }, // Notification prefs
                { rows: [] },                                    // No existing slot
                { rows: [{                                       // Created slot
                        id: 1,
                        slot_id: 1,
                        slot_number: 1,
                        slot_name: 'Test Slot',
                        user_id: 1
                    }]},
                { rows: [{                                       // Event details
                        start_time: new Date('2024-03-01T19:00:00Z'),
                        slot_duration: { minutes: 10 },
                        setup_duration: { minutes: 5 }
                    }]}
            ];

            for (const response of mockResponses) {
                mockDb.query.mockResolvedValueOnce(response);
            }

            const response = await request(app)
                .post('/lineup-slots')
                .send({
                    event_id: 1,
                    user_id: 1,
                    slot_number: 1,
                    slot_name: 'Test Slot'
                });

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('slot_id', 1);
        });

        it('should create a slot for non-registered user', async () => {
            const mockResponses = [
                { rows: [{ active: true }] },
                { rows: [{ host_id: 2 }] },
                { rows: [{ notify_signup_notifications: true }] },
                { rows: [] },
                { rows: [{
                        id: 1,
                        slot_id: 1,
                        slot_number: 1,
                        slot_name: 'Anonymous Slot',
                        non_user_identifier: 'test-non-user-id'
                    }]},
                { rows: [{
                        start_time: new Date('2024-03-01T19:00:00Z'),
                        slot_duration: { minutes: 10 },
                        setup_duration: { minutes: 5 }
                    }]}
            ];

            for (const response of mockResponses) {
                mockDb.query.mockResolvedValueOnce(response);
            }

            const response = await request(app)
                .post('/lineup-slots')
                .send({
                    event_id: 1,
                    slot_number: 1,
                    slot_name: 'Anonymous Slot'
                });

            expect(response.status).toBe(201);
            expect(response.body.non_user_identifier).toBe('test-non-user-id');
        });

        it('should prevent slot creation for cancelled events', async () => {
            mockDb.query.mockResolvedValueOnce({ rows: [{ active: false }] });

            const response = await request(app)
                .post('/lineup-slots')
                .send({
                    event_id: 1,
                    slot_number: 1,
                    slot_name: 'Test Slot'
                });

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Cannot sign up for cancelled events');
        });

        it('should prevent duplicate slots for same user', async () => {
            mockDb.query
                .mockResolvedValueOnce({ rows: [{ active: true }] })
                .mockResolvedValueOnce({ rows: [{ host_id: 2 }] })
                .mockResolvedValueOnce({ rows: [{ notify_signup_notifications: true }] })
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Existing slot

            const response = await request(app)
                .post('/lineup-slots')
                .send({
                    event_id: 1,
                    user_id: 1,
                    slot_number: 1,
                    slot_name: 'Test Slot'
                });

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Only one slot per user per event allowed');
        });

        it('should prevent duplicate slots for same non-user', async () => {
            mockDb.query
                .mockResolvedValueOnce({ rows: [{ active: true }] })
                .mockResolvedValueOnce({ rows: [{ host_id: 2 }] })
                .mockResolvedValueOnce({ rows: [{ notify_signup_notifications: true }] })
                .mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Existing slot

            const response = await request(app)
                .post('/lineup-slots')
                .send({
                    event_id: 1,
                    slot_number: 1,
                    slot_name: 'Anonymous Slot'
                });

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Only one slot per non-user per event allowed');
        });
    });

    // Rest of the test cases remain the same...
    describe('GET /lineup-slots/:eventId', () => {
        it('should get all slots for an event', async () => {
            const mockSlots = [
                { slot_id: 1, slot_number: 1, user_name: 'User 1', slot_name: 'Slot 1' },
                { slot_id: 2, slot_number: 2, user_name: 'User 2', slot_name: 'Slot 2' }
            ];

            mockDb.query.mockResolvedValueOnce({ rows: mockSlots });

            const response = await request(app).get('/lineup-slots/1');

            expect(response.status).toBe(200);
            expect(response.body).toHaveLength(2);
            expect(response.body[0]).toHaveProperty('slot_id', 1);
        });

        it('should handle database errors', async () => {
            mockDb.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app).get('/lineup-slots/1');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('PUT /lineup-slots/reorder', () => {
        it('should successfully reorder slots', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };

            const mockEvent = {
                id: 1,
                name: 'Test Event',
                start_time: new Date('2024-03-01T19:00:00Z'),
                slot_duration: 600,
                setup_duration: 300
            };

            // Mock the initial event query
            mockDb.query
                .mockResolvedValueOnce({ rows: [mockEvent] }) // getEventDetailsForReorder
                .mockResolvedValueOnce({ rows: [{ // getOldSlotDetails
                    slot_number: 1,
                    user_id: 1
                }]});

            // Mock the client connection
            mockDb.connect.mockResolvedValueOnce(mockClient);

            // Mock the transaction queries
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [] }) // updateSlotNumber
                .mockResolvedValueOnce({ rows: [] }); // COMMIT

            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [
                        { slot_id: 1, slot_number: 2 }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Slots reordered successfully');
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('BEGIN'));
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('COMMIT'));
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should handle database errors with rollback', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };

            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockRejectedValueOnce(new Error('Database error')); // Simulate error during update

            mockDb.connect.mockResolvedValueOnce(mockClient);
            mockDb.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // getEventDetailsForReorder

            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [
                        { slot_id: 1, slot_number: 2 }
                    ]
                });

            expect(response.status).toBe(500);
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('BEGIN'));
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('ROLLBACK'));
            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('Lineup Slot Validation', () => {
        beforeEach(() => {
            jest.clearAllMocks();
            resetMockDb();
        });

        it('should validate non-user slot requirements', async () => {
            const response = await request(app)
                .post('/lineup-slots')
                .send({
                    event_id: 1,
                    slot_number: 1,
                    // Missing required slot_name for non-user
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toBe('Non-users must provide a name');
            expect(mockDb.query).not.toHaveBeenCalled();
        });

        it('should handle reordering with invalid slot numbers', async () => {
            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [
                        { slot_id: 1, slot_number: -1 },
                        { slot_id: 2, slot_number: 0 }
                    ]
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid slot numbers');
            expect(mockDb.query).not.toHaveBeenCalled();
        });

        it('should reject non-numeric slot numbers', async () => {
            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [
                        { slot_id: 1, slot_number: 'abc' },
                        { slot_id: 2, slot_number: null }
                    ]
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid slot numbers');
            expect(mockDb.query).not.toHaveBeenCalled();
        });

        it('should reject empty slots array', async () => {
            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: []
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid slots data');
            expect(mockDb.query).not.toHaveBeenCalled();
        });
    });

    describe('Slot Reordering Edge Cases', () => {
        it('should handle concurrent slot updates', async () => {
            const mockClient = {
                query: jest.fn(),
                release: jest.fn()
            };

            const mockEvent = {
                id: 1,
                name: 'Test Event',
                start_time: new Date('2024-03-01T19:00:00Z'),
                slot_duration: 600,
                setup_duration: 300
            };

            // Mock the initial event query
            mockDb.query.mockResolvedValueOnce({ rows: [mockEvent] });

            // Mock the client connection
            mockDb.connect.mockResolvedValueOnce(mockClient);

            // Mock the transaction queries with a simulated concurrent update error
            mockClient.query
                .mockResolvedValueOnce({ rows: [] }) // BEGIN
                .mockResolvedValueOnce({ rows: [{ // First slot details
                    slot_number: 1,
                    user_id: 1
                }]})
                .mockRejectedValueOnce(new Error('Concurrent update error')) // Simulate concurrent update
                .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [
                        { slot_id: 1, slot_number: 2 },
                        { slot_id: 2, slot_number: 1 }
                    ]
                });

            expect(response.status).toBe(500);
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('BEGIN'));
            expect(mockClient.query).toHaveBeenCalledWith(expect.stringContaining('ROLLBACK'));
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should handle invalid slot numbers during reordering', async () => {
            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [
                        { slot_id: 1, slot_number: 0 },  // Invalid slot number
                        { slot_id: 2, slot_number: -1 }  // Invalid slot number
                    ]
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid slot numbers');
        });

        it('should validate maximum slot numbers', async () => {
            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [
                        { slot_id: 1, slot_number: 101 }  // Exceeds maximum allowed
                    ]
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Invalid slot numbers');
        });
    });

    describe('Error Handling for Invalid Requests', () => {
        it('should handle missing non-user name', async () => {
            mockDb.query
                .mockResolvedValueOnce({ rows: [{ active: true }] })  // Event active check
                .mockResolvedValueOnce({ rows: [{ host_id: 2 }] });   // Host check

            const response = await request(app)
                .post('/lineup-slots')
                .send({
                    event_id: 1,
                    slot_number: 1
                    // Missing slot_name for non-user
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error', 'Non-users must provide a name');
        });

        it('should handle database errors during slot creation', async () => {
            mockDb.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .post('/lineup-slots')
                .send({
                    event_id: 1,
                    slot_number: 1,
                    slot_name: 'Test Slot'
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });

    describe('Cleanup Operations', () => {
        it('should properly clean up on slot deletion', async () => {
            // Reset mock between tests
            mockDb.query.mockReset();

            const mockSlot = {
                id: 1,
                event_id: 1,
                slot_number: 1,
                user_id: 1,
                slot_name: 'Test Slot',
                host_id: 1,
                event_name: 'Test Event',
                start_time: new Date('2024-03-01T19:00:00Z'),
                slot_duration: { minutes: 10 },
                setup_duration: { minutes: 5 }
            };

            // First query setup (SELECT query)
            mockDb.query.mockImplementationOnce((query, params) => {
                return Promise.resolve({ rows: [mockSlot] });
            });

            // Second query setup (DELETE query)
            mockDb.query.mockImplementationOnce((query, params) => {
                return Promise.resolve({ rowCount: 1 });
            });

            const response = await request(app)
                .delete('/lineup-slots/1');

            expect(response.status).toBe(200);
            expect(response.body).toEqual({ message: 'Slot deleted successfully' });
            expect(mockDb.query).toHaveBeenCalledTimes(2);
            expect(app.locals.broadcastLineupUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'LINEUP_UPDATE',
                    eventId: mockSlot.event_id,
                    action: 'DELETE',
                    data: expect.objectContaining({
                        slotId: 1,
                        slot_number: mockSlot.slot_number
                    })
                })
            );
        });

        it('should handle missing slot during deletion', async () => {
            // Mock the initial slot query to return no results
            mockDb.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .delete('/lineup-slots/999');

            expect(response.status).toBe(404);
            expect(response.body).toEqual({ error: 'Slot not found' });
        });
    });
});