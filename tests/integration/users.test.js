const request = require('supertest');
const app = require('../../src/app');
const mockDb = require('../mocks/db');

// Mock dependencies
jest.mock('../../src/db', () => mockDb);

// Mock AWS SDK v3
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: jest.fn()
    })),
    PutObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn().mockResolvedValue('https://mock-presigned-url.com')
}));

// If you need to use the mock in your tests:
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

describe('User Routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    // Update any tests that check S3 URL generation
    describe('POST /users/upload', () => {
        it('should generate a presigned URL', async () => {
            const response = await request(app)
                .post('/users/upload')
                .send({
                    fileName: 'test.jpg',
                    fileType: 'image/jpeg',
                    userId: '123'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('uploadURL', 'https://mock-presigned-url.com');
            expect(getSignedUrl).toHaveBeenCalled();
        });
    });

    // Rest of your tests...
}); 