const { mockDb, resetMockDb } = require('../helpers/mockDb');
const request = require('supertest');
const express = require('express');
const db = require('../../src/db');
const eventsController = require('../../src/controllers/events');
const AWS = require('aws-sdk');

// Mock dependencies
jest.mock('../../src/db', () => mockDb);
jest.mock('aws-sdk', () => ({
    config: {
        update: jest.fn()
    },
    S3: jest.fn(() => ({
        getSignedUrlPromise: jest.fn().mockResolvedValue('https://test-signed-url.com')
    }))
}));

const mockBroadcastLineupUpdate = jest.fn();

const app = express();
app.use(express.json());
app.locals.broadcastLineupUpdate = mockBroadcastLineupUpdate;

// Mock middleware
const mockVerifyToken = (req, res, next) => {
    req.user = { userId: 1 };
    next();
};

// Setup routes for testing
app.get('/events', eventsController.getAllEvents);
app.get('/events/:eventId', eventsController.getEventById);
app.post('/events', mockVerifyToken, eventsController.createEvent);
app.patch('/events/:eventId', mockVerifyToken, eventsController.updateEvent);
app.delete('/events/:eventId', mockVerifyToken, eventsController.deleteEvent);
app.put('/events/:eventId/extend', mockVerifyToken, eventsController.extendEvent);
app.post('/events/upload', eventsController.getUploadUrl);

// Add after line 17
jest.mock('../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        error: jest.fn(),
        log: jest.fn()
    }
}));

