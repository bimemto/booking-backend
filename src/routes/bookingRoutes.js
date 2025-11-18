const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');

/**
 * Booking routes
 */

// Create a new booking
router.post('/booking', bookingController.createBooking);

// Get all bookings
router.get('/bookings', bookingController.getBookings);

// Get booking by ID
router.get('/booking/:id', bookingController.getBookingById);

// Update booking status (mark as picked up)
router.patch('/booking/:id/status', bookingController.updateBookingStatus);

module.exports = router;
