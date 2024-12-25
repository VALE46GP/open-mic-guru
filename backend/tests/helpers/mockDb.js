const mockDb = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockImplementation(() => ({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
    })),
    end: jest.fn()
};

const resetMockDb = () => {
    jest.clearAllMocks();
    mockDb.query.mockReset();
    mockDb.connect.mockReset().mockImplementation(() => ({
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
    }));
};

module.exports = { mockDb, resetMockDb };
