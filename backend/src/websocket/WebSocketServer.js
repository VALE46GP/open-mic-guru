const WebSocket = require('ws');

function initializeWebSocketServer(server) {
    const wss = new WebSocket.Server({ 
        server,
        path: '/ws'
    });

    wss.on('connection', (ws) => {
        console.log('Client connected to WebSocket');

        ws.on('message', (message) => {
            console.log('Received:', message);
            ws.send(`Message received: ${message}`);
        });

        ws.on('close', () => {
            console.log('Client disconnected from WebSocket');
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });

    function broadcastLineupUpdate(lineupData) {
        console.log('WebSocket server broadcasting:', lineupData);
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify(lineupData));
            }
        });
    }

    return { wss, broadcastLineupUpdate };
}

module.exports = initializeWebSocketServer;
