import React, { createContext, useContext, useEffect, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import { useAuth } from '../hooks/useAuth';

const WebSocketContext = createContext(null);

export const WebSocketProvider = ({ children }) => {
    const [socketUrl, setSocketUrl] = useState(null);
    const { getToken } = useAuth();

    useEffect(() => {
        const token = getToken();
        if (token) {
            setSocketUrl(`ws://${window.location.hostname}:3001/ws?token=${token}`);
        }
    }, [getToken]);

    const { sendMessage, lastMessage, readyState } = useWebSocket(socketUrl, {
        shouldReconnect: (closeEvent) => true,
        reconnectAttempts: 10,
        reconnectInterval: 3000,
        onOpen: () => {
            console.log('WebSocket connected');
        },
        onMessage: (event) => {
            console.log('WebSocket message received:', event);
        },
        onError: (event) => {
            console.error('WebSocket error:', event);
        },
        onClose: (event) => {
            console.log('WebSocket closed:', event);
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
