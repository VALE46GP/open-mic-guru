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
    readyState: 1,
    connected: true
};

export const mockNotification = {
    id: 1,
    event_id: 123,
    message: 'New signup for slot 1',
    created_at: '2024-01-01T00:00:00Z',
    is_read: false,
    event_name: 'Test Event 1',
    venue_name: 'Test Venue',
    host_name: 'Test Host',
    event_start_time: '2024-02-01T00:00:00Z'
};

export const emptyMockHook = {
    notifications: [],
    markAsRead: jest.fn(),
    deleteNotifications: jest.fn(),
    fetchNotifications: jest.fn()
};

export const populatedMockHook = {
    notifications: [mockNotification],
    markAsRead: jest.fn(),
    deleteNotifications: jest.fn().mockResolvedValue(true),
    fetchNotifications: jest.fn()
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