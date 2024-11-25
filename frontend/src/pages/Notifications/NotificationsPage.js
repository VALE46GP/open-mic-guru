import React, { useState, useEffect } from 'react';
import { useNotifications } from '../../context/NotificationsContext';
import EventCard from '../../components/events/EventCard';
import './NotificationsPage.sass';
import { BsChevronDown, BsChevronRight } from 'react-icons/bs';
import { Modal, Button } from 'react-bootstrap';
import { FaTrash } from 'react-icons/fa';

function NotificationsPage() {
    const { notifications, markAsRead, deleteNotifications, fetchNotifications } = useNotifications();
    console.log('Notifications received in NotificationsPage:', notifications);
    
    const [expandedEvents, setExpandedEvents] = useState(new Set());
    const [selectedEvents, setSelectedEvents] = useState(new Set());
    const [groupedNotifications, setGroupedNotifications] = useState({});
    const [locallyViewedNotifications, setLocallyViewedNotifications] = useState(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    console.log('API URL:', process.env.REACT_APP_API_URL);

    useEffect(() => {
        console.log('Running grouping effect with notifications:', notifications);
        // Group notifications by event_id
        const grouped = notifications.reduce((acc, notification) => {
            if (!notification.event_id) return acc;

            if (!acc[notification.event_id]) {
                // Get the performer notification for this event (if any)
                const performerNotification = notifications.find(
                    n => n.event_id === notification.event_id && n.is_performer
                );

                acc[notification.event_id] = {
                    event: {
                        event_id: notification.event_id,
                        event_name: notification.event_name,
                        name: notification.event_name,
                        start_time: notification.event_start_time,
                        venue_name: notification.venue_name || 'Unknown Venue',
                        host_name: notification.host_name || 'Unknown Host',
                        event_image: notification.event_image,
                        is_host: notification.is_host,
                        is_performer: performerNotification ? true : false,
                        performer_slot_time: performerNotification ? performerNotification.performer_slot_time : null,
                        event_types: notification.event_types,
                        active: notification.active
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

    const handleEventSelection = (eventId) => {
        setSelectedEvents(prev => {
            const next = new Set(prev);
            if (next.has(eventId)) {
                next.delete(eventId);
            } else {
                next.add(eventId);
            }
            return next;
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedEvents.size === 0) return;

        await deleteNotifications(Array.from(selectedEvents));
        setSelectedEvents(new Set());
    };

    const handleSelectAll = () => {
        if (selectedEvents.size === Object.keys(groupedNotifications).length) {
            // If all are selected, deselect all
            setSelectedEvents(new Set());
        } else {
            // Select all
            setSelectedEvents(new Set(Object.keys(groupedNotifications)));
        }
    };

    const handleDeleteClick = () => {
        if (selectedEvents.size > 0) {
            setShowDeleteModal(true);
        }
    };

    const handleConfirmDelete = async () => {
        await handleDeleteSelected();
        setShowDeleteModal(false);
    };

    return (
        <div className="notifications">
            <h1 className="notifications__title">Notifications</h1>
            <div className="notifications__top-button-row">
                <div className="notifications__top-button-container">
                    <button
                        className={`notifications__select-button ${
                            selectedEvents.size === Object.keys(groupedNotifications).length ? 
                            'notifications__select-button--selected' : ''
                        }`}
                        onClick={handleSelectAll}
                        title="Select All"
                    >
                        {selectedEvents.size === Object.keys(groupedNotifications).length && "✓"}
                    </button>
                </div>
                <div className="notifications__top-button-container">
                    <button
                        className="notifications__delete-button"
                        className={`notifications__delete-button ${
                            selectedEvents.size ?
                                'notifications__delete-button--active' : ''
                        }`}
                        onClick={handleDeleteClick}
                        disabled={selectedEvents.size === 0}
                        title="Delete Selected"
                    >
                        <FaTrash size={20} />
                    </button>
                </div>
            </div>
            <div className="notifications__list">
                {Object.entries(groupedNotifications)
                    .sort(([, a], [, b]) => {
                        // Get the most recent notification date for each event
                        const latestA = Math.max(...a.notifications.map(n => new Date(n.created_at)));
                        const latestB = Math.max(...b.notifications.map(n => new Date(n.created_at)));
                        return latestB - latestA; // Sort in descending order (newest first)
                    })
                    .map(([eventId, data]) => (
                        <div key={eventId} className="notifications__event-group">
                            <div className="notifications__event-row">
                                <div className="notifications__button-column">
                                    <button 
                                        className={`notifications__select-button ${
                                            selectedEvents.has(eventId) ? 'notifications__select-button--selected' : ''
                                        }`}
                                        onClick={() => handleEventSelection(eventId)}
                                    >
                                        {selectedEvents.has(eventId) && (
                                            <span className="notifications__checkmark">✓</span>
                                        )}
                                    </button>
                                    <button
                                        className={`notifications__toggle-button ${
                                            expandedEvents.has(eventId) ? 'notifications__toggle-button--expanded' : ''
                                        } ${data.unreadCount > 0 && !expandedEvents.has(eventId) ? 'notifications__toggle-button--has-unread' : ''}`}
                                        onClick={() => handleEventClick(eventId)}
                                        title={expandedEvents.has(eventId) ? "Collapse notifications" : "Show notifications"}
                                    >
                                        {expandedEvents.has(eventId) ? (
                                            <BsChevronDown/>
                                        ) : data.unreadCount > 0 ? (
                                            <span className="notifications__badge">
                                                {data.unreadCount}
                                            </span>
                                        ) : (
                                            <BsChevronRight/>
                                        )}
                                    </button>
                                </div>
                                <div className="notifications__event-card">
                                    <EventCard 
                                        event={data.event} 
                                        slotTime={data.event.is_performer ? data.event.performer_slot_time : null}
                                    />
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
            <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Deletion</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to delete notifications for {selectedEvents.size} selected event{selectedEvents.size !== 1 ? 's' : ''}?
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                        Cancel
                    </Button>
                    <Button variant="danger" onClick={handleConfirmDelete}>
                        Delete
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
}

export default NotificationsPage;
