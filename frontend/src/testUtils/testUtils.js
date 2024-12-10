import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import { NotificationsProvider } from '../context/NotificationsContext';

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
    subscribe: jest.fn(),
    connected: true,
    webSocket: new MockWebSocket('ws://localhost:8080'),
};

const mockNotificationsContext = {
    notifications: [],
    addNotification: jest.fn(),
    removeNotification: jest.fn(),
    markAsRead: jest.fn(),
};

export const renderWithProviders = (component, { initialRoute = '/' } = {}) => {
    function Wrapper({ children }) {
        return (
            <MemoryRouter initialEntries={[initialRoute]}>
                <AuthProvider>
                    <WebSocketProvider>
                        <NotificationsProvider>
                            {children}
                        </NotificationsProvider>
                    </WebSocketProvider>
                </AuthProvider>
            </MemoryRouter>
        );
    }

    return {
        ...render(component, { wrapper: Wrapper }),
        mockWebSocketContext,
        mockNotificationsContext
    };
};