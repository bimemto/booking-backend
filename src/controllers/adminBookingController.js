const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const { isValidPhone } = require('../utils/phoneValidator');

/**
 * Get all bookings with filters
 * GET /api/admin/bookings
 */
exports.getAllBookings = async (req, res) => {
  try {
    const { status, startDate, endDate, search, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate);
      }
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get bookings with populated driver and hotel info
    const bookings = await Booking.find(filter)
      .populate('hotel', 'name address zone')
      .populate('assignedDriver', 'name phone vehicleInfo')
      .populate('confirmedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        bookings,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
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
 * Get booking statistics
 * GET /api/admin/bookings/stats
 */
exports.getBookingStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.$lte = new Date(endDate);
      }
    }

    // Get statistics
    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      assignedBookings,
      inProgressBookings,
      completedBookings,
      cancelledBookings
    ] = await Promise.all([
      Booking.countDocuments(dateFilter),
      Booking.countDocuments({ ...dateFilter, status: 'pending' }),
      Booking.countDocuments({ ...dateFilter, status: 'confirmed' }),
      Booking.countDocuments({ ...dateFilter, status: 'assigned' }),
      Booking.countDocuments({ ...dateFilter, status: 'in_progress' }),
      Booking.countDocuments({ ...dateFilter, status: 'completed' }),
      Booking.countDocuments({ ...dateFilter, status: 'cancelled' })
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalBookings,
        byStatus: {
          pending: pendingBookings,
          confirmed: confirmedBookings,
          assigned: assignedBookings,
          in_progress: inProgressBookings,
          completed: completedBookings,
          cancelled: cancelledBookings
        }
      }
    });
  } catch (error) {
    console.error('Error getting booking stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking statistics',
      error: error.message
    });
  }
};

/**
 * Get booking by ID
 * GET /api/admin/bookings/:id
 */
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('hotel', 'name address zone')
      .populate('assignedDriver', 'name phone driverLicenseNumber vehicleInfo')
      .populate('confirmedBy', 'name email role');

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

    // Handle invalid ObjectId
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get booking',
      error: error.message
    });
  }
};

/**
 * Confirm booking
 * PATCH /api/admin/bookings/:id/confirm
 */
exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if already confirmed
    if (booking.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status}`
      });
    }

    // Update booking
    booking.status = 'confirmed';
    booking.confirmedBy = req.admin.id;
    booking.confirmedAt = new Date();

    await booking.save();

    // Populate before sending response
    await booking.populate('hotel', 'name address zone');
    await booking.populate('confirmedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Booking confirmed successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error confirming booking:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to confirm booking',
      error: error.message
    });
  }
};

/**
 * Assign driver to booking
 * PATCH /api/admin/bookings/:id/assign-driver
 */
exports.assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required'
      });
    }

    // Check if driver exists and is active
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (!driver.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Driver is not active'
      });
    }

    // Get booking
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update booking
    booking.assignedDriver = driverId;
    booking.status = 'assigned';

    await booking.save();

    // Populate before sending response
    await booking.populate('hotel', 'name address zone');
    await booking.populate('assignedDriver', 'name phone vehicleInfo');
    await booking.populate('confirmedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Driver assigned successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error assigning driver:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking or driver ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to assign driver',
      error: error.message
    });
  }
};

/**
 * Update booking status
 * PATCH /api/admin/bookings/:id/status
 */
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update status
    booking.status = status;

    // Update isPickedUp for completed status
    if (status === 'completed') {
      booking.isPickedUp = true;
    }

    await booking.save();

    // Populate before sending response
    await booking.populate('hotel', 'name address zone');
    await booking.populate('assignedDriver', 'name phone vehicleInfo');
    await booking.populate('confirmedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update booking status',
      error: error.message
    });
  }
};

/**
 * Update booking notes
 * PATCH /api/admin/bookings/:id/notes
 */
exports.updateBookingNotes = async (req, res) => {
  try {
    const { notes } = req.body;

    if (notes === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Notes field is required'
      });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Update notes
    booking.notes = notes;
    await booking.save();

    // Populate before sending response
    await booking.populate('hotel', 'name address zone');
    await booking.populate('assignedDriver', 'name phone vehicleInfo');
    await booking.populate('confirmedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Booking notes updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking notes:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update booking notes',
      error: error.message
    });
  }
};

/**
 * Update booking (comprehensive update)
 * PUT /api/admin/bookings/:id
 */
exports.updateBooking = async (req, res) => {
  try {
    const {
      fullName,
      phoneNumber,
      hotel,
      bookingType,
      pickupLocationAddress,
      arrivalTime,
      numberOfBags,
      status,
      assignedDriver,
      notes
    } = req.body;

    // Get existing booking
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Validation errors array
    const errors = [];

    // Validate phone number if provided
    if (phoneNumber !== undefined) {
      if (!isValidPhone(phoneNumber)) {
        errors.push('Invalid phone number format');
      }
    }

    // Validate bookingType if provided
    if (bookingType !== undefined) {
      if (!['Airport', 'Other'].includes(bookingType)) {
        errors.push('Booking type must be either "Airport" or "Other"');
      }
    }

    // Validate conditional fields based on bookingType
    const finalBookingType = bookingType !== undefined ? bookingType : booking.bookingType;
    if (finalBookingType === 'Airport') {
      if (arrivalTime === undefined && !booking.arrivalTime) {
        errors.push('Arrival time is required for Airport bookings');
      }
    } else if (finalBookingType === 'Other') {
      if (pickupLocationAddress === undefined && !booking.pickupLocationAddress) {
        errors.push('Pickup location address is required for Other bookings');
      }
    }

    // Validate numberOfBags if provided
    if (numberOfBags !== undefined) {
      const bags = parseInt(numberOfBags);
      if (isNaN(bags) || bags < 1 || bags > 5) {
        errors.push('Number of bags must be between 1 and 5');
      }
    }

    // Validate status if provided
    if (status !== undefined) {
      const validStatuses = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
    }

    // Validate assignedDriver if provided
    if (assignedDriver !== undefined && assignedDriver !== null) {
      const driver = await Driver.findById(assignedDriver);
      if (!driver) {
        errors.push('Driver not found');
      } else if (!driver.isActive) {
        errors.push('Driver is not active');
      }
    }

    // Return validation errors if any
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Update fields if provided
    if (fullName !== undefined) booking.fullName = fullName;
    if (phoneNumber !== undefined) booking.phoneNumber = phoneNumber;
    if (hotel !== undefined) booking.hotel = hotel;
    if (bookingType !== undefined) booking.bookingType = bookingType;
    if (pickupLocationAddress !== undefined) booking.pickupLocationAddress = pickupLocationAddress;
    if (arrivalTime !== undefined) booking.arrivalTime = arrivalTime;
    if (numberOfBags !== undefined) booking.numberOfBags = numberOfBags;
    if (status !== undefined) {
      booking.status = status;
      // Update isPickedUp for completed status
      if (status === 'completed') {
        booking.isPickedUp = true;
      }
    }
    if (assignedDriver !== undefined) {
      booking.assignedDriver = assignedDriver;
      // Auto-update status to 'assigned' if driver is assigned and current status is pending or confirmed
      if (assignedDriver && (booking.status === 'pending' || booking.status === 'confirmed')) {
        booking.status = 'assigned';
      }
    }
    if (notes !== undefined) booking.notes = notes;

    // Save the updated booking (only validate modified fields)
    await booking.save({ validateModifiedOnly: true });

    // Populate before sending response
    await booking.populate('hotel', 'name address zone');
    await booking.populate('assignedDriver', 'name phone driverLicenseNumber vehicleInfo');
    await booking.populate('confirmedBy', 'name email');

    res.status(200).json({
      success: true,
      message: 'Booking updated successfully',
      data: booking
    });
  } catch (error) {
    console.error('Error updating booking:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking, hotel, or driver ID'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update booking',
      error: error.message
    });
  }
};
