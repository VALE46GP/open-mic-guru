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

        const connectWebSocket = () => {
            const token = getToken();
            if (!token || !isAuthenticated) return;

            try {
                // Check token expiration
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.exp * 1000 < Date.now()) {
                    logout();
                    return;
                }

                const wsHost = window.location.hostname;
                ws = new WebSocket(`ws://${wsHost}:3001/ws?token=${token}`);

                ws.onopen = () => {
                    console.log('WebSocket connected');
                    setIsConnected(true);
                    setSocket(ws);
                };

                ws.onmessage = (event) => {
                    setLastMessage(event);
                };

                ws.onclose = (event) => {
                    console.log('WebSocket closed:', event);
                    setIsConnected(false);
                    setSocket(null);
                    if (event.code === 1000 && event.reason === 'Token expired') {
                        logout();
                    }
                };
            } catch (error) {
                console.error('WebSocket connection error:', error);
            }
        };

        connectWebSocket();

        return () => {
            if (ws) {
                ws.close();
                setSocket(null);
                setIsConnected(false);
            }
        };
    }, [isAuthenticated]);

    return (
        <WebSocketContext.Provider value={{ socket, lastMessage, isConnected }}>
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