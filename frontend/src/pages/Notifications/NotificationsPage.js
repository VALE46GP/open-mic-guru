import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationsContext';
import EventCard from '../../components/events/EventCard';
import './NotificationsPage.sass';
import { BsChevronDown, BsChevronRight } from 'react-icons/bs';

function NotificationsPage() {
    const { notifications, markAsRead } = useNotifications();
    const [expandedEvents, setExpandedEvents] = useState(new Set());
    const [groupedNotifications, setGroupedNotifications] = useState({});
    const [locallyViewedNotifications, setLocallyViewedNotifications] = useState(new Set());

    useEffect(() => {
        // Group notifications by event_id
        const grouped = notifications.reduce((acc, notification) => {
            if (!notification.event_id) return acc;
            
            if (!acc[notification.event_id]) {
                acc[notification.event_id] = {
                    event: {
                        event_id: notification.event_id,
                        event_name: notification.event_name,
                        name: notification.event_name, // EventCard expects 'name'
                        start_time: notification.event_start_time,
                        venue_name: notification.venue_name || 'Unknown Venue',
                        host_name: notification.host_name || 'Unknown Host',
                        event_image: notification.event_image
                    },
                    notifications: [],
                    unreadCount: 0
                };
            }
            
            acc[notification.event_id].notifications.push(notification);
            if (!notification.is_read) {
                acc[notification.event_id].unreadCount++;
            }
            
            return acc;
        }, {});
        
        setGroupedNotifications(grouped);
    }, [notifications]);

    const handleEventClick = async (eventId) => {
        if (expandedEvents.has(eventId)) {
            setExpandedEvents(prev => {
                const next = new Set(prev);
                next.delete(eventId);
                return next;
            });
        } else {
            setExpandedEvents(prev => new Set([...prev, eventId]));
            
            // Mark all unread notifications for this event as read in backend
            const unreadNotifications = groupedNotifications[eventId].notifications
                .filter(n => !n.is_read)
                .map(n => n.id);
                
            if (unreadNotifications.length > 0) {
                try {
                    await markAsRead(unreadNotifications);
                    // Update the local state to track which notifications we've seen
                    setLocallyViewedNotifications(prev => {
                        const next = new Set(prev);
                        unreadNotifications.forEach(id => next.add(id));
                        return next;
                    });
                } catch (error) {
                    console.error('Error marking notifications as read:', error);
                }
            }
        }
    };

    return (
        <div className="notifications">
            <h1 className="notifications__title">Notifications</h1>
            <div className="notifications__list">
                {Object.entries(groupedNotifications).map(([eventId, data]) => (
                    <div key={eventId} className="notifications__event-group">
                        <div className="notifications__event-row">
                            <div className="notifications__button-column">
                                <button
                                    className={`notifications__toggle-button ${expandedEvents.has(eventId) ? 'notifications__toggle-button--expanded' : ''}`}
                                    onClick={() => handleEventClick(eventId)}
                                    title={expandedEvents.has(eventId) ? "Collapse notifications" : "Show notifications"}
                                >
                                    {expandedEvents.has(eventId) ? <BsChevronDown /> : <BsChevronRight />}
                                    {data.unreadCount > 0 && (
                                        <div className="notifications__badge">
                                            {data.unreadCount}
                                        </div>
                                    )}
                                </button>
                            </div>
                            <div className="notifications__event-card">
                                <EventCard event={data.event} />
                            </div>
                        </div>
                        
                        {expandedEvents.has(eventId) && (
                            <div className="notifications__messages">
                                {data.notifications
                                    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                                    .map(notification => (
                                        <div 
                                            key={notification.id}
                                            className={`notifications__message ${
                                                notification.is_read && !locallyViewedNotifications.has(notification.id)
                                                    ? 'notifications__message--read' 
                                                    : ''
                                            }`}
                                        >
                                            <span
                                                className={`notifications__time ${
                                                    notification.is_read && !locallyViewedNotifications.has(notification.id)
                                                        ? 'notifications__time--read'
                                                        : ''
                                                }`}
                                            >
                                                {new Date(notification.created_at).toLocaleDateString()}
                                            </span>
                                            <p>{notification.message}</p>
                                        </div>
                                    ))
                                }
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default NotificationsPage;
