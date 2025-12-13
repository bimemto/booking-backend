const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { protectAdmin } = require('../middleware/adminAuth');

/**
 * @route   GET /api/admin/users
 * @desc    Get all admin users with filters
 * @access  Private (requires admin authentication)
 */
router.get('/', protectAdmin, adminUserController.getAllAdmins);

/**
 * @route   GET /api/admin/users/:id
 * @desc    Get admin user by ID
 * @access  Private (requires admin authentication)
 */
router.get('/:id', protectAdmin, adminUserController.getAdminById);

/**
 * @route   POST /api/admin/users
 * @desc    Create new admin user
 * @access  Private (requires admin authentication)
 */
router.post('/', protectAdmin, adminUserController.createAdmin);

/**
 * @route   PATCH /api/admin/users/:id
 * @desc    Update admin user
 * @access  Private (requires admin authentication)
 */
router.patch('/:id', protectAdmin, adminUserController.updateAdmin);

/**
 * @route   PATCH /api/admin/users/:id/toggle-active
 * @desc    Toggle admin active status
 * @access  Private (requires admin authentication)
 */
router.patch('/:id/toggle-active', protectAdmin, adminUserController.toggleAdminActive);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete admin user
 * @access  Private (requires admin authentication)
 */
router.delete('/:id', protectAdmin, adminUserController.deleteAdmin);

module.exports = router;
