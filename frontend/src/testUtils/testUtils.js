import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { WebSocketProvider } from '../context/WebSocketContext';

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

export const renderWithProviders = (
    component,
    { initialRoute = '/', ...renderOptions } = {}
) => {
    const Wrapper = ({ children }) => (
        <MemoryRouter initialEntries={[initialRoute]}>
            <AuthProvider>
                <WebSocketProvider value={mockWebSocketContext}>
                    {children}
                </WebSocketProvider>
            </AuthProvider>
        </MemoryRouter>
    );

    return {
        ...render(component, { wrapper: Wrapper, ...renderOptions }),
        mockWebSocketContext
    };
};