// backend/index.js
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const passport = require('passport');
const routes = require('./src/routes');
const initializeWebSocketServer = require('./src/websocket/WebSocketServer');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Environment Variables
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = [
    process.env.CLIENT_URL,
    'https://www.openmicguru.com',
    'https://openmicguru.com',
    ...(NODE_ENV === 'development' ? [
        'http://localhost:3000',
        'http://192.168.1.104:3000'
    ] : [])
];

// Initialize Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Request Logging Middleware
app.use((req, res, next) => {
    if (NODE_ENV !== 'production') {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        console.log('Headers:', req.headers);
        console.log('Query:', req.query);
        console.log('Body:', req.body);
    }
    next();
});

// CORS Configuration
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`Blocked by CORS: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'Cache-Control',
        'Pragma',
        'Expires'
    ],
    exposedHeaders: ['Access-Control-Allow-Origin']
}));

// Middleware Setup
app.use(express.json());
app.use(passport.initialize());

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(err.status || 500).json({
        error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message
    });
});

// Initialize WebSocket Server
const { broadcastLineupUpdate, broadcastNotification } = initializeWebSocketServer(server);
app.locals.broadcastLineupUpdate = broadcastLineupUpdate;
app.locals.broadcastNotification = broadcastNotification;

// Initialize Routes
routes(app);

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        environment: NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

// Start Server
server.listen(PORT, () => {
    console.log(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    console.log(`Allowed origins:`, ALLOWED_ORIGINS);
});

// Handle unhandled rejections and exceptions
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});
