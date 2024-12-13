const request = require('supertest');
const express = require('express');
const setupTestDb = require('../setupTestDb');
const pool = require('../../src/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock AWS SDK completely
jest.mock('aws-sdk', () => ({
    config: {
        update: jest.fn()
    },
    S3: jest.fn(() => ({
        getSignedUrlPromise: jest.fn().mockResolvedValue('https://test-signed-url.com')
    }))
}));

// Mock environment variables
process.env.AWS_ACCESS_KEY_ID = 'test-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';
process.env.AWS_REGION = 'us-west-1';
process.env.S3_BUCKET_NAME = 'test-bucket';
process.env.JWT_SECRET = 'test-jwt-secret';

const app = express();
const usersRoutes = require('../../src/routes/users');

// Setup middleware
app.use(express.json());
app.use('/users', usersRoutes);

describe('Users Routes', () => {
    let authToken;

    beforeAll(async () => {
        await setupTestDb();
        // Create auth token for protected routes
        authToken = jwt.sign({ userId: 1 }, process.env.JWT_SECRET);
    });

    afterAll(async () => {
        await pool.end();
    });

    describe('GET /users', () => {
        it('should return all users', async () => {
            const response = await request(app).get('/users');
            expect(response.status).toBe(200);
            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body[0]).toMatchObject({
                id: 1,
                name: 'Test User',
                image: 'test-image.jpg',
                is_host: false,
                is_performer: false
            });
        });
    });

    describe('POST /users/upload', () => {
        it('should generate a signed URL for file upload', async () => {
            const response = await request(app)
                .post('/users/upload')
                .send({
                    fileName: 'test.jpg',
                    fileType: 'image/jpeg',
                    userId: 1
                });
            
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('uploadURL');
        });
    });

    describe('POST /users/register', () => {
        it('should register a new user', async () => {
            const response = await request(app)
                .post('/users/register')
                .send({
                    email: 'new@example.com',
                    password: 'password123',
                    name: 'New User',
                    photoUrl: 'new-image.jpg',
                    socialMediaAccounts: ['twitter.com/newuser']
                });

            expect(response.status).toBe(201);
            expect(response.body.user).toHaveProperty('email', 'new@example.com');
            expect(response.body.user).toHaveProperty('name', 'New User');
        });

        it('should handle duplicate email registration', async () => {
            const response = await request(app)
                .post('/users/register')
                .send({
                    email: 'test@example.com',
                    password: 'password123',
                    name: 'Test User'
                });

            expect(response.status).toBe(500);
            expect(response.body).toHaveProperty('error', 'Server error');
        });
    });

    describe('POST /users/login', () => {
        it('should login an existing user', async () => {
            // First register a user
            const password = 'testpass123';
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'INSERT INTO users (email, password, name) VALUES ($1, $2, $3)',
                ['login@example.com', hashedPassword, 'Login User']
            );

            const response = await request(app)
                .post('/users/login')
                .send({
                    email: 'login@example.com',
                    password: 'testpass123'
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('token');
        });

        it('should reject invalid credentials', async () => {
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
        it('should get user details', async () => {
            const response = await request(app).get('/users/1');
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('user');
            expect(response.body.user).toHaveProperty('id', 1);
        });

        it('should handle non-existent user', async () => {
            const response = await request(app).get('/users/999');
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'User not found');
        });
    });

    describe('POST /users/validate-password', () => {
        it('should validate correct password', async () => {
            const password = 'testpass123';
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'UPDATE users SET password = $1 WHERE id = 1',
                [hashedPassword]
            );

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
            const response = await request(app)
                .post('/users/validate-password')
                .send({
                    userId: 999,
                    password: 'anypassword'
                });

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'User not found');
        });
    });

    describe('DELETE /users/:userId', () => {
        it('should delete existing user', async () => {
            // First create a new user to delete
            const response = await request(app)
                .post('/users/register')
                .send({
                    email: 'todelete@example.com',
                    password: 'password123',
                    name: 'Delete User'
                });

            const userId = response.body.user.id;
            const deleteToken = jwt.sign({ userId }, process.env.JWT_SECRET);
            
            const deleteResponse = await request(app)
                .delete(`/users/${userId}`)
                .set('Authorization', `Bearer ${deleteToken}`);
            expect(deleteResponse.status).toBe(204);
        });

        it('should handle non-existent user deletion', async () => {
            const deleteToken = jwt.sign({ userId: 999 }, process.env.JWT_SECRET);
            
            const response = await request(app)
                .delete('/users/999')
                .set('Authorization', `Bearer ${deleteToken}`);
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error', 'User not found');
        });
    });

    describe('POST /users/upload error cases', () => {
        let originalS3;
        
        beforeEach(() => {
            originalS3 = require('aws-sdk').S3;
            jest.resetModules();
            jest.mock('aws-sdk', () => ({
                config: { update: jest.fn() },
                S3: jest.fn().mockImplementation(() => ({
                    getSignedUrlPromise: jest.fn().mockRejectedValue(new Error('S3 Error'))
                }))
            }));
        });

        afterEach(() => {
            require('aws-sdk').S3 = originalS3;
        });

        it('should handle S3 upload error', async () => {
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
});
