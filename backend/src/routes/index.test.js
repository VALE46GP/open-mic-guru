const request = require('supertest');
const express = require('express');
const routes = require('../../src/routes');

describe('Route Configuration', () => {
    let app;

    beforeEach(() => {
        app = express();
        routes(app);
    });

    it('should mount users routes', async () => {
        const response = await request(app).get('/users');
        expect(response.status).not.toBe(404); // Route exists
    });

    it('should mount events routes', async () => {
        const response = await request(app).get('/events');
        expect(response.status).not.toBe(404); // Route exists
    });

    it('should mount notification routes', async () => {
        const response = await request(app).get('/notifications');
        expect(response.status).not.toBe(404); // Route exists
    });
});
