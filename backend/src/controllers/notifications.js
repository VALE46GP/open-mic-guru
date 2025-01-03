const { notificationQueries } = require('../db/queries/notifications');
const { calculateSlotStartTime } = require('../utils/timeCalculations');
const { logger } = require('../../tests/utils/logger');

const notificationsController = {
    async getUserNotifications(req, res) {
        try {
            const userId = req.user.userId;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const offset = (page - 1) * limit;
            const unreadOnly = req.query.unread === 'true';

            const notifications = await notificationQueries.getUserNotifications(userId, limit, offset, unreadOnly);
            res.json(notifications);
        } catch (err) {
            logger.error('Error fetching notifications:', err);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async markAsRead(req, res) {
        try {
            const { notification_ids } = req.body;
            const userId = req.user.userId;

            const updatedNotifications = await notificationQueries.markNotificationsAsRead(notification_ids, userId);
            res.json({
                success: true,
                updatedNotifications
            });
        } catch (err) {
            logger.error('Error marking notifications as read:', err);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async getPreferences(req, res) {
        try {
            const userId = req.user.id;
            let preferences = await notificationQueries.getNotificationPreferences(userId);

            if (!preferences) {
                preferences = await notificationQueries.createDefaultPreferences(userId);
            }

            res.json(preferences);
        } catch (err) {
            logger.error('Error fetching notification preferences:', err);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async updatePreferences(req, res) {
        try {
            const userId = req.user.id;
            const preferences = await notificationQueries.updateNotificationPreferences(userId, req.body);
            res.json(preferences);
        } catch (err) {
            logger.error('Error updating notification preferences:', err);
            res.status(500).json({ error: 'Server error' });
        }
    },

    async deleteNotifications(req, res) {
        try {
            const { eventIds } = req.body;
            const userId = req.user.userId;

            const deletedNotifications = await notificationQueries.deleteNotifications(eventIds, userId);
            const deletedNotificationIds = deletedNotifications.map(notification => notification.id);

            req.app.locals.broadcastNotification({
                type: 'NOTIFICATION_DELETE',
                userId: userId,
                notificationIds: deletedNotificationIds
            });

            res.json({
                success: true,
                deletedNotifications
            });
        } catch (err) {
            console.error('Error deleting notifications:', err);
            res.status(500).json({ error: 'Server error' });
        }
    }
};

module.exports = notificationsController;