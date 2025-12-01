const express = require('express');
const router = express.Router();
const adminDriverController = require('../controllers/adminDriverController');
const { protectAdmin } = require('../middleware/adminAuth');

// All routes require admin authentication
router.use(protectAdmin);

/**
 * @route   GET /api/admin/drivers/available
 * @desc    Get available drivers for booking assignment (verified and active)
 * @access  Private (Admin only)
 */
router.get('/available', adminDriverController.getAvailableDrivers);

/**
 * @route   GET /api/admin/drivers/stats
 * @desc    Get driver statistics
 * @access  Private (Admin only)
 */
router.get('/stats', adminDriverController.getDriverStats);

/**
 * @route   GET /api/admin/drivers
 * @desc    Get all drivers with filters and pagination
 * @access  Private (Admin only)
 */
router.get('/', adminDriverController.getAllDrivers);

/**
 * @route   POST /api/admin/drivers
 * @desc    Create new driver
 * @access  Private (Admin only)
 */
router.post('/', adminDriverController.createDriver);

/**
 * @route   GET /api/admin/drivers/:id
 * @desc    Get driver by ID
 * @access  Private (Admin only)
 */
router.get('/:id', adminDriverController.getDriverById);

/**
 * @route   PATCH /api/admin/drivers/:id
 * @desc    Update driver
 * @access  Private (Admin only)
 */
router.patch('/:id', adminDriverController.updateDriver);

/**
 * @route   PATCH /api/admin/drivers/:id/toggle-active
 * @desc    Toggle driver active status
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle-active', adminDriverController.toggleDriverActive);

/**
 * @route   PATCH /api/admin/drivers/:id/verify
 * @desc    Verify driver
 * @access  Private (Admin only)
 */
router.patch('/:id/verify', adminDriverController.verifyDriver);

/**
 * @route   DELETE /api/admin/drivers/:id
 * @desc    Delete driver
 * @access  Private (Admin only)
 */
router.delete('/:id', adminDriverController.deleteDriver);

module.exports = router;
