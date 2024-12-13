const request = require('supertest');
const express = require('express');
const session = require('express-session');

// Mock passport to match actual auth.js behavior
jest.mock('passport', () => ({
    authenticate: jest.fn((strategy, options) => (req, res, next) => {
        if (strategy === 'google') {
            if (options && options.failureRedirect) {
                // This is the callback route
                return res.redirect('/');
            }
            // This is the initial auth route
            return res.redirect('/auth/google/callback');
        }
        return res.redirect('/');
    }),
    use: jest.fn(),
    initialize: jest.fn(() => (req, res, next) => next()),
    session: jest.fn(() => (req, res, next) => next())
}));

const app = express();

// Add required middleware
app.use(session({ 
    secret: 'test-secret',
    resave: false,
    saveUninitialized: false
}));

const authRoutes = require('../../src/routes/auth');

describe('Auth Routes', () => {
    beforeEach(() => {
        app.use('/auth', authRoutes);
    });

    it('should have Google authentication route', async () => {
        const response = await request(app).get('/auth/google');
        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/auth/google/callback');
    });

    it('should have Google callback route', async () => {
        const response = await request(app).get('/auth/google/callback');
        expect(response.status).toBe(302);
        expect(response.header.location).toBe('/');
    });
});
