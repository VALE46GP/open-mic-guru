const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { logger } = require('../../tests/utils/logger');

function initializeWebSocketServer(server) {
    const wss = new WebSocket.Server({
        server,
        path: '/ws',
        clientTracking: true,
        verifyClient: ({ origin, req }, callback) => {
            if (!origin) {
                logger.log('No origin - allowing connection');
                callback(true);
                return;
            }

            try {
                const requestOrigin = new URL(origin);
                const allowedHosts = ['localhost', '192.168.1.104'];
                const allowedPorts = ['3000', '3001'];

                const isAllowed = allowedHosts.includes(requestOrigin.hostname) &&
                    allowedPorts.includes(requestOrigin.port);

                callback(isAllowed);
            } catch (error) {
                logger.error('Error verifying WebSocket client:', error);
                callback(false);
            }
        }
    });

    const clients = new Map();

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url, 'ws://localhost');
        const token = url.searchParams.get('token');
        const nonUserId = getCookieFromRequest(req, 'nonUserId');

        // Generate a unique ID for this connection
        ws.id = Math.random().toString(36).substring(7);

        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.userId;
                clients.set(ws, { type: 'user', id: userId });
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
            // Store non-user connection with their nonUserId
            clients.set(ws, { type: 'nonuser', id: nonUserId });
        } else {
            // For connections without token or nonUserId
            clients.set(ws, { type: 'anonymous', id: ws.id });
        }

        ws.on('close', () => {
            clients.delete(ws);
        });
    });

    // Helper function to get cookie value from request
    function getCookieFromRequest(req, cookieName) {
        const cookies = req.headers.cookie;
        if (!cookies) return null;
        
        const match = cookies.match(new RegExp(`${cookieName}=([^;]+)`));
        return match ? match[1] : null;
    }

    function broadcastNotification(data) {
        const targetUserId = data.userId;
        wss.clients.forEach(client => {
            const clientInfo = clients.get(client);
            if (client.readyState === WebSocket.OPEN && 
                clientInfo?.type === 'user' && 
                clientInfo?.id === targetUserId) {
                client.send(JSON.stringify(data));
            }
        });
    }

    function broadcastLineupUpdate(data) {
        console.log('Broadcasting update:', data);
        const clientCount = wss.clients.size;
        console.log('Number of connected clients:', clientCount);
        
        if (clientCount === 0) {
            console.warn('No clients connected to receive broadcast');
            return;
        }

        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                const clientInfo = clients.get(client);
                console.log(`Sending to client ${client.id} (${clientInfo?.type}: ${clientInfo?.id})`);
                client.send(JSON.stringify(data));
            }
        });
    }

    return { wss, broadcastNotification, broadcastLineupUpdate };
}

module.exports = initializeWebSocketServer;
