import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationsContext';
import BorderBox from '../../components/shared/BorderBox/BorderBox';
import { BsCircle, BsCheckCircleFill } from 'react-icons/bs';
import './NotificationsPage.sass';

function NotificationsPage() {
    const { notifications, markAsRead } = useNotifications();
    const [selectedTab, setSelectedTab] = useState('all');

    const filteredNotifications = selectedTab === 'unread'
        ? notifications.filter(n => !n.is_read)
        : notifications;

    const handleMarkAsRead = async (notificationId) => {
        await markAsRead([notificationId]);
    };

    const handleMarkAllAsRead = async () => {
        const unreadIds = notifications
            .filter(n => !n.is_read)
            .map(n => n.id);
        if (unreadIds.length > 0) {
            await markAsRead(unreadIds);
        }
    };

    return (
        <div className="notifications">
            <div className="notifications__header">
                <h1 className="notifications__title">Notifications</h1>
                <div className="notifications__tabs">
                    <button 
                        className={`notifications__tab ${selectedTab === 'all' ? 'notifications__tab--active' : ''}`}
                        onClick={() => setSelectedTab('all')}
                    >
                        All
                    </button>
                    <button 
                        className={`notifications__tab ${selectedTab === 'unread' ? 'notifications__tab--active' : ''}`}
                        onClick={() => setSelectedTab('unread')}
                    >
                        Unread
                    </button>
                </div>
                <button 
                    className="notifications__mark-all"
                    onClick={handleMarkAllAsRead}
                >
                    Mark all as read
                </button>
            </div>

            <div className="notifications__list">
                {filteredNotifications.length === 0 ? (
                    <p className="notifications__empty">No notifications to display</p>
                ) : (
                    filteredNotifications.map(notification => (
                        <BorderBox key={notification.id} className="notifications__item">
                            <div className="notifications__button-column">
                                <button
                                    onClick={() => handleMarkAsRead(notification.id)}
                                    className="notifications__status-icon"
                                    title={notification.is_read ? "Read" : "Mark as read"}
                                >
                                    {notification.is_read ? <BsCheckCircleFill /> : <BsCircle />}
                                </button>
                            </div>
                            <div className="notifications__message-column">
                                <span className="notifications__time">
                                    {new Date(notification.created_at).toLocaleDateString()}
                                </span>
                                <p className="notifications__message">{notification.message}</p>
                            </div>
                        </BorderBox>
                    ))
                )}
            </div>
        </div>
    );
}

export default NotificationsPage;
