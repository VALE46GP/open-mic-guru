// backend/src/websocket/WebSocketServer.js

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { logger } = require('../../tests/utils/logger');

function getAllowedOrigins() {
    const defaultOrigins = ['localhost', '192.168.1.104'];
    const defaultPorts = ['3000', '3001'];

    // In production, add the deployed frontend URL
    if (process.env.NODE_ENV === 'production') {
        // Remove http:// or https:// and any trailing slash
        const clientUrl = process.env.CLIENT_URL?.replace(/(^\w+:|^)\/\//, '').replace(/\/$/, '');
        if (clientUrl) {
            return [clientUrl, ...defaultOrigins];
        }
    }

    return defaultOrigins;
}

function verifyOrigin(origin) {
    if (!origin) {
        // logger.log('No origin - allowing connection');
        return true;
    }

    try {
        const requestOrigin = new URL(origin);
        const allowedOrigins = getAllowedOrigins();

        // In production, we match the full hostname
        if (process.env.NODE_ENV === 'production') {
            return allowedOrigins.includes(requestOrigin.host);
        }

        // In development, we check hostname and port separately
        const allowedPorts = ['3000', '3001'];
        return allowedOrigins.includes(requestOrigin.hostname) &&
            allowedPorts.includes(requestOrigin.port);
    } catch (error) {
        logger.error('Error verifying origin:', error);
        return false;
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