// backend/index.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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
    // console.log('=== Incoming Request ===');
    // console.log(`${req.method} ${req.url}`);
    // console.log('Headers:', JSON.stringify(req.headers, null, 2));
    // console.log('Query:', req.query);
    // console.log('Body:', req.body);
    // console.log('=====================');
    next();
});

// CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.CLIENT_URL,
            'http://localhost:3000',
            'http://192.168.1.104:3000'
        ];

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'Pragma', 'Expires'],
    exposedHeaders: ['Access-Control-Allow-Origin']
};

app.use(cors(corsOptions));

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
