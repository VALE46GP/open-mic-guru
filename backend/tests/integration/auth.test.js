const request = require('supertest');
const express = require('express');
const passport = require('passport');
const authRoutes = require('../../src/routes/auth');

describe('Auth Routes', () => {
    let app;

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/auth', authRoutes);
    });

    it('should have Google authentication route', async () => {
        const response = await request(app).get('/auth/google');
        expect(response.status).not.toBe(404);
    });

    it('should have Google callback route', async () => {
        const response = await request(app).get('/auth/google/callback');
        expect(response.status).not.toBe(404);
    });
});
