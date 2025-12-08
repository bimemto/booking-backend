const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

/**
 * Booking routes
 */

// Create a new booking
router.post('/booking', bookingController.createBooking);

// Get all bookings
router.get('/bookings', bookingController.getBookings);

// Get my bookings by deviceId (public API for mobile app)
router.get('/bookings/my-bookings', bookingController.getMyBookings);

// Get assigned bookings for authenticated driver
router.get('/bookings/driver/assigned', protect, bookingController.getDriverAssignedBookings);

// Get booking history for authenticated driver (picked up and completed)
router.get('/bookings/driver/history', protect, bookingController.getDriverHistory);

// Mark booking as picked up (driver only)
router.patch('/bookings/driver/:id/picked-up', protect, bookingController.markAsPickedUp);

// Mark booking as completed with images (driver only)
router.patch('/bookings/driver/:id/completed', protect, upload.array('images', 5), bookingController.markAsCompleted);

// Get booking by ID
router.get('/booking/:id', bookingController.getBookingById);

// Cancel booking (customer only - before confirmation)
router.patch('/booking/:id/cancel', bookingController.cancelBooking);

// Update booking status (mark as picked up) - deprecated, use driver routes above
router.patch('/booking/:id/status', bookingController.updateBookingStatus);

module.exports = router;
