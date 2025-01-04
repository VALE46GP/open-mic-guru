const request = require('supertest');
const express = require('express');
const { mockDb, resetMockDb } = require('../helpers/mockDb');
const lineupSlotsController = require('../../src/controllers/lineup_slots');

// Mock dependencies
jest.mock('../../src/db', () => mockDb);
jest.mock('../../src/utils/notifications', () => ({
    createNotification: jest.fn().mockResolvedValue({ id: 1 })
}));

// Setup express app
const app = express();
app.use(express.json());
app.set('trust proxy', true);

// Mock middleware
app.use((req, res, next) => {
    req.ip = '127.0.0.1';
    req.cookies = { nonUserId: 'test-non-user-id' };
    req.app.locals = {
        broadcastLineupUpdate: jest.fn()
    };
    next();
});

app.put('/lineup-slots/reorder', lineupSlotsController.reorderSlots);

// Mock console.log before tests
beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

// Restore console.log after tests
afterAll(() => {
    console.log.mockRestore();
});

describe('Lineup Slots Reordering', () => {
    beforeEach(() => {
        resetMockDb();
        jest.clearAllMocks();
    });

    describe('PUT /lineup-slots/reorder', () => {
        it('should handle database errors during reorder', async () => {
            const mockClient = {
                query: jest.fn().mockImplementation(async (query) => {
                    if (query === 'BEGIN') return { rows: [] };
                    if (query === 'ROLLBACK') return { rows: [] };
                    if (query === 'COMMIT') return { rows: [] };
                    return { rows: [] };
                }),
                release: jest.fn()
            };

            mockDb.query.mockImplementation(async (query) => {
                if (query.toLowerCase().includes('from events e')) {
                    return {
                        rows: [{
                            id: 1,
                            name: 'Test Event',
                            start_time: '2024-03-01T19:00:00Z',
                            slot_duration: 600,
                            setup_duration: 300
                        }]
                    };
                }

                if (query.toLowerCase().includes('utc_offset')) {
                    return { rows: [{ utc_offset: -420 }] };
                }

                if (query.toLowerCase().includes('select slot_number')) {
                    return { rows: [{ slot_number: 1, user_id: null }] };
                }

                if (query.toLowerCase().includes('update')) {
                    const error = new Error('Database error during update');
                    error.code = '23505';
                    throw error;
                }

                return { rows: [] };
            });

            mockDb.connect.mockResolvedValue(mockClient);

            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [{ slot_id: 1, slot_number: 2 }]
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });

        it('should handle concurrent updates', async () => {
            const mockClient = {
                query: jest.fn().mockImplementation(async (query) => {
                    if (query === 'BEGIN') return { rows: [] };
                    if (query === 'ROLLBACK') return { rows: [] };
                    if (query === 'COMMIT') return { rows: [] };
                    return { rows: [] };
                }),
                release: jest.fn()
            };

            mockDb.query.mockImplementation(async (query) => {
                if (query.toLowerCase().includes('from events e')) {
                    return {
                        rows: [{
                            id: 1,
                            name: 'Test Event',
                            start_time: '2024-03-01T19:00:00Z',
                            slot_duration: 600,
                            setup_duration: 300
                        }]
                    };
                }

                if (query.toLowerCase().includes('utc_offset')) {
                    return { rows: [{ utc_offset: -420 }] };
                }

                if (query.toLowerCase().includes('select slot_number')) {
                    return { rows: [{ slot_number: 1, user_id: null }] };
                }

                if (query.toLowerCase().includes('update')) {
                    const error = new Error('concurrent update detected');
                    error.code = '23P01';
                    throw error;
                }

                return { rows: [] };
            });

            mockDb.connect.mockResolvedValue(mockClient);

            const response = await request(app)
                .put('/lineup-slots/reorder')
                .send({
                    slots: [{ slot_id: 1, slot_number: 2 }]
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
            expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
            expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
            expect(mockClient.release).toHaveBeenCalled();
        });
    });
});