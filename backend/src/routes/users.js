const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users');
const verifyToken = require('../middleware/verifyToken');

// GET all users
router.get('/', usersController.getAllUsers);

// POST a new user OR edit existing user
router.post('/register', usersController.registerUser);

// POST login user
router.post('/login', usersController.loginUser);

// GET user details by ID
router.get('/:userId', usersController.getUserById);

// DELETE a user
router.delete('/:userId', verifyToken, usersController.deleteUser);

// POST get upload URL
router.post('/upload', usersController.generateUploadUrl);

// POST validate password
router.post('/validate-password', usersController.validatePassword);

module.exports = router;