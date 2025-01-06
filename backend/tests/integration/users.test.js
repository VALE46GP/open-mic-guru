const request = require('supertest');
const express = require('express');
const { mockDb, resetMockDb } = require('../helpers/mockDb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Add AWS SDK v3 mocks
jest.mock('@aws-sdk/client-s3', () => ({
    S3Client: jest.fn().mockImplementation(() => ({
        send: jest.fn()
    })),
    PutObjectCommand: jest.fn()
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn().mockResolvedValue('https://test-signed-url.com')
}));

// Mock the database
jest.mock('../../src/db', () => mockDb);

const app = express();
const usersController = require('../../src/controllers/users');

// Setup middleware
app.use(express.json());
const mockVerifyToken = (req, res, next) => {
    req.user = { id: 1, userId: 1 };
    next();
};

// Setup routes
app.get('/users', usersController.getAllUsers);
app.post('/users/register', usersController.registerUser);
app.post('/users/login', usersController.loginUser);
app.get('/users/:userId', usersController.getUserById);
app.delete('/users/:userId', mockVerifyToken, usersController.deleteUser);
app.post('/users/upload', usersController.generateUploadUrl);
app.post('/users/validate-password', usersController.validatePassword);

describe('Users Controller', () => {
    beforeEach(() => {
        resetMockDb();
        process.env.JWT_SECRET = 'test-jwt-secret';
    });

    describe('GET /users', () => {
        it('should return all users', async () => {
            const mockUsers = [{
                id: 1,
                name: 'Test User',
                image: 'test-image.jpg',
                is_host: false,
                is_performer: false,
                event_types: ['comedy']
            }];

            mockDb.query.mockResolvedValueOnce({ rows: mockUsers });

            const response = await request(app).get('/users');

            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0]).toMatchObject(mockUsers[0]);
        });

        it('should handle database errors', async () => {
            mockDb.query.mockRejectedValueOnce(new Error('Database error'));

            const response = await request(app).get('/users');

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });

    describe('POST /users/register', () => {
        it('should register a new user successfully', async () => {
            const newUser = {
                email: 'new@example.com',
                password: 'password123',
                name: 'New User',
                photoUrl: 'new-image.jpg',
                socialMediaAccounts: ['twitter.com/newuser']
            };

            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    ...newUser,
                    password: await bcrypt.hash(newUser.password, 10)
                }]
            });

            const response = await request(app)
                .post('/users/register')
                .send(newUser);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('token');
        });

        it('should handle duplicate email registration', async () => {
            const duplicateUser = {
                email: 'existing@example.com',
                password: 'password123',
                name: 'Duplicate User'
            };

            mockDb.query.mockRejectedValueOnce(new Error('duplicate key value'));

            const response = await request(app)
                .post('/users/register')
                .send(duplicateUser);

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });

        it('should update existing user when isUpdate is true', async () => {
            const updateUser = {
                userId: 1,
                email: 'update@example.com',
                name: 'Updated User',
                photoUrl: 'updated-image.jpg',
                socialMediaAccounts: ['twitter.com/updated'],
                isUpdate: true
            };

            mockDb.connect.mockResolvedValueOnce({
                query: jest.fn().mockResolvedValue({ rows: [{ ...updateUser, id: 1 }] }),
                release: jest.fn()
            });

            const response = await request(app)
                .post('/users/register')
                .send(updateUser);

            expect(response.status).toBe(200);
            expect(response.body.user).toMatchObject({ name: 'Updated User' });
        });
    });

    describe('POST /users/login', () => {
        it('should login user successfully', async () => {
            const password = 'testpass123';
            const hashedPassword = await bcrypt.hash(password, 10);

            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    email: 'login@example.com',
                    password: hashedPassword
                }]
            });

            const response = await request(app)
                .post('/users/login')
                .send({
                    email: 'login@example.com',
                    password: password
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
        });

        it('should reject invalid credentials', async () => {
            const password = 'testpass123';
            const hashedPassword = await bcrypt.hash(password, 10);

            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    email: 'login@example.com',
                    password: hashedPassword
                }]
            });

            const response = await request(app)
                .post('/users/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('message', 'Authentication failed');
        });
    });

    describe('GET /users/:userId', () => {
        it('should get user details by ID', async () => {
            const mockUser = {
                id: 1,
                name: 'Test User',
                email: 'test@example.com',
                image: 'test-image.jpg'
            };

            mockDb.query
                .mockResolvedValueOnce({ rows: [mockUser] })  // User query
                .mockResolvedValueOnce({ rows: [] });         // Events query

            const response = await request(app).get('/users/1');

            expect(response.status).toBe(200);
            expect(response.body.user).toMatchObject(mockUser);
        });

        it('should handle non-existent user', async () => {
            mockDb.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app).get('/users/999');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'User not found');
        });
    });

    describe('POST /users/upload', () => {
        it('should generate S3 upload URL', async () => {
            const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

            const response = await request(app)
                .post('/users/upload')
                .send({
                    fileName: 'test.jpg',
                    fileType: 'image/jpeg',
                    userId: 1
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('uploadURL', 'https://test-signed-url.com');
            expect(getSignedUrl).toHaveBeenCalled();
        });

        it('should handle S3 errors', async () => {
            const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
            // Mock the getSignedUrl to reject for this test
            getSignedUrl.mockRejectedValueOnce(new Error('S3 Error'));

            const response = await request(app)
                .post('/users/upload')
                .send({
                    fileName: 'test.jpg',
                    fileType: 'image/jpeg',
                    userId: 1
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Error generating upload URL');
        });
    });

    describe('POST /users/validate-password', () => {
        it('should validate correct password', async () => {
            const password = 'testpass123';
            const hashedPassword = await bcrypt.hash(password, 10);

            mockDb.query.mockResolvedValueOnce({
                rows: [{ password: hashedPassword }]
            });

            const response = await request(app)
                .post('/users/validate-password')
                .send({
                    userId: 1,
                    password: password
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('valid', true);
        });

        it('should reject incorrect password', async () => {
            const password = 'testpass123';
            const hashedPassword = await bcrypt.hash(password, 10);

            mockDb.query.mockResolvedValueOnce({
                rows: [{ password: hashedPassword }]
            });

            const response = await request(app)
                .post('/users/validate-password')
                .send({
                    userId: 1,
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Invalid password');
        });

        it('should handle non-existent user', async () => {
            mockDb.query.mockResolvedValueOnce({ rows: [] });

            const response = await request(app)
                .post('/users/validate-password')
                .send({
                    userId: 999,
                    password: 'anypassword'
                });

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'User not found');
        });

        // TODO: Create method for deleting a user (will need to handle events they host)
        // TODO: Write tests for this functionality
    });
});
