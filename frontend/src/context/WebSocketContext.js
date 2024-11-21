import React, { createContext, useContext, useEffect } from 'react';
import useWebSocket from 'react-use-websocket';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const socketUrl = `ws://${window.location.hostname}:3001/ws`;

    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: (closeEvent) => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000,
        onError: (event) => {
            console.error('WebSocket error:', event);
        },
        onClose: (event) => {
            console.log('WebSocket connection closed');
        }
    });

    return (
        <WebSocketContext.Provider value={{ sendMessage, lastMessage, readyState }}>
            {children}
        </WebSocketContext.Provider>
    );
};

export const useWebSocketContext = () => {
    const context = useContext(WebSocketContext);
    if (!context) {
        throw new Error('useWebSocketContext must be used within a WebSocketProvider');
    }
    return context;
};
