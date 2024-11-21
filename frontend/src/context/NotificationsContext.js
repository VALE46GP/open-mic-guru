import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocketContext } from './WebSocketContext';

const NotificationsContext = createContext();

export function NotificationsProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { getUserId, getToken } = useAuth();
    const { lastMessage } = useWebSocketContext();

    const fetchNotifications = async () => {
        try {
            const token = getToken();
            if (!token) {
                console.error('No authentication token available');
                return;
            }

            const response = await fetch('/api/notifications', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                console.error('Notifications fetch failed:', {
                    status: response.status,
                    statusText: response.statusText
                });
                return;
            }

            const data = await response.json();
            setNotifications(data.notifications || []);
            setUnreadCount((data.notifications || []).filter(n => !n.is_read).length);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        }
    };

    useEffect(() => {
        if (getUserId()) {
            fetchNotifications();
        }
    }, [getUserId()]);

    useEffect(() => {
        if (lastMessage) {
            try {
                const data = JSON.parse(lastMessage.data);
                if (data.type === 'NOTIFICATION') {
                    fetchNotifications();
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        }
    }, [lastMessage]);

    const value = {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead: async (notificationIds) => {
            try {
                const token = getToken();
                if (!token) return;

                const response = await fetch('/api/notifications/mark-read', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ notification_ids: notificationIds })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                setNotifications(prev => 
                    prev.map(notification => 
                        notificationIds.includes(notification.id) 
                            ? { ...notification, is_read: true }
                            : notification
                    )
                );
                setUnreadCount(prev => Math.max(0, prev - notificationIds.length));
            } catch (error) {
                console.error('Error marking notifications as read:', error);
            }
        }
    };

    return (
        <NotificationsContext.Provider value={value}>
            {children}
        </NotificationsContext.Provider>
    );
}

export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};
