import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocketContext } from './WebSocketContext';

const NotificationsContext = createContext();

const getApiUrl = () => {
    const isLocalhost = window.location.hostname === 'localhost';
    return isLocalhost 
        ? process.env.REACT_APP_API_URL 
        : `http://${process.env.REACT_APP_DEV_IP}:3001`;
};

export function NotificationsProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { getUserId, getToken, user } = useAuth();
    const { lastMessage } = useWebSocketContext();

    const fetchNotifications = async () => {
        try {
            const token = getToken();
            const userId = getUserId();
            const apiUrl = getApiUrl();
            
            console.log('Attempting to fetch notifications:', {
                userId,
                hasToken: !!token,
                apiUrl
            });

            if (!token) {
                console.error('No token available for fetching notifications');
                return;
            }

            const url = `${apiUrl}/notifications`;
            console.log('Making fetch request to:', url);
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Failed to fetch notifications:', {
                    status: response.status,
                    statusText: response.statusText,
                    error: errorText
                });
                throw new Error(`Failed to fetch notifications: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            console.log('Successfully fetched notifications:', data);
            setNotifications(data);
            
            const unreadCount = data.filter(notification => !notification.is_read).length;
            setUnreadCount(unreadCount);
        } catch (error) {
            console.error('Detailed error fetching notifications:', error);
        }
    };

    useEffect(() => {
        const userId = getUserId();
        if (userId) {
            console.log('Fetching notifications for user:', userId);
            fetchNotifications();
        }
    }, [getUserId]);

    useEffect(() => {
        if (lastMessage) {
            console.log('WebSocket message received:', lastMessage);
            try {
                const data = JSON.parse(lastMessage.data);
                console.log('Parsed WebSocket data:', data);
                
                if ((data.type === 'NOTIFICATION_UPDATE' || data.type === 'NEW_NOTIFICATION') 
                    && data.userId === getUserId()) {
                    console.log('Adding new notification:', data.notification);
                    setNotifications(prev => {
                        // Check if notification already exists
                        const exists = prev.some(n => n.id === data.notification.id);
                        if (exists) {
                            return prev.map(n => 
                                n.id === data.notification.id ? data.notification : n
                            );
                        }
                        return [data.notification, ...prev];
                    });
                    if (!data.notification.is_read) {
                        setUnreadCount(prev => prev + 1);
                    }
                }
                
                if (data.type === 'LINEUP_UPDATE' || 
                    (data.type === 'EVENT_UPDATE' && data.eventId)) {
                    console.log('Received update, refreshing notifications');
                    fetchNotifications();
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        }
    }, [lastMessage, getUserId, getToken]);

    const value = {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead: async (notificationIds) => {
            try {
                const token = getToken();
                console.log('Current token:', token);
                if (!token) return;

                const response = await fetch(`${process.env.REACT_APP_API_URL}/notifications/mark-read`, {
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

                const response = await fetch(`${process.env.REACT_APP_API_URL}/notifications`, {
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
