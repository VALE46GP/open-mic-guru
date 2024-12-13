const mockPool = {
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
};

module.exports = {
    Pool: jest.fn(() => mockPool),
    mockPool
};
