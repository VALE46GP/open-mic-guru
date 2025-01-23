import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children, value }) => {
    const { getToken, logout, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Skip effect for test cases that provide a value
        if (value) return;

        let ws = null;
        let reconnectTimeout;

        const connectWebSocket = () => {
            const token = getToken();

            if (!token || !isAuthenticated) {
                console.log('No token or not authenticated, skipping WebSocket connection');
                return;
            }

            const isProduction = process.env.NODE_ENV === 'production';
            const wsProtocol = isProduction ? 'wss' : 'ws';
            const apiUrl = isProduction
                ? process.env.REACT_APP_API_URL?.replace(/^https?:\/\//, '')
                : `${window.location.hostname}:3001`;

            const wsUrl = `${wsProtocol}://${apiUrl}/ws?token=${encodeURIComponent(token)}`;

            try {
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    console.log('WebSocket connected successfully');
                    setIsConnected(true);
                    setSocket(ws);
                };

                ws.onmessage = (event) => {
                    setLastMessage(event);
                };

                ws.onclose = (event) => {
                    setIsConnected(false);
                    setSocket(null);

                    if (event.code === 1000 && event.reason === 'Token expired') {
                        logout();
                    } else if (isAuthenticated) {
                        clearTimeout(reconnectTimeout);
                        reconnectTimeout = setTimeout(connectWebSocket, 3000);
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', {
                        error,
                        readyState: ws.readyState,
                        url: wsUrl
                    });
                };
            } catch (error) {
                console.error('WebSocket connection error:', error);
                if (isAuthenticated) {
                    clearTimeout(reconnectTimeout);
                    reconnectTimeout = setTimeout(connectWebSocket, 3000);
                }
            }
        };

        // Only connect if authenticated
        if (isAuthenticated) {
            // console.log('User is authenticated, attempting WebSocket connection');
            connectWebSocket();
        } else {
            console.log('User is not authenticated, skipping WebSocket connection');
        }

        return () => {
            // console.log('Cleaning up WebSocket connection');
            clearTimeout(reconnectTimeout);
            if (ws) {
                ws.close();
            }
        };
    }, [isAuthenticated, value, getToken, logout]);

    // Return early for test cases
    if (value) {
        return (
            <WebSocketContext.Provider value={value}>
                {children}
            </WebSocketContext.Provider>
        );
    }

    return (
        <WebSocketContext.Provider value={{ socket, lastMessage, setLastMessage, isConnected }}>
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