const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

function initializeWebSocketServer(server) {
    const wss = new WebSocket.Server({
        server,
        path: '/ws'
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
                console.error('Invalid token:', err);
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
