const request = require('supertest');
const express = require('express');
const db = require('../../src/db');
const eventsController = require('../../src/controllers/events');
const AWS = require('aws-sdk');

// Mock dependencies
jest.mock('../../src/db');
jest.mock('aws-sdk', () => ({
    config: {
        update: jest.fn()
    },
    S3: jest.fn(() => ({
        getSignedUrlPromise: jest.fn().mockResolvedValue('https://test-signed-url.com')
    }))
}));

const app = express();
app.use(express.json());

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

describe('Events Controller', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        db.query.mockReset();
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
                name: 'New Test Event'
            };

            db.query.mockResolvedValueOnce({
                rows: [{ ...newEvent, id: 1 }]
            });

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
});
