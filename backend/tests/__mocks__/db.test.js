const mockPool = require('./db');

describe('DB Mock', () => {
    it('should provide mock query method', () => {
        expect(mockPool.query).toBeDefined();
        expect(typeof mockPool.query).toBe('function');
    });
});
