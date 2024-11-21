import React from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationsContext';
import { useAuth } from '../../hooks/useAuth';
import './NotificationIndicator.sass';

function NotificationIndicator() {
    const { unreadCount } = useNotifications();
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) return null;

    return (
        <Link to="/notifications" className="notification-indicator">
            <i className="notification-indicator__fas notification-indicator__fa-bell" aria-label="Notifications"></i>
            {unreadCount > 0 && (
                <span className="notification-indicator__badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    );
}

export default NotificationIndicator;
