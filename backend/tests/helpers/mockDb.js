const mockDb = {
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn().mockResolvedValue({
        query: jest.fn(),
        release: jest.fn()
    }),
    end: jest.fn()
};

const resetMockDb = () => {
    jest.clearAllMocks();
    mockDb.query.mockReset();
    mockDb.connect.mockReset();
};

module.exports = { mockDb, resetMockDb };
