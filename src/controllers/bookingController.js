const Booking = require('../models/Booking');
const Customer = require('../models/Customer');
const Hotel = require('../models/Hotel');
const { emitBookingPickedUp, emitBookingCompleted } = require('../services/websocketService');

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

    // Verify hotel exists and is active
    const hotel = await Hotel.findById(req.body.hotel);
    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    if (!hotel.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Hotel is not active'
      });
    }

    // Find or create customer by phone number
    let customer = await Customer.findOne({ phoneNumber: req.body.phoneNumber });

    if (customer) {
      // Update existing customer
      customer.fullName = req.body.fullName;
      if (req.body.email) {
        customer.email = req.body.email;
      }
      customer.totalBookings += 1;
      customer.lastBookingDate = new Date();
      await customer.save();
    } else {
      // Create new customer
      customer = new Customer({
        fullName: req.body.fullName,
        phoneNumber: req.body.phoneNumber,
        email: req.body.email,
        totalBookings: 1,
        lastBookingDate: new Date()
      });
      await customer.save();
    }

    // Create new booking
    const booking = new Booking({
      fullName: req.body.fullName,
      phoneNumber: req.body.phoneNumber,
      email: req.body.email,
      hotel: req.body.hotel,
      bookingType: req.body.bookingType || 'Airport',
      pickupLocationAddress: req.body.pickupLocationAddress,
      arrivalTime: req.body.arrivalTime,
      numberOfBags: req.body.numberOfBags,
      deviceId: req.body.deviceId,
      isPickedUp: false
    });

    // Save to database
    await booking.save();

    // Populate hotel info for response
    await booking.populate('hotel', 'name address zone');

    // Return response with bookingID and timestamp
    res.status(201).json({
      success: true,
      data: {
        bookingID: booking._id.toString(),
        timestamp: booking.createdAt,
        booking: booking.toJSON(),
        customer: customer.toJSON()
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

    // Handle invalid ObjectId
    if (error.name === 'CastError' && error.kind === 'ObjectId') {
      return res.status(400).json({
        success: false,
        message: 'Invalid hotel ID format'
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
    const bookings = await Booking.find()
      .populate('hotel', 'name address zone')
      .populate('assignedDriver', 'name phone')
      .sort({ createdAt: -1 });

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
    const booking = await Booking.findById(req.params.id)
      .populate('hotel', 'name address zone')
      .populate('assignedDriver', 'name phone');

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

/**
 * Get my bookings by deviceId
 * GET /api/bookings/my-bookings?deviceId=xxx
 */
exports.getMyBookings = async (req, res) => {
  try {
    const { deviceId } = req.query;

    // Validate deviceId
    if (!deviceId || deviceId.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Device ID is required'
      });
    }

    // Find all bookings for this device
    const bookings = await Booking.find({ deviceId: deviceId.trim() })
      .populate('hotel', 'name address zone')
      .populate('assignedDriver', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Error getting my bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bookings',
      error: error.message
    });
  }
};

/**
 * Get assigned bookings for driver
 * GET /api/bookings/driver/assigned
 * Requires driver authentication
 */
exports.getDriverAssignedBookings = async (req, res) => {
  try {
    // req.driver is set by auth middleware
    const driverId = req.driver.id;

    // Find all bookings assigned to this driver with status 'assigned'
    const bookings = await Booking.find({
      assignedDriver: driverId,
      status: 'assigned'
    })
      .populate('hotel', 'name address zone')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Error getting driver assigned bookings:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid driver ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get assigned bookings',
      error: error.message
    });
  }
};

/**
 * Get booking history for driver (picked up and completed bookings)
 * GET /api/bookings/driver/history
 * Requires driver authentication
 */
exports.getDriverHistory = async (req, res) => {
  try {
    // req.driver is set by auth middleware
    const driverId = req.driver.id;

    // Optional pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Find all bookings with status 'in_progress' (picked up) or 'completed'
    const bookings = await Booking.find({
      assignedDriver: driverId,
      status: { $in: ['in_progress', 'completed'] }
    })
      .populate('hotel', 'name address zone')
      .sort({ updatedAt: -1 }) // Sort by most recently updated
      .limit(limit)
      .skip(skip);

    // Get total count for pagination
    const total = await Booking.countDocuments({
      assignedDriver: driverId,
      status: { $in: ['in_progress', 'completed'] }
    });

    res.status(200).json({
      success: true,
      count: bookings.length,
      total,
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      },
      data: bookings
    });
  } catch (error) {
    console.error('Error getting driver booking history:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid driver ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get booking history',
      error: error.message
    });
  }
};

/**
 * Mark booking as picked up
 * PATCH /api/bookings/driver/:id/picked-up
 * Requires driver authentication
 */
