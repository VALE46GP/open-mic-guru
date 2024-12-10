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
    }
    send() {}
    close() {}
}

const mockWebSocketContext = {
    lastMessage: null,
    sendMessage: jest.fn(),
    setLastMessage: jest.fn(),
    readyState: 1,
    connected: true
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