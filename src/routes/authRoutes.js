const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new driver
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Login driver
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Get current driver profile
 * @access  Private (requires authentication)
 */
router.get('/me', protect, authController.getMe);

/**
 * @route   POST /api/auth/fcm-token
 * @desc    Update driver's FCM token
 * @access  Private (requires authentication)
 */
router.post('/fcm-token', protect, authController.updateFcmToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout driver (removes FCM token)
 * @access  Private (requires authentication)
 */
router.post('/logout', protect, authController.logout);

module.exports = router;
