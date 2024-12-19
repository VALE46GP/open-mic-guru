const jwt = require('jsonwebtoken');
const verifyToken = require('../../src/middleware/verifyToken');

describe('verifyToken Middleware', () => {
    let mockReq;
    let mockRes;
    let nextFunction;

    beforeEach(() => {
        mockReq = {
            headers: {}
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        nextFunction = jest.fn();
    });

    it('should return 401 if no token is provided', () => {
        verifyToken(mockReq, mockRes, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.any(String)
            })
        );
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should return 403 for invalid token', () => {
        mockReq.headers['authorization'] = 'Bearer invalid_token';

        verifyToken(mockReq, mockRes, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(403);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.any(String)
            })
        );
        expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should call next() with valid token', () => {
        const validToken = jwt.sign({ userId: 123 }, process.env.JWT_SECRET || 'test-secret');
        mockReq.headers['authorization'] = `Bearer ${validToken}`;

        verifyToken(mockReq, mockRes, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockReq).toHaveProperty('user');
        expect(mockReq.user).toHaveProperty('userId', 123);
    });

    it('should handle malformed authorization header', () => {
        mockReq.headers['authorization'] = 'malformed_header';

        verifyToken(mockReq, mockRes, nextFunction);

        expect(mockRes.status).toHaveBeenCalledWith(401);
        expect(mockRes.json).toHaveBeenCalledWith(
            expect.objectContaining({
                error: expect.any(String)
            })
        );
    });
});
