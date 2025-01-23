// backend/src/websocket/WebSocketServer.js

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { logger } = require('../../tests/utils/logger');

function getAllowedOrigins() {
    // Base development origins with ports
    const developmentOrigins = [
        'localhost:3000',
        'localhost:3001',
        '127.0.0.1:3000',
        '127.0.0.1:3001',
        '192.168.1.104:3000',
        '192.168.1.104:3001'
    ];

    // Base development origins without ports for flexibility
    const developmentOriginsNoPorts = [
        'localhost',
        '127.0.0.1',
        '192.168.1.104'
    ];

    if (process.env.NODE_ENV === 'production') {
        // In production, get origins from environment variables
        const clientUrl = process.env.CLIENT_URL?.replace(/(^\w+:|^)\/\//, '').replace(/\/$/, '');
        const awsUrl = process.env.REACT_APP_AWS_URL?.replace(/(^\w+:|^)\/\//, '').replace(/\/$/, '');

        const productionOrigins = [
            ...(clientUrl ? [clientUrl] : []),
            ...(awsUrl ? [awsUrl] : [])
        ];

        // In production, we only want to allow specific origins
        return productionOrigins;
    }

    if (process.env.NODE_ENV === 'test') {
        // In test environment, we want to be permissive but maintain the test origins
        return [...developmentOrigins, ...developmentOriginsNoPorts];
    }

    // In development, allow both with and without ports
    return [...developmentOrigins, ...developmentOriginsNoPorts];
}

function verifyOrigin(origin) {
    // In test environment, allow connections without origin
    if (process.env.NODE_ENV === 'test' && !origin) {
        return true;
    }

    // In development, be more permissive
    if (process.env.NODE_ENV === 'development' && !origin) {
        return true;
    }

    // In production, require and validate origin
    if (process.env.NODE_ENV === 'production' && !origin) {
        return false;
    }

    try {
        const requestOrigin = new URL(origin);
        const originWithPort = `${requestOrigin.hostname}${requestOrigin.port ? ':' + requestOrigin.port : ''}`;
        const originNoPort = requestOrigin.hostname;
        const allowedOrigins = getAllowedOrigins();

        return allowedOrigins.some(allowed => {
            if (allowed.includes(':')) {
                // Match exact origin with port
                return originWithPort === allowed;
            }
            // Match hostname without port
            return originNoPort === allowed;
        });
    } catch (error) {
        logger.error('Error verifying origin:', error);
        // Allow in test and development, reject in production
        return process.env.NODE_ENV !== 'production';
    }
}

function initializeWebSocketServer(server) {
    const wss = new WebSocket.Server({
        server,
        path: '/ws',
        clientTracking: true,
        verifyClient: ({ origin, req }, callback) => {
            const isAllowed = verifyOrigin(origin);
            callback(isAllowed);
        }
    });

    const clients = new Map();

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url, `ws://${req.headers.host}`);
        const token = url.searchParams.get('token');
        const nonUserId = getCookieFromRequest(req, 'nonUserId');

        // Generate a unique ID for this connection
        ws.id = Math.random().toString(36).substring(7);

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.userId;
                clients.set(ws, { type: 'user', id: userId });
                // logger.log(`Authenticated user connected: ${userId}`);
            } catch (err) {
                logger.error('Invalid token:', err);
                if (err.name === 'TokenExpiredError') {
                    ws.close(1000, 'Token expired');
                } else {
                    ws.close(1008, 'Invalid token');
                }
                return;
            }
        } else if (nonUserId) {
            clients.set(ws, { type: 'nonuser', id: nonUserId });
            // logger.log(`Non-user connected: ${nonUserId}`);
        } else {
            clients.set(ws, { type: 'anonymous', id: ws.id });
            // logger.log(`Anonymous user connected: ${ws.id}`);
        }

        ws.on('close', () => {
            const client = clients.get(ws);
            // logger.log(`Client disconnected: ${client?.type} ${client?.id}`);
            clients.delete(ws);
        });
    });

    // Rest of the code remains the same
    function getCookieFromRequest(req, cookieName) {
        const cookies = req.headers.cookie;
        if (!cookies) return null;

        const match = cookies.match(new RegExp(`${cookieName}=([^;]+)`));
        return match ? match[1] : null;
    }

    function broadcastNotification(data) {
        const targetUserId = data.userId;
        // logger.log('Broadcasting notification:', { data, targetUserId });

        wss.clients.forEach(client => {
            const clientInfo = clients.get(client);
            if (client.readyState === WebSocket.OPEN &&
                clientInfo?.type === 'user' &&
                clientInfo?.id === targetUserId) {
                client.send(JSON.stringify(
                    data.type === 'NOTIFICATION_DELETE'
                        ? {
                            type: 'NOTIFICATION_DELETE',
                            userId: targetUserId,
                            notificationIds: data.notificationIds
                        }
                        : {
                            type: 'NEW_NOTIFICATION',
                            userId: targetUserId,
                            notification: data.notification
                        }
                ));
            }
        });
    }

    function broadcastLineupUpdate(data) {
        // logger.log('Broadcasting update:', data);
        const clientCount = wss.clients.size;
        // logger.log('Number of connected clients:', clientCount);

        if (clientCount === 0) {
            logger.warn('No clients connected to receive broadcast');
            return;
        }

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                const clientInfo = clients.get(client);
                // logger.log(`Sending to client ${client.id} (${clientInfo?.type}: ${clientInfo?.id})`);
                client.send(JSON.stringify(data));
            }
        });
    }

    return { wss, broadcastNotification, broadcastLineupUpdate };
}

module.exports = initializeWebSocketServer;