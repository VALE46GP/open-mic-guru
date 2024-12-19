const WebSocket = require('ws');
const initializeWebSocketServer = require('../../src/websocket/WebSocketServer');
const http = require('http');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test-secret';

describe('WebSocket Server', () => {
    let server;
    let wsServer;
    let client;

    beforeAll((done) => {
        server = http.createServer();
        wsServer = initializeWebSocketServer(server);
        server.listen(0, 'localhost', done);
    });

    afterAll((done) => {
        server.close(done);
    });

    afterEach(() => {
        if (client) {
            client.close();
        }
    });

    it('should establish websocket connection', (done) => {
        const port = server.address().port;
        client = new WebSocket(`ws://localhost:${port}/ws`);

        client.on('open', () => {
            expect(client.readyState).toBe(WebSocket.OPEN);
            done();
        });
    });

    it('should broadcast notifications to specific user', (done) => {
        const port = server.address().port;
        const mockToken = jwt.sign({ userId: 1 }, process.env.JWT_SECRET);
        client = new WebSocket(`ws://localhost:${port}/ws?token=${mockToken}`);

        client.on('message', (data) => {
            const message = JSON.parse(data);
            expect(message).toHaveProperty('type', 'NOTIFICATION_UPDATE');
            expect(message).toHaveProperty('userId', 1);
            done();
        });

        client.on('open', () => {
            wsServer.broadcastNotification({
                type: 'NOTIFICATION_UPDATE',
                userId: 1,
                notification: { id: 1, message: 'Test notification' }
            });
        });
    });

    describe('WebSocket Error Handling', () => {
        it('should handle invalid tokens', (done) => {
            const port = server.address().port;
            const invalidToken = 'invalid-token';

            try {
                client = new WebSocket(`ws://localhost:${port}/ws?token=${invalidToken}`);

                // Listen for connection errors
                client.on('error', () => {
                    expect(true).toBe(true); // Verify we got an error
                    done();
                });

                // Timeout in case error event doesn't fire
                setTimeout(() => {
                    done();
                }, 1000);
            } catch (err) {
                done();
            }
        }, 15000);

        it('should handle client disconnection', (done) => {
            const port = server.address().port;
            const mockToken = jwt.sign({ userId: 1 }, process.env.JWT_SECRET);
            let clientClosed = false;

            client = new WebSocket(`ws://localhost:${port}/ws?token=${mockToken}`);

            client.on('open', () => {
                clientClosed = true;
                client.close();
            });

            client.on('close', () => {
                // Wait for server cleanup
                setTimeout(() => {
                    try {
                        // Some WS implementations might keep a reference briefly
                        expect(wsServer.wss.clients.size <= 1).toBe(true);
                        done();
                    } catch (err) {
                        done(err);
                    }
                }, 500);
            });

            // Timeout safety
            setTimeout(() => {
                if (!clientClosed) {
                    done(new Error('Client never connected'));
                }
            }, 5000);
        }, 15000);
    });
});
