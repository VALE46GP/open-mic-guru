const { mockDb, resetMockDb } = require('../helpers/mockDb');
const request = require('supertest');
const express = require('express');
const db = require('../../src/db');
const eventsController = require('../../src/controllers/events');

// Mock dependencies
jest.mock('../../src/db', () => mockDb);

// Add new AWS SDK v3 mocks
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: jest.fn()
    })),
    PutObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn().mockResolvedValue('https://test-signed-url.com')
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

        it('should return 410 for deleted events', async () => {
            // Reset mocks
            mockDb.query.mockReset();
            
            // Mock the database response for a deleted event
            mockDb.query
                .mockResolvedValueOnce({ rows: [] })  // No event found means it's deleted
                .mockResolvedValueOnce({ rows: [] }); // Any subsequent queries

            const response = await request(app)
                .get('/events/999')
                .set('Connection', 'keep-alive'); // Add this to prevent socket hang up

            expect(response.status).toBe(410);
            expect(response.body.message).toBe('Event has been deleted');
        });

        it('should return 404 for non-existent event IDs', async () => {
            // Mock the query to simulate a database error or invalid ID format
            db.query.mockRejectedValueOnce(new Error('Invalid event ID'));

            const response = await request(app).get('/events/-1');

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Event not found');
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
            resetMockDb();
            mockBroadcastLineupUpdate.mockClear();

            // Debug logging for mock responses
            console.log('Setting up mock responses...');
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
                { rows: [{ // Update query result
                    id: 1,
                    name: 'Updated Event',
                    start_time: '2024-03-01T19:00:00Z',
                    end_time: '2024-03-01T22:00:00Z',
                    venue_id: 1,
                    slot_duration: { minutes: 10 },
                    setup_duration: { minutes: 5 },
                    types: ['comedy'],
                    active: true
                }]},
                { rows: [{ // Add venue info query response
                    id: 1,
                    name: 'Test Venue',
                    timezone: 'UTC',
                    address: '123 Test St'
                }]},
                { rows: [] } // Lineup users query
            ];

            mockResponses.forEach((response, index) => {
                mockDb.query.mockImplementationOnce(() => {
                    console.log(`Mock query ${index} called with response:`, response);
                    return Promise.resolve(response);
                });
            });

            // Debug the request
            const response = await request(app)
                .patch('/events/1')
                .send({
                    name: 'Updated Event',
                    start_time: '2024-03-01T19:00:00Z',
                    end_time: '2024-03-01T22:00:00Z'
                });

            console.log('Response status:', response.status);
            console.log('Response body:', response.body);
            console.log('Response headers:', response.headers);

            // Add debugging for middleware
            console.log('Middleware user:', response.request.user);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('name', 'Updated Event');
            expect(mockBroadcastLineupUpdate).toHaveBeenCalledWith({
                type: 'EVENT_UPDATE',
                eventId: 1,
                data: expect.any(Object)
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
});
