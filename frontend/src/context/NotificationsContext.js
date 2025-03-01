// frontend/src/context/NotificationsContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocketContext } from './WebSocketContext';

const NotificationsContext = createContext();

const getApiUrl = () => {
    return process.env.NODE_ENV === 'development'
        ? 'http://localhost:3001'
        : 'https://api.openmicguru.com';
};

export function NotificationsProvider({ children }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const { getUserId, getToken } = useAuth();
    const { lastMessage, setLastMessage } = useWebSocketContext();

    const defaultFetchOptions = useMemo(() => ({
        credentials: 'include',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
        }
    }), [getToken]);

    const fetchNotifications = useCallback(async (retryCount = 0) => {
        try {
            const token = getToken();
            
            if (!token) {
                console.error('No token available for fetching notifications');
                return;
            }

            const url = `${getApiUrl()}/notifications`;
            
            const response = await fetch(url, {
                method: 'GET',
                ...defaultFetchOptions,
                headers: {
                    ...defaultFetchOptions.headers,
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
                
                // Retry logic for network errors
                if (retryCount < 3 && (response.status >= 500 || response.status === 0)) {
                    console.log(`Retrying fetch (attempt ${retryCount + 1})...`);
                    setTimeout(() => fetchNotifications(retryCount + 1), 1000 * (retryCount + 1));
                    return;
                }
                
                throw new Error(`Failed to fetch notifications: ${response.status} ${errorText}`);
            }
            
            const data = await response.json();
            setNotifications(data);
            
            const unreadCount = data.filter(notification => !notification.is_read).length;
            setUnreadCount(unreadCount);
        } catch (error) {
            console.error('Detailed error fetching notifications:', error);
            
            // Retry on network errors
            if (retryCount < 3 && error.name === 'TypeError') {
                console.log(`Retrying fetch (attempt ${retryCount + 1})...`);
                setTimeout(() => fetchNotifications(retryCount + 1), 1000 * (retryCount + 1));
            }
        }
    }, [getToken, defaultFetchOptions]);

    useEffect(() => {
        const userId = getUserId();
        if (userId) {
            fetchNotifications();
        }
    }, [getUserId, fetchNotifications]);

    useEffect(() => {
        let retryTimeout;
        
        const handleWebSocketMessage = (message) => {
            if (!message) return;
            
            try {
                const data = JSON.parse(message.data);
                console.log('Processing WebSocket message:', data);
                
                if (data.type === 'NEW_NOTIFICATION' && data.userId === getUserId() && data.notification) {
                    console.log('Adding new notification:', data.notification);
                    setNotifications(prev => {
                        const exists = prev.some(n => n.id === data.notification.id);
                        if (!exists) {
                            return [data.notification, ...prev];
                        }
                        return prev;
                    });
                } else if (data.type === 'NOTIFICATION_DELETE' && data.userId === getUserId()) {
                    console.log('Deleting notifications:', data.notificationIds);
                    setNotifications(prev => 
                        prev.filter(notification => !data.notificationIds.includes(notification.id))
                    );
                    
                    if (setLastMessage) {
                        setLastMessage(null);
                    }
                } else if (data.type === 'EVENT_UPDATE' && data.eventId) {
                    console.log('Updating notifications for event:', data.eventId);
                    setNotifications(prev => {
                        const updatedNotifications = prev.map(notification => {
                            if (notification.event_id === data.eventId) {
                                console.log('Updating notification:', notification.id);
                                return {
                                    ...notification,
                                    event_name: data.data.name,
                                    event_start_time: data.data.start_time,
                                    event_types: data.data.types,
                                    active: data.data.active,
                                    deleted: data.data.deleted,
                                    venue_name: data.data.venue_name,
                                    host_name: data.data.host_name
                                };
                            }
                            return notification;
                        });
                        
                        console.log('Updated notifications:', updatedNotifications);
                        return updatedNotifications;
                    });
                    
                    // Trigger a refetch to ensure we have the latest data
                    fetchNotifications();
                }
            } catch (error) {
                console.error('Error processing WebSocket message:', error);
            }
        };

        if (lastMessage) {
            handleWebSocketMessage(lastMessage);
        }

        return () => {
            clearTimeout(retryTimeout);
        };
    }, [lastMessage, getUserId, setLastMessage, fetchNotifications]);

    useEffect(() => {
        const newUnreadCount = notifications.filter(n => !n.is_read).length;
        setUnreadCount(newUnreadCount);
    }, [notifications]);

    const markAsRead = async (notificationIds) => {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(`${getApiUrl()}/notifications/mark-read`, {
                ...defaultFetchOptions,
                method: 'POST',
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
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            throw error;
        }
    };

    const deleteNotifications = async (eventIds) => {
        try {
            const token = getToken();
            if (!token) return;

            const response = await fetch(`${getApiUrl()}/notifications`, {
                ...defaultFetchOptions,
                method: 'DELETE',
                body: JSON.stringify({ eventIds })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            setNotifications(prev => 
                prev.filter(notification => !eventIds.includes(notification.event_id))
            );
        } catch (error) {
            console.error('Error deleting notifications:', error);
            throw error;
        }
    };

    const value = {
        notifications,
        unreadCount,
        fetchNotifications,
        markAsRead,
        deleteNotifications
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
