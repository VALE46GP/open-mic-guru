const request = require('supertest');
const express = require('express');
const { mockDb, resetMockDb } = require('../helpers/mockDb');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const WebSocket = require('ws');

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
            // Reset mocks
            mockDb.query.mockReset();
            mockDb.connect.mockReset();
            
            // Mock JWT verification
            jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
                callback(null, { userId: 1 });
            });

            // Track all queries for debugging
            const queryLog = [];
            
            // Mock client with transaction support
            const mockClient = {
                query: jest.fn().mockImplementation((sql, params) => {
                    console.log('Client query:', { sql, params });
                    queryLog.push({ sql, params });

                    if (sql === 'BEGIN') return Promise.resolve({ rows: [] });
                    if (sql === 'COMMIT') return Promise.resolve({ rows: [] });
                    if (sql === 'ROLLBACK') return Promise.resolve({ rows: [] });

                    if (sql.includes('UPDATE users')) {
                        return Promise.resolve({
                            rows: [{
                                id: 1,
                                name: 'Updated User',
                                email: 'test@example.com',
                                image: null,
                                social_media_accounts: [],
                                bio: null,
                                email_verified: true
                            }]
                        });
                    }

                    return Promise.resolve({ rows: [] });
                }),
                release: jest.fn()
            };

            // Mock database connection
            mockDb.connect.mockResolvedValue(mockClient);

            // Mock initial user query
            mockDb.query.mockResolvedValueOnce({
                rows: [{
                    id: 1,
                    email: 'test@example.com',
                    name: 'Test User',
                    email_verified: true
                }]
            });

            const response = await request(app)
                .post('/users/register')
                .set('Authorization', 'Bearer test-token')
                .send({
                    userId: 1,
                    email: 'test@example.com',
                    name: 'Updated User',
                    isUpdate: true
                });

            console.log('Test response:', {
                status: response.status,
                body: response.body,
                queries: queryLog
            });

            expect(response.status).toBe(200);
            expect(response.body.user).toMatchObject({
                name: 'Updated User',
                email: 'test@example.com'
            });
        });

        it('should require authentication for updates', async () => {
            const response = await request(app)
                .post('/users/register')
                .send({
                    userId: 1,
                    email: 'test@example.com',
                    name: 'Updated User',
                    isUpdate: true
                });

            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('error', 'Token missing or invalid');
        });

        it('should reject updates with invalid token', async () => {
            const response = await request(app)
                .post('/users/register')
                .set('Authorization', 'Bearer invalid-token')
                .send({
                    userId: 1,
                    email: 'test@example.com',
                    name: 'Updated User',
                    isUpdate: true
                });

            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('error', 'Invalid token');
        });

        it('should reject updates for non-matching user IDs', async () => {
            // Mock JWT to return different user ID
            jest.spyOn(jwt, 'verify').mockImplementation((token, secret, callback) => {
                callback(null, { userId: 999 }); // Different from the requested update
            });

            const response = await request(app)
                .post('/users/register')
                .set('Authorization', 'Bearer test-token')
                .send({
                    userId: 1, // Trying to update different user
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
