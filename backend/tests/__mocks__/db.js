const mockPool = {
    query: jest.fn().mockImplementation((query) => {
        // Handle transaction queries specially
        if (query === 'BEGIN') {
            return Promise.resolve();
        }
        if (query === 'COMMIT') {
            return Promise.resolve();
        }
        if (query === 'ROLLBACK') {
            return Promise.resolve();
        }
        // Default return for other queries
        return Promise.resolve({ rows: [] });
    }),
    connect: jest.fn(),
    end: jest.fn(),
};

module.exports = mockPool;