exports.markAsPickedUp = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const driverId = req.driver.id;

    // Find booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify that this booking is assigned to the requesting driver
    if (!booking.assignedDriver || booking.assignedDriver.toString() !== driverId) {
      return res.status(403).json({
        success: false,
        message: 'This booking is not assigned to you'
      });
    }

    // Check if booking is in correct status
    if (booking.status !== 'assigned') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as picked up. Current status: ${booking.status}`
      });
    }

    // Update booking using findByIdAndUpdate to avoid re-validation of all fields
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          isPickedUp: true,
          pickedUpAt: new Date(),
          status: 'in_progress'
        }
      },
      { new: true, runValidators: false }
    );

    // Populate and return
    await updatedBooking.populate('hotel', 'name address zone');
    await updatedBooking.populate('assignedDriver', 'name phone');

    // Emit WebSocket event to admin panel
    emitBookingPickedUp(updatedBooking);

    res.status(200).json({
      success: true,
      message: 'Booking marked as picked up successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error marking booking as picked up:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to mark booking as picked up',
      error: error.message
    });
  }
};

/**
 * Mark booking as completed with completion images
 * PATCH /api/bookings/driver/:id/completed
 * Requires driver authentication
 */
exports.markAsCompleted = async (req, res) => {
  try {
    const bookingId = req.params.id;
    const driverId = req.driver.id;

    // Find booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Verify that this booking is assigned to the requesting driver
    if (!booking.assignedDriver || booking.assignedDriver.toString() !== driverId) {
      return res.status(403).json({
        success: false,
        message: 'This booking is not assigned to you'
      });
    }

    // Check if booking is in correct status
    if (booking.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: `Cannot mark as completed. Current status: ${booking.status}. Please mark as picked up first.`
      });
    }

    // Get uploaded images from multer and convert to relative URL paths
    const images = req.files ? req.files.map(file => {
      // Convert absolute path to relative URL path
      // From: /Users/.../booking-backend/uploads/completion-images/filename.jpg
      // To: uploads/completion-images/filename.jpg
      const relativePath = file.path.split('uploads/').pop();
      return `uploads/${relativePath}`;
    }) : [];

    // Update booking using findByIdAndUpdate to avoid re-validation of all fields
    const updatedBooking = await Booking.findByIdAndUpdate(
      bookingId,
      {
        $set: {
          status: 'completed',
          completedAt: new Date(),
          completionImages: images
        }
      },
      { new: true, runValidators: false }
    );

    // Populate and return
    await updatedBooking.populate('hotel', 'name address zone');
    await updatedBooking.populate('assignedDriver', 'name phone');

    // Emit WebSocket event to admin panel
    emitBookingCompleted(updatedBooking);

    res.status(200).json({
      success: true,
      message: 'Booking marked as completed successfully',
      data: updatedBooking
    });
  } catch (error) {
    console.error('Error marking booking as completed:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to mark booking as completed',
      error: error.message
    });
  }
};

/**
 * Edit booking (customer only - before confirmation)
 * PATCH /api/booking/:id/edit
 */
exports.editBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Find booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking has already been confirmed
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit booking. Only pending bookings can be edited.',
        currentStatus: booking.status
      });
    }

    // Prepare update data
    const updateData = {};
    const allowedFields = [
      'fullName',
      'phoneNumber',
      'email',
      'hotel',
      'bookingType',
      'pickupLocationAddress',
      'arrivalTime',
      'numberOfBags'
    ];

    // Only update fields that are provided in request body
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // If no fields to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update'
      });
    }

    // Validate the update data
    const validation = Booking.validateBooking({
      ...booking.toObject(),
      ...updateData
    });

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // If hotel is being changed, verify it exists and is active
    if (updateData.hotel && updateData.hotel !== booking.hotel.toString()) {
      const hotel = await Hotel.findById(updateData.hotel);
      if (!hotel) {
        return res.status(404).json({
          success: false,
          message: 'Hotel not found'
        });
      }

      if (!hotel.isActive) {
        return res.status(400).json({
          success: false,
          message: 'Hotel is not active'
        });
      }
    }

    // Update booking
    Object.assign(booking, updateData);
    await booking.save();

    // If phone number changed, update customer record
    if (updateData.phoneNumber && updateData.phoneNumber !== booking.phoneNumber) {
      let customer = await Customer.findOne({ phoneNumber: updateData.phoneNumber });

      if (customer) {
        customer.fullName = updateData.fullName || booking.fullName;
        if (updateData.email) {
          customer.email = updateData.email;
        }
        await customer.save();
      } else {
        customer = new Customer({
          fullName: updateData.fullName || booking.fullName,
          phoneNumber: updateData.phoneNumber,
          email: updateData.email || booking.email,
          totalBookings: 1,
          lastBookingDate: new Date()
        });
        await customer.save();
      }
    } else if (updateData.fullName || updateData.email) {
      // Update existing customer info if name or email changed
      const customer = await Customer.findOne({ phoneNumber: booking.phoneNumber });
      if (customer) {
        if (updateData.fullName) {
          customer.fullName = updateData.fullName;
        }
        if (updateData.email) {
          customer.email = updateData.email;
        }
        await customer.save();
      }
    }

    // Populate hotel info for response
    await booking.populate('hotel', 'name address zone');

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error editing booking:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        errors
      });
    }

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking or hotel ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to edit booking',
      error: error.message
    });
  }
};

/**
 * Cancel booking (customer only - before confirmation)
 * PATCH /api/booking/:id/cancel
 */
exports.cancelBooking = async (req, res) => {
  try {
    const bookingId = req.params.id;

    // Find booking
    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking has already been confirmed
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking. Only pending bookings can be cancelled.',
        currentStatus: booking.status
      });
    }

    // Update booking status to cancelled
    booking.status = 'cancelled';
    await booking.save();

    // Populate hotel info for response
    await booking.populate('hotel', 'name address zone');

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to cancel booking',
      error: error.message
    });
  }
};
