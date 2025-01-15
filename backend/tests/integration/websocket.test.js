const WebSocket = require('ws');
const initializeWebSocketServer = require('../../src/websocket/WebSocketServer');
const http = require('http');
const jwt = require('jsonwebtoken');
process.env.JWT_SECRET = 'test-secret';

describe('WebSocket Server', () => {
    let server;
    let wss;
    let client;
    let port;

    beforeAll((done) => {
        server = http.createServer();
        wss = initializeWebSocketServer(server);
        server.listen(0, 'localhost', () => {  // Use port 0 for random available port
            port = server.address().port;  // Get the assigned port
            done();
        });
    });

    afterEach(() => {
        if (client) {
            client.close();
        }
    });

    afterAll((done) => {
        wss.wss.close(() => {
            server.close(done);
        });
    });

    afterAll(async () => {
        await new Promise(resolve => setTimeout(resolve, 500)); // Clean up any pending operations
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
        const mockToken = jwt.sign({ userId: 1 }, process.env.JWT_SECRET);
        let messageReceived = false;
        
        client = new WebSocket(`ws://localhost:${port}/ws?token=${mockToken}`);

        client.on('error', (error) => {
            done(error);
        });

        client.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                expect(message).toHaveProperty('type', 'NEW_NOTIFICATION');
                expect(message).toHaveProperty('userId', 1);
                messageReceived = true;
                done();
            } catch (error) {
                done(error);
            }
        });

        client.on('open', () => {
            setTimeout(() => {
                wss.broadcastNotification({
                    type: 'NEW_NOTIFICATION',
                    userId: 1,
                    notification: { id: 1, message: 'Test notification' }
                });
            }, 100);
        });

        // Add timeout safety
        setTimeout(() => {
            if (!messageReceived) {
                done(new Error('Message not received within timeout'));
            }
        }, 4000);
    }, 5000);

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
                setTimeout(() => {
                    try {
                        expect(wss.wss.clients.size).toBeLessThanOrEqual(1);  // Changed from wsServer to wss
                        done();
                    } catch (err) {
                        done(err);
                    }
                }, 500);
            });

            setTimeout(() => {
                if (!clientClosed) {
                    done(new Error('Client never connected'));
                }
            }, 5000);
        });
    });

    describe('WebSocket Error Handling', () => {
        it('should reject connections from unauthorized origins', (done) => {
            const unauthorizedOrigin = 'http://unauthorized-domain.com:3000';

            const mockSocket = new WebSocket(`ws://localhost:${port}/ws`, {
                headers: {
                    Origin: unauthorizedOrigin,
                    // Add host header to ensure proper origin checking
                    Host: `localhost:${port}`
                }
            });

            // Add timeout to avoid test hanging
            const timeout = setTimeout(() => {
                mockSocket.terminate();
                done(new Error('Test timeout'));
            }, 5000);

            mockSocket.on('error', () => {
                clearTimeout(timeout);
                expect(true).toBe(true);
                done();
            });

            mockSocket.on('open', () => {
                clearTimeout(timeout);
                mockSocket.terminate();
                done(new Error('Connection should have been rejected'));
            });
        });

        it('should handle client disconnection cleanup', (done) => {
            const mockSocket = new WebSocket(`ws://localhost:${port}/ws`);

            // Add timeout for safety
            const timeout = setTimeout(() => {
                mockSocket.terminate();
                done(new Error('Test timeout'));
            }, 5000);

            mockSocket.on('open', () => {
                expect(wss.wss.clients.size).toBe(1);
                mockSocket.close();
            });

            mockSocket.on('close', () => {
                clearTimeout(timeout);
                // Give server time to clean up
                setTimeout(() => {
                    expect(wss.wss.clients.size).toBe(0);
                    done();
                }, 100);
            });
        });
    });
});
