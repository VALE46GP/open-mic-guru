const express = require('express');
const router = express.Router();
const notificationsController = require('../controllers/notifications');
const verifyToken = require('../middleware/verifyToken');

router.use((req, res, next) => {
    next();
});

// Get notifications for current user
router.get('/', verifyToken, notificationsController.getUserNotifications);

// Mark notifications as read
router.post('/mark-read', verifyToken, notificationsController.markAsRead);

// Get user notification preferences
router.get('/preferences', verifyToken, notificationsController.getPreferences);

// Update notification preferences
router.put('/preferences', verifyToken, notificationsController.updatePreferences);

// Delete notifications
router.delete('/', verifyToken, notificationsController.deleteNotifications);

module.exports = router;