import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';
import { NotificationsProvider } from '../context/NotificationsContext';

const mockWebSocketContext = {
    lastMessage: null,
    sendMessage: jest.fn(),
    setLastMessage: jest.fn(),
    subscribe: jest.fn(),
    connected: true
};

export const renderWithProviders = (
    component,
    {
        initialRoute = '/',
        ...renderOptions
    } = {}
) => {
    return {
        ...render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <AuthProvider>
                    <WebSocketProvider value={mockWebSocketContext}>
                        <NotificationsProvider>
                            {component}
                        </NotificationsProvider>
                    </WebSocketProvider>
                </AuthProvider>
            </MemoryRouter>
        ),
        mockWebSocketContext
    };
};
