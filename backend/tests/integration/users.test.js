const request = require('supertest');
const express = require('express');
const { mockDb, resetMockDb } = require('../helpers/mockDb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');
const debug = require('debug')('test:users');

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

// Add this near the top with other mocks
jest.mock('../../src/utils/emailService.util', () => ({
    sendVerificationEmail: jest.fn().mockResolvedValue(true),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true)
}));

// Remove the existing JWT mock
jest.unmock('jsonwebtoken');

const app = express();
const usersController = require('../../src/controllers/users');

// Setup middleware
app.use(express.json());
const mockVerifyToken = (req, res, next) => {
    debug('mockVerifyToken called with:', {
        headers: req.headers,
        body: req.body
    });

    if (!req.headers.authorization) {
        debug('No authorization header');
        return res.status(401).json({ error: 'Token missing or invalid' });
    }

    const token = req.headers.authorization.split(' ')[1];
    debug('Token extracted:', token);
    
    try {
        // Use jwt.verify directly without callback
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test-secret');
        debug('Token decoded:', decoded);
        req.user = decoded;
        next();
    } catch (err) {
        debug('Token verification failed:', err);
        // Check if it's a non-matching user ID
        if (err.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Invalid token' });
        }
        // For non-matching user IDs
        return res.status(403).json({ error: 'Unauthorized' });
    }
};

// Setup routes
app.get('/users', usersController.getAllUsers);
app.post('/users/register', (req, res, next) => {
    if (req.body.isUpdate) {
        return mockVerifyToken(req, res, next);
    }
    next();
}, usersController.registerUser);
app.post('/users/login', usersController.loginUser);
app.get('/users/:userId', usersController.getUserById);
app.delete('/users/:userId', mockVerifyToken, usersController.deleteUser);
app.post('/users/upload', usersController.generateUploadUrl);
app.put('/users/verifications/:token', usersController.verifyEmail);

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
        it('should register a new user successfully and send verification email', async () => {
            const newUser = {
                email: 'new@example.com',
                password: 'password123',
                name: 'New User',
                photoUrl: 'new-image.jpg',
                socialMediaAccounts: ['twitter.com/newuser']
            };

            // Mock for checking existing user
            mockDb.query.mockResolvedValueOnce({ rows: [] });
            
            // Mock for creating user with verification
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    ...newUser,
                    verification_token: 'test-token',
                    email_verified: false
                }]
            });

            const emailService = require('../../src/utils/emailService.util');

            const response = await request(app)
                .post('/users/register')
                .send(newUser);

            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('needsVerification', true);
            expect(response.body).toHaveProperty('message', 'Registration successful. Please check your email to verify your account.');
            expect(emailService.sendVerificationEmail).toHaveBeenCalled();
        });

        it('should handle duplicate email registration with unverified account', async () => {
            const duplicateUser = {
                email: 'existing@example.com',
                password: 'password123',
                name: 'Duplicate User'
            };

            // Mock existing unverified user
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    email: duplicateUser.email,
                    email_verified: false
                }]
            });

            // Mock update verification token
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    email: duplicateUser.email,
                    verification_token: 'new-token'
                }]
            });

            const response = await request(app)
                .post('/users/register')
                .send(duplicateUser);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('needsVerification', true);
            expect(response.body.message).toContain('Account already exists but is not verified');
        });

        it('should update existing user when isUpdate is true', async () => {
            process.env.JWT_SECRET = 'test-secret'; // Ensure consistent secret
            
            const token = jwt.sign(
                { userId: 1 },
                process.env.JWT_SECRET
            );
            debug('Test token created:', token);

            // Mock the database responses
            const mockClient = {
                query: jest.fn()
                    .mockResolvedValueOnce({ rows: [] }) // BEGIN
                    .mockResolvedValueOnce({ // UPDATE
                        rows: [{
                            id: 1,
                            email: 'test@example.com',
                            name: 'Updated User'
                        }]
                    })
                    .mockResolvedValueOnce({ rows: [] }), // COMMIT
                release: jest.fn()
            };

            mockDb.connect.mockResolvedValue(mockClient);
            mockDb.query.mockResolvedValueOnce({ // getUserProfileById
                rows: [{
                    id: 1,
                    email: 'test@example.com',
                    name: 'Test User',
                    email_verified: true
                }]
            });

            const response = await request(app)
                .post('/users/register')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    email: 'test@example.com',
                    name: 'Updated User',
                    isUpdate: true,
                    userId: 1
                });
            
            debug('Response received:', {
                status: response.status,
                body: response.body,
                headers: response.headers
            });

            expect(response.status).toBe(200);
            expect(response.body.user).toMatchObject({
                name: 'Updated User',
                email: 'test@example.com'
            });
        });

        it('should reject updates for non-matching user IDs', async () => {
            process.env.JWT_SECRET = 'test-secret'; // Ensure consistent secret
            
            const token = jwt.sign(
                { userId: 999 },
                process.env.JWT_SECRET
            );

            const response = await request(app)
                .post('/users/register')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    userId: 1,
                    email: 'test@example.com',
                    name: 'Updated User',
                    isUpdate: true
                });

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Unauthorized');
        });
    });

    describe('POST /users/login', () => {
        it('should login verified user successfully', async () => {
            const password = 'testpass123';
            const hashedPassword = await bcrypt.hash(password, 10);

            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    email: 'login@example.com',
                    password: hashedPassword,
                    email_verified: true
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

        it('should reject unverified user login', async () => {
            const password = 'testpass123';
            const hashedPassword = await bcrypt.hash(password, 10);

            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    email: 'unverified@example.com',
                    password: hashedPassword,
                    email_verified: false
                }]
            });

            const response = await request(app)
                .post('/users/login')
                .send({
                    email: 'unverified@example.com',
                    password: password
                });

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('needsVerification', true);
        });

        it('should reject invalid credentials', async () => {
            const password = 'testpass123';
            const hashedPassword = await bcrypt.hash(password, 10);

            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    email: 'login@example.com',
                    password: hashedPassword,
                    email_verified: true
                }]
            });

            const response = await request(app)
                .post('/users/login')
                .send({
                    email: 'login@example.com',
                    password: 'wrongpassword'
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Invalid email or password');
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

    // Add new email verification tests
    describe('PUT /users/verifications/:token', () => {
        it('should verify email successfully', async () => {
            mockDb.query
                .mockResolvedValueOnce({ // Check if already verified
                    rows: []
                })
                .mockResolvedValueOnce({ // Get user by token
                    rows: [{
                        email: 'test@example.com',
                        verification_token: 'valid-token',
                        verification_token_expires: new Date(Date.now() + 86400000),
                        email_verified: false
                    }]
                })
                .mockResolvedValueOnce({ // Update verification
                    rows: [{
                        email: 'test@example.com',
                        email_verified: true
                    }]
                });

            const response = await request(app)
                .put('/users/verifications/valid-token');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Email verified successfully');
        });

        it('should handle already verified email', async () => {
            mockDb.query
                .mockResolvedValueOnce({ // Check if already verified
                    rows: [{
                        email: 'test@example.com',
                        email_verified: true
                    }]
                });

            const response = await request(app)
                .put('/users/verifications/valid-token');

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('message', 'Email already verified');
        });
    });
});
