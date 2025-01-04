const { mockDb, resetMockDb } = require('../helpers/mockDb');
const request = require('supertest');
const express = require('express');
const db = require('../../src/db');
const venuesController = require('../../src/controllers/venues');

// Mock dependencies
jest.mock('../../src/db', () => mockDb);

const app = express();
app.use(express.json());

// Setup routes for testing
app.post('/venues/checkOrCreate', venuesController.checkOrCreateVenue);

describe('Venues Controller', () => {
    beforeEach(() => {
        resetMockDb();
    });

    describe('POST /venues/checkOrCreate', () => {
        it('should return existing venue if found', async () => {
            const mockVenue = {
                id: 1,
                name: 'Test Venue',
                address: '123 Test St',
                latitude: 40.7128,
                longitude: -74.0060
            };

            db.query.mockResolvedValueOnce({ rows: [mockVenue] });

            const response = await request(app)
                .post('/venues/checkOrCreate')
                .send({
                    name: 'Test Venue',
                    address: '123 Test St',
                    latitude: 40.7128,
                    longitude: -74.0060
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('venueId', 1);
            expect(db.query).toHaveBeenCalledWith(
                expect.stringMatching(/SELECT.*FROM venues/),
                ['Test Venue', '123 Test St']
            );
        });

        it('should create new venue if not found', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            db.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    name: 'New Venue',
                    address: '456 New St',
                    latitude: 40.7128,
                    longitude: -74.0060
                }]
            });

            const response = await request(app)
                .post('/venues/checkOrCreate')
                .send({
                    name: 'New Venue',
                    address: '456 New St',
                    latitude: 40.7128,
                    longitude: -74.0060
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('venueId', 1);
            expect(db.query).toHaveBeenCalledTimes(2);
        });

        it('should handle database errors', async () => {
            db.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app)
                .post('/venues/checkOrCreate')
                .send({
                    name: 'Test Venue',
                    address: '123 Test St'
                });

            expect(response.status).toBe(500);
            expect(response.body.message).toBe('Failed to process venue');
        });
    });
});
