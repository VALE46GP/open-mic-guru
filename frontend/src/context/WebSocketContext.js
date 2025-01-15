import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children, value }) => {
    const { getToken, logout, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    // If a value is provided (for testing), use that instead
    if (value) {
        return (
            <WebSocketContext.Provider value={value}>
                {children}
            </WebSocketContext.Provider>
        );
    }

    useEffect(() => {
        let ws = null;
        let reconnectTimeout;

        const connectWebSocket = () => {
            const token = getToken();
            const wsHost = window.location.hostname;
            let wsUrl = `ws://${wsHost}:3001/ws`;

            if (token && isAuthenticated) {
                wsUrl += `?token=${token}`;
            }

            try {
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    setIsConnected(true);
                    setSocket(ws);
                };

                ws.onmessage = (event) => {
                    setLastMessage(event);
                };

                ws.onclose = (event) => {
                    setIsConnected(false);
                    setSocket(null);
                    
                    if (event.code !== 1000 || event.reason !== 'Token expired') {
                        clearTimeout(reconnectTimeout);
                        reconnectTimeout = setTimeout(connectWebSocket, 3000);
                    } else {
                        logout();
                    }
                };

                ws.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };
            } catch (error) {
                console.error('WebSocket connection error:', error);
                clearTimeout(reconnectTimeout);
                reconnectTimeout = setTimeout(connectWebSocket, 3000);
            }
        };

        connectWebSocket();

        return () => {
            clearTimeout(reconnectTimeout);
            if (ws) {
                ws.close();
            }
        };
    }, [isAuthenticated]);

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