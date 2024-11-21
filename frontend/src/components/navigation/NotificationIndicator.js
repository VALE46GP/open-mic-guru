import React from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../../context/NotificationsContext';
import './NotificationIndicator.sass';

function NotificationIndicator() {
    const { unreadCount } = useNotifications();

    return (
        <Link to="/notifications" className="notification-indicator">
            <i className="fas fa-bell"></i>
            {unreadCount > 0 && (
                <span className="notification-badge">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    );
}

export default NotificationIndicator;
