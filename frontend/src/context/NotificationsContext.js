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

            console.log('Fetching notifications...');
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
                const errorText = await response.text();
                console.error('Notifications fetch failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                return;
            }

            const data = await response.json();
            console.log('Received notifications:', data);
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
            console.log('WebSocket message received:', lastMessage);
            try {
                const data = JSON.parse(lastMessage.data);
                console.log('Parsed WebSocket data:', data);
                
                if ((data.type === 'NOTIFICATION_UPDATE' || data.type === 'NEW_NOTIFICATION') 
                    && data.userId === getUserId()) {
                    console.log('Adding new notification:', data.notification);
                    setNotifications(prev => [data.notification, ...prev]);
                    setUnreadCount(prev => prev + 1);
                }
                
                if (data.type === 'EVENT_UPDATE' && data.eventId) {
                    fetchNotifications();
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        }
    }, [lastMessage, getUserId]);

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
        },
        deleteNotifications: async (eventIds) => {
            try {
                const token = getToken();
                if (!token) return;

                const response = await fetch('/api/notifications', {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ eventIds })
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                setNotifications(prev => 
                    prev.filter(notification => !eventIds.includes(notification.event_id))
                );
                
                setUnreadCount(prev => {
                    const deletedUnreadCount = notifications
                        .filter(n => eventIds.includes(n.event_id) && !n.is_read)
                        .length;
                    return Math.max(0, prev - deletedUnreadCount);
                });
            } catch (error) {
                console.error('Error deleting notifications:', error);
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
