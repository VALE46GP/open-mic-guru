const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users');
const verifyToken = require('../middleware/verifyToken');

// GET all users
router.get('/', usersController.getAllUsers);

// POST a new user OR edit existing user
router.post('/register', (req, res, next) => {
    // Only verify token for updates
    if (req.body.isUpdate) {
        verifyToken(req, res, next);
    } else {
        next();
    }
}, usersController.registerUser);

// POST login user
router.post('/login', usersController.loginUser);

// GET user details by ID
router.get('/:userId', usersController.getUserById);

// DELETE a user
router.delete('/:userId', verifyToken, usersController.deleteUser);

// POST get upload URL
router.post('/upload', verifyToken, usersController.generateUploadUrl);

// Email verification routes
router.put('/verifications/:token', usersController.verifyEmail);  // Verify an email
router.post('/verifications', usersController.resendVerification);

// Add these new routes
router.post('/forgot-password', usersController.forgotPassword);
router.post('/reset-password', usersController.resetPassword);

module.exports = router;