describe('Events Controller', () => {
    beforeEach(() => {
        resetMockDb();
    });

    describe('GET /events', () => {
        it('should get all events successfully', async () => {
            const mockEvents = [{
                event_id: 1,
                event_name: 'Test Event',
                start_time: new Date(),
                end_time: new Date(),
                venue_id: 1,
                venue_name: 'Test Venue'
            }];

            db.query.mockResolvedValueOnce({ rows: mockEvents });

            const response = await request(app).get('/events');

            expect(response.status).toBe(200);
            expect(response.body.data.events).toBeDefined();
            expect(response.body.success).toBe(true);
        });

        it('should handle database errors', async () => {
            db.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app).get('/events');

            expect(response.status).toBe(500);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /events/:eventId', () => {
        it('should get event details by ID', async () => {
            const mockEvent = {
                event_id: 1,
                event_name: 'Test Event',
                venue_id: 1,
                host_id: 1
            };

            db.query
                .mockResolvedValueOnce({ rows: [mockEvent] })
                .mockResolvedValueOnce({ rows: [] }); // lineup query

            const response = await request(app).get('/events/1');

            expect(response.status).toBe(200);
            expect(response.body.data.event.id).toBe(1);
        });

        it('should return 404 for non-existent event', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app).get('/events/999');

            expect(response.status).toBe(404);
        });
    });

    describe('POST /events', () => {
        it('should create a new event', async () => {
            const newEvent = {
                venue_id: 1,
                start_time: '2024-03-01T19:00:00Z',
                end_time: '2024-03-01T22:00:00Z',
                slot_duration: 600,
                name: 'New Test Event',
                types: ['comedy']
            };

            db.query
                .mockResolvedValueOnce({ rows: [{ utc_offset: -420 }] }) // Mock venue query
                .mockResolvedValueOnce({ rows: [{ ...newEvent, id: 1 }] }); // Mock event creation

            const response = await request(app)
                .post('/events')
                .send(newEvent);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('id', 1);
        });

        it('should validate start time is before end time', async () => {
            const invalidEvent = {
                venue_id: 1,
                start_time: '2024-03-01T22:00:00Z',
                end_time: '2024-03-01T19:00:00Z',
                slot_duration: 600,
                name: 'Invalid Event'
            };

            const response = await request(app)
                .post('/events')
                .send(invalidEvent);

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message', 'Start time must be before end time');
        });
    });

    describe('POST /events/upload', () => {
        it('should generate upload URL', async () => {
            const response = await request(app)
                .post('/events/upload')
                .send({
                    fileName: 'test.jpg',
                    fileType: 'image/jpeg'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('uploadURL', 'https://test-signed-url.com');
        });
    });

    describe('PATCH /events/:eventId', () => {
        it('should update event details', async () => {
            // Reset the mock DB before test
            resetMockDb();
            
            // Clear the mock but don't reassign it
            mockBroadcastLineupUpdate.mockClear();

            // Mock the sequence of DB calls
            const mockResponses = [
                { rows: [] },  // SET timezone query
                { rows: [{ // Event exists check
                    id: 1,
                    name: 'Original Event',
                    start_time: '2024-03-01T18:00:00Z',
                    end_time: '2024-03-01T22:00:00Z',
                    venue_id: 1,
                    host_id: 1,
                    slot_duration: { minutes: 10 },
                    setup_duration: { minutes: 5 },
                    types: ['comedy'],
                    active: true
                }]},
                { rows: [{ host_id: 1 }]}, // Host check
                { rows: [{ // Get original event
                    id: 1,
                    name: 'Original Event',
                    start_time: '2024-03-01T18:00:00Z',
                    venue_id: 1,
                    host_id: 1
                }]},
                { rows: [{ // Update query result
                    id: 1,
                    name: 'Updated Event',
                    start_time: '2024-03-01T19:00:00Z',
                    end_time: '2024-03-01T22:00:00Z',
                    venue_id: 1,
                    slot_duration: { minutes: 10 },
                    setup_duration: { minutes: 5 },
                    types: ['comedy'],
                    active: true,
                    image: null,
                    host_id: 1
                }]},
                { rows: [{ // Venue info query
                    id: 1,
                    name: 'Test Venue',
                    timezone: 'UTC',
                    address: '123 Test St'
                }]},
                { rows: [] } // Lineup users query
            ];

            // Setup mock to return responses in sequence
            mockResponses.forEach(response => {
                mockDb.query.mockImplementationOnce(() => Promise.resolve(response));
            });

            const response = await request(app)
                .patch('/events/1')
                .send({
                    name: 'Updated Event',
                    start_time: '2024-03-01T19:00:00Z',
                    end_time: '2024-03-01T22:00:00Z',
                    slot_duration: 600,
                    setup_duration: 300,
                    types: ['comedy'],
                    active: true
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('name', 'Updated Event');
            expect(mockBroadcastLineupUpdate).toHaveBeenCalledWith({
                type: 'EVENT_UPDATE',
                eventId: 1,
                data: expect.objectContaining({
                    id: 1,
                    name: 'Updated Event',
                    start_time: '2024-03-01T19:00:00Z'
                })
            });
        });
    });

    describe('PUT /events/:eventId/extend', () => {
        it('should extend event duration', async () => {
            const mockEvent = {
                host_id: 1,
                name: 'Test Event',
                start_time: '2024-03-01T20:00:00Z',
                end_time: '2024-03-01T22:00:00Z',
                slot_duration: { minutes: 10 },
                setup_duration: { minutes: 5 }
            };

            db.query
                .mockResolvedValueOnce({ rows: [mockEvent] }) // Event query
                .mockResolvedValueOnce({ rows: [{
                        ...mockEvent,
                        end_time: '2024-03-01T23:00:00Z'
                    }] }) // Update query
                .mockResolvedValueOnce({ rows: [] }); // Lineup users query

            const response = await request(app)
                .put('/events/1/extend')
                .send({ additional_slots: 2 });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('end_time');
            expect(mockBroadcastLineupUpdate).toHaveBeenCalled();
        });
    });

    // TODO: Create deletion test when deletion functionality is built
    // describe('DELETE /events/:eventId', () => {
    //     it('should delete event when requested by host', async () => {
    //         db.query
    //             .mockResolvedValueOnce({ rows: [{ host_id: 1 }] }) // Host check
    //             .mockResolvedValueOnce({ rows: [] }) // Delete lineup slots
    //             .mockResolvedValueOnce({ rows: [] }); // Delete event

    //         const response = await request(app)
    //             .delete('/events/1');

    //         expect(response.status).toBe(204);
    //     });

    //     it('should reject deletion from non-host', async () => {
    //         db.query.mockResolvedValueOnce({ rows: [{ host_id: 2 }] });

    //         const response = await request(app)
    //             .delete('/events/1');

    //         expect(response.status).toBe(403);
    //         expect(response.body).toHaveProperty('message', 'Only the host can delete this event');
    //     });
    // });
});
