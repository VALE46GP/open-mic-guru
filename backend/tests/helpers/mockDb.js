const mockDb = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockImplementation(() => {
        const mockClient = {
            query: jest.fn().mockImplementation(async (query) => {
                if (query === 'BEGIN' || query === 'COMMIT' || query === 'ROLLBACK') {
                    return { rows: [] };
                }
                if (query.toLowerCase().includes('select')) {
                    return {
                        rows: [{
                            id: 1,
                            start_time: '2024-03-01T19:00:00Z',
                            slot_duration: 600,
                            setup_duration: 300
                        }]
                    };
                }
                return { rows: [] };
            }),
            release: jest.fn()
        };
        return Promise.resolve(mockClient);
    }),
    end: jest.fn()
};

const resetMockDb = () => {
    jest.clearAllMocks();
    mockDb.connect.mockReset();
    mockDb.query.mockReset().mockResolvedValue({ rows: [] });
};

module.exports = { mockDb, resetMockDb };