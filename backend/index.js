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
    console.log('=== Incoming Request ===');
    console.log(`${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Query:', req.query);
    console.log('Body:', req.body);
    console.log('=====================');
    next();
});

// CORS Configuration
app.use(cors());

// Middleware for parsing JSON
app.use(express.json());

// Initialize Passport
app.use(passport.initialize());

// Initialize WebSocket server and store broadcast function
const { broadcastLineupUpdate, broadcastNotification } = initializeWebSocketServer(server);
app.locals.broadcastLineupUpdate = broadcastLineupUpdate;
app.locals.broadcastNotification = broadcastNotification;

// Define routes
routes(app);

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

console.log('API URL:', process.env.REACT_APP_API_URL);
