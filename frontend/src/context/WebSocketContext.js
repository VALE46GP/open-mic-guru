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
            const wsHost = window.location.hostname;
            let wsUrl = `ws://${wsHost}:3001/ws`;

            if (!token || !isAuthenticated) {
                console.log('No token or not authenticated, skipping WebSocket connection');
                return;
            }

            // console.log('Connecting WebSocket with token present:', !!token);
            wsUrl += `?token=${encodeURIComponent(token)}`;

            try {
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    // console.log(bSocket connected'We successfully');
                    setIsConnected(true);
                    setSocket(ws);
                };

                ws.onmessage = (event) => {
                    // console.log('Raw WebSocket message received:', event.data);
                    setLastMessage(event);
                };

                ws.onclose = (event) => {
                    // console.log('WebSocket closed:', event.code, event.reason);
                    setIsConnected(false);
                    setSocket(null);

                    if (event.code === 1000 && event.reason === 'Token expired') {
                        // console.log('Token expired, logging out');
                        logout();
                    } else if (isAuthenticated) {
                        // console.log('WebSocket disconnected, attempting reconnect in 3s...');
                        clearTimeout(reconnectTimeout);
                        reconnectTimeout = setTimeout(connectWebSocket, 3000);
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    // Log the readyState
                    // console.log('WebSocket ready state:', ws.readyState);
                };
            } catch (error) {
                console.error('WebSocket connection error:', error);
                if (isAuthenticated) {
                    console.log('Attempting reconnect after error...');
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