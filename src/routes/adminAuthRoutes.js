const express = require('express');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { protectAdmin } = require('../middleware/adminAuth');

/**
 * @route   POST /api/admin/auth/login
 * @desc    Login admin
 * @access  Public
 */
router.post('/login', adminAuthController.login);

/**
 * @route   GET /api/admin/auth/me
 * @desc    Get current admin profile
 * @access  Private (requires admin authentication)
 */
router.get('/me', protectAdmin, adminAuthController.getMe);

module.exports = router;
