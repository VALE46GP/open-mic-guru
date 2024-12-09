import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import { useNotifications, NotificationsProvider } from '../context/NotificationsContext';

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
    webSocket: new MockWebSocket('ws://localhost:8080')
};

// Create a wrapper component that provides mock notifications context
const MockNotificationsProvider = ({ children, notificationsContext }) => {
    // Override the provider's value with our mock data
    return (
        <NotificationsProvider>
            {React.cloneElement(children, { value: notificationsContext })}
        </NotificationsProvider>
    );
};

export const renderWithProviders = (
    component,
    {
        initialRoute = '/',
        notificationsContext = {
            notifications: [],
            unreadCount: 0,
            markAsRead: jest.fn().mockResolvedValue({}),
            deleteNotifications: jest.fn().mockResolvedValue({}),
            fetchNotifications: jest.fn()
        },
        ...renderOptions
    } = {}
) => {
    const Wrapper = ({ children }) => (
        <MemoryRouter initialEntries={[initialRoute]}>
            <AuthProvider>
                <WebSocketProvider value={mockWebSocketContext}>
                    <MockNotificationsProvider notificationsContext={notificationsContext}>
                        {children}
                    </MockNotificationsProvider>
                </WebSocketProvider>
            </AuthProvider>
        </MemoryRouter>
    );

    return {
        ...render(component, { wrapper: Wrapper, ...renderOptions }),
        mockWebSocketContext,
        rerender: (ui) => {
            return render(ui, { wrapper: Wrapper, ...renderOptions });
        }
    };
};