// backend/index.js
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const passport = require('passport');
const routes = require('./src/routes');
const initializeWebSocketServer = require('./src/websocket/WebSocketServer');
const pool = require('./src/db');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '.env') });

// Environment Variables
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'development';
const ALLOWED_ORIGINS = [
    process.env.CLIENT_URL,
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
        // Log all origins in production for debugging
        if (NODE_ENV === 'production') {
            console.log(`Request origin: ${origin || 'No origin'}`);
        }

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

// Debug Endpoints
app.get('/debug', (req, res) => {
    res.json({
        env: process.env,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });
});

app.get('/debug-server', (req, res) => {
    res.json({
        port: PORT,
        nodeEnv: NODE_ENV,
        allowedOrigins: ALLOWED_ORIGINS,
        processEnv: {
            NODE_ENV: process.env.NODE_ENV,
            PORT: process.env.PORT,
            CLIENT_URL: process.env.CLIENT_URL
        },
        serverTime: new Date().toISOString()
    });
});

// Database debug endpoint
app.get('/debug-db', async (req, res) => {
    try {
        // Simple query to test DB connection
        const result = await pool.query('SELECT NOW() as time');

        res.json({
            status: 'success',
            message: 'Database connection successful',
            serverTime: new Date().toISOString(),
            dbTime: result.rows[0].time,
            dbConfig: {
                host: process.env.PGHOST,
                database: process.env.PGDATABASE,
                port: process.env.PGPORT,
                ssl: process.env.NODE_ENV === 'production' ? 'enabled' : 'disabled'
            }
        });
    } catch (error) {
        console.error('Database debug error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed',
            error: error.message,
            stack: process.env.NODE_ENV === 'production' ? null : error.stack
        });
    }
});

// Environment variables debug endpoint (safe version)
app.get('/debug-env', (req, res) => {
    // Only show non-sensitive environment variables
    res.json({
        database: {
            host: process.env.PGHOST,
            database: process.env.PGDATABASE,
            port: process.env.PGPORT,
            user: process.env.PGUSER ? 'Set' : 'Not set',
            password: process.env.PGPASSWORD ? 'Set' : 'Not set',
            ssl: {
                enabled: process.env.NODE_ENV === 'production',
                cert: process.env.RDS_CA_CERT ? 'Set' : 'Not set',
                certLength: process.env.RDS_CA_CERT ? Buffer.from(process.env.RDS_CA_CERT, 'base64').toString('ascii').length : 0
            }
        },
        server: {
            nodeEnv: process.env.NODE_ENV,
            port: process.env.PORT,
            clientUrl: process.env.CLIENT_URL
        }
    });
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        environment: NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

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