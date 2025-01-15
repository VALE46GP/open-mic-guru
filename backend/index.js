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
    // console.log('Query: ', req.query);
    // console.log('Body:', req.body);
    // console.log('=====================');
    next();
});

// CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) {
            callback(null, true);
            return;
        }

        try {
            const requestOrigin = new URL(origin);
            const allowedHosts = ['localhost', '192.168.1.104'];
            const allowedPorts = ['3000', '3001'];

            if (allowedHosts.includes(requestOrigin.hostname) && 
                allowedPorts.includes(requestOrigin.port)) {
                callback(null, true);
            } else {
                console.log('Rejected Origin:', origin);
                console.log('Hostname:', requestOrigin.hostname);
                console.log('Port:', requestOrigin.port);
                callback(new Error('Not allowed by CORS'));
            }
        } catch (error) {
            console.error('Error parsing origin:', error);
            callback(new Error('Invalid origin format'));
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
