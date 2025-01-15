import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const WebSocketContext = createContext();

export const WebSocketProvider = ({ children }) => {
    const { getToken, logout, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

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

            console.log('Connecting to WebSocket:', wsUrl);

            try {
                ws = new WebSocket(wsUrl);

                ws.onopen = () => {
                    console.log('WebSocket connected');
                    setIsConnected(true);
                    setSocket(ws);
                };

                ws.onmessage = (event) => {
                    console.log('WebSocket message received:', event.data);
                    setLastMessage(event);
                };

                ws.onclose = (event) => {
                    console.log('WebSocket closed:', event);
                    setIsConnected(false);
                    setSocket(null);
                    
                    // Attempt to reconnect unless token expired
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