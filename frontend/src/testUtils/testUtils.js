import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import { NotificationsProvider } from '../__mocks__/NotificationsContext';

class MockWebSocket {
    constructor(url) {
        this.url = url;
        this.onmessage = null;
        this.onclose = null;
        this.onerror = null;
        this.onopen = null;
        this.readyState = 0; // CONNECTING
        
        // Simulate successful connection
        setTimeout(() => {
            this.readyState = 1; // OPEN
            if (this.onopen) {
                this.onopen({ type: 'open' });
            }
        }, 0);
    }
    
    send(data) {
        if (this.onmessage) {
            // Echo back the message for testing
            this.onmessage({ data });
        }
    }

    close() {
        this.readyState = 3; // CLOSED
        if (this.onclose) {
            this.onclose({ type: 'close', code: 1000 });
        }
    }
}

// Prevent actual WebSocket connections in tests
global.WebSocket = MockWebSocket;

const mockWebSocketContext = {
    lastMessage: null,
    sendMessage: jest.fn(),
    setLastMessage: jest.fn(),
    isConnected: true,
    connected: true,
    socket: new MockWebSocket('ws://localhost:3001')
};

export const renderWithProviders = (
    component,
    {
        initialRoute = '/',
        webSocketValue = mockWebSocketContext,
        ...renderOptions
    } = {}
) => {
    return {
        ...render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <AuthProvider>
                    <WebSocketProvider value={webSocketValue}>
                        <NotificationsProvider>
                            {component}
                        </NotificationsProvider>
                    </WebSocketProvider>
                </AuthProvider>
            </MemoryRouter>,
            renderOptions
        ),
        mockWebSocketContext: webSocketValue
    };
};