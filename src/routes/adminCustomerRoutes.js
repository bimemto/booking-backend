const express = require('express');
const router = express.Router();
const adminCustomerController = require('../controllers/adminCustomerController');
const { protectAdmin } = require('../middleware/adminAuth');

// All routes require admin authentication
router.use(protectAdmin);

/**
 * @route   GET /api/admin/customers/stats
 * @desc    Get customer statistics
 * @access  Private (Admin only)
 */
router.get('/stats', adminCustomerController.getCustomerStats);

/**
 * @route   GET /api/admin/customers
 * @desc    Get all customers with filters and pagination
 * @access  Private (Admin only)
 */
router.get('/', adminCustomerController.getAllCustomers);

/**
 * @route   POST /api/admin/customers
 * @desc    Create new customer
 * @access  Private (Admin only)
 */
router.post('/', adminCustomerController.createCustomer);

/**
 * @route   GET /api/admin/customers/:id
 * @desc    Get customer by ID with recent bookings
 * @access  Private (Admin only)
 */
router.get('/:id', adminCustomerController.getCustomerById);

/**
 * @route   GET /api/admin/customers/:id/bookings
 * @desc    Get all bookings for a specific customer
 * @access  Private (Admin only)
 */
router.get('/:id/bookings', adminCustomerController.getCustomerBookings);

/**
 * @route   PATCH /api/admin/customers/:id
 * @desc    Update customer
 * @access  Private (Admin only)
 */
router.patch('/:id', adminCustomerController.updateCustomer);

/**
 * @route   PATCH /api/admin/customers/:id/toggle-active
 * @desc    Toggle customer active status
 * @access  Private (Admin only)
 */
router.patch('/:id/toggle-active', adminCustomerController.toggleCustomerActive);

/**
 * @route   DELETE /api/admin/customers/:id
 * @desc    Delete customer
 * @access  Private (Admin only)
 */
router.delete('/:id', adminCustomerController.deleteCustomer);

module.exports = router;
