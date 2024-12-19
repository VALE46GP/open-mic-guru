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
                callback(true);
                return;
            }

            try {
                const requestOrigin = new URL(origin);
                const allowedHosts = ['localhost', '192.168.1.104'];
                const allowedPorts = ['3000', '3001'];

                const isAllowed = allowedHosts.includes(requestOrigin.hostname) && 
                                allowedPorts.includes(requestOrigin.port);

                // console.log('WebSocket verification:', {
                //     hostname: requestOrigin.hostname,
                //     port: requestOrigin.port,
                //     isAllowed
                // });

                callback(isAllowed);
            } catch (error) {
                console.error('Error verifying WebSocket client:', error);
                callback(false);
            }
        }
    });

    const clients = new Map();

    wss.on('connection', (ws, req) => {
        const url = new URL(req.url, 'ws://localhost');
        const token = url.searchParams.get('token');
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const userId = decoded.userId;
                clients.set(ws, userId);
                
                ws.on('close', () => {
                    clients.delete(ws);
                });
            } catch (err) {
                logger.error('Invalid token:', err);
            }
        }
    });

    function broadcastNotification(data) {
        const targetUserId = data.userId;
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN && clients.get(client) === targetUserId) {
                client.send(JSON.stringify(data));
            }
        });
    }

    function broadcastLineupUpdate(data) {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(data));
            }
        });
    }

    return { wss, broadcastNotification, broadcastLineupUpdate };
}

module.exports = initializeWebSocketServer;
