const express = require('express');
const router = express.Router();
const adminBookingController = require('../controllers/adminBookingController');
const { protectAdmin } = require('../middleware/adminAuth');

// All routes require admin authentication
router.use(protectAdmin);

/**
 * @route   GET /api/admin/bookings/stats
 * @desc    Get booking statistics
 * @access  Private (Admin only)
 */
router.get('/stats', adminBookingController.getBookingStats);

/**
 * @route   GET /api/admin/bookings
 * @desc    Get all bookings with filters and pagination
 * @access  Private (Admin only)
 */
router.get('/', adminBookingController.getAllBookings);

/**
 * @route   GET /api/admin/bookings/:id
 * @desc    Get booking by ID
 * @access  Private (Admin only)
 */
router.get('/:id', adminBookingController.getBookingById);

/**
 * @route   PATCH /api/admin/bookings/:id/confirm
 * @desc    Confirm booking
 * @access  Private (Admin only)
 */
router.patch('/:id/confirm', adminBookingController.confirmBooking);

/**
 * @route   PATCH /api/admin/bookings/:id/assign-driver
 * @desc    Assign driver to booking
 * @access  Private (Admin only)
 */
router.patch('/:id/assign-driver', adminBookingController.assignDriver);

/**
 * @route   PATCH /api/admin/bookings/:id/status
 * @desc    Update booking status
 * @access  Private (Admin only)
 */
router.patch('/:id/status', adminBookingController.updateBookingStatus);

/**
 * @route   PATCH /api/admin/bookings/:id/notes
 * @desc    Update booking notes
 * @access  Private (Admin only)
 */
router.patch('/:id/notes', adminBookingController.updateBookingNotes);

/**
 * @route   PUT /api/admin/bookings/:id
 * @desc    Update booking (comprehensive update)
 * @access  Private (Admin only)
 */
router.put('/:id', adminBookingController.updateBooking);

module.exports = router;
