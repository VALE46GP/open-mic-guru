require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const routes = require('./src/routes');
const initializeWebSocketServer = require('./src/websocket/WebSocketServer');
const passport = require('passport');

const PORT = process.env.PORT || 3001;

const app = express();
const server = http.createServer(app);

// Global Middleware for Logging Requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// CORS Configuration
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000', // Adjust based on your frontend URL
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
    allowedHeaders: ['Content-Type', 'Authorization'], // Include Authorization header
}));

// Middleware for parsing JSON
app.use(express.json());

// Initialize Passport
app.use(passport.initialize());

// Initialize WebSocket server and store broadcast function
const { broadcastLineupUpdate } = initializeWebSocketServer(server);
app.locals.broadcastLineupUpdate = broadcastLineupUpdate;

// Define routes
routes(app);

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
