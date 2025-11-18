const Booking = require('../models/Booking');

/**
 * Create a new booking
 * POST /api/booking
 */
exports.createBooking = async (req, res) => {
  try {
    // Validate request body
    const validation = Booking.validateBooking(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Create new booking
    const booking = new Booking({
      fullName: req.body.fullName,
      phoneNumber: req.body.phoneNumber,
      pickupLocation: req.body.pickupLocation,
      dropoffLocation: req.body.dropoffLocation,
      numberOfBags: req.body.numberOfBags,
      isPickedUp: false
    });

    // Save to database
    await booking.save();

    // Return response with bookingID and timestamp
    res.status(201).json({
      success: true,
      data: {
        bookingID: booking._id.toString(),
        timestamp: booking.createdAt,
        booking: booking.toJSON()
      }
    });
  } catch (error) {
    console.error('Error creating booking:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create booking',
      error: error.message
    });
  }
};

/**
 * Get all bookings
 * GET /api/bookings
 */
exports.getBookings = async (req, res) => {
  try {
    const bookings = await Booking.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Error getting bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bookings',
      error: error.message
    });
  }
};

/**
 * Get booking by ID
 * GET /api/booking/:id
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error getting booking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking',
      error: error.message
    });
  }
};

/**
 * Update booking status (mark as picked up)
 * PATCH /api/booking/:id/status
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    booking.isPickedUp = req.body.isPickedUp || true;
    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: error.message
    });
  }
};
