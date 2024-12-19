const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');

// Initialize Google Strategy
authController.initializeGoogleStrategy();

// Route to start Google OAuth flow
router.get('/google', authController.authenticateGoogle);

// Callback route after Google authentication
router.get('/google/callback',
    authController.handleGoogleCallback,
    authController.handleSuccessRedirect
);

module.exports = router;
