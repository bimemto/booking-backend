const Driver = require('../models/Driver');
const bcrypt = require('bcryptjs');
const { sendDriverVerificationNotification } = require('../services/notificationService');

/**
 * Get all drivers with filters
 * GET /api/admin/drivers
 */
exports.getAllDrivers = async (req, res) => {
  try {
    const { isActive, isVerified, search, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (isVerified !== undefined) {
      filter.isVerified = isVerified === 'true';
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { driverLicenseNumber: { $regex: search, $options: 'i' } },
        { 'vehicleInfo.licensePlate': { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get drivers
    const drivers = await Driver.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const total = await Driver.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        drivers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting drivers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get drivers',
      error: error.message
    });
  }
};

/**
 * Get available drivers for booking assignment
 * GET /api/admin/drivers/available
 */
exports.getAvailableDrivers = async (req, res) => {
  try {
    // Get only active and verified drivers
    const drivers = await Driver.find({
      isActive: true,
      isVerified: true
    })
      .select('name phone driverLicenseNumber vehicleInfo')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: drivers
    });
  } catch (error) {
    console.error('Error getting available drivers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available drivers',
      error: error.message
    });
  }
};

/**
 * Get driver statistics
 * GET /api/admin/drivers/stats
 */
exports.getDriverStats = async (req, res) => {
  try {
    const [
      totalDrivers,
      activeDrivers,
      inactiveDrivers,
      verifiedDrivers,
      unverifiedDrivers
    ] = await Promise.all([
      Driver.countDocuments(),
      Driver.countDocuments({ isActive: true }),
      Driver.countDocuments({ isActive: false }),
      Driver.countDocuments({ isVerified: true }),
      Driver.countDocuments({ isVerified: false })
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalDrivers,
        active: activeDrivers,
        inactive: inactiveDrivers,
        verified: verifiedDrivers,
        unverified: unverifiedDrivers
      }
    });
  } catch (error) {
    console.error('Error getting driver stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver statistics',
      error: error.message
    });
  }
};

/**
 * Get driver by ID
 * GET /api/admin/drivers/:id
 */
exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Error getting driver:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid driver ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get driver',
      error: error.message
    });
  }
};

/**
 * Create new driver
 * POST /api/admin/drivers
 */
exports.createDriver = async (req, res) => {
  try {
    const { name, phone, driverLicenseNumber, vehicleInfo, password } = req.body;

    // Validate request body
    const validation = Driver.validateDriverRegistration(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Check if driver already exists with phone
    const existingDriverByPhone = await Driver.findOne({ phone });
    if (existingDriverByPhone) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is already registered'
      });
    }

    // Check if driver already exists with license number
    const existingDriverByLicense = await Driver.findOne({ driverLicenseNumber });
    if (existingDriverByLicense) {
      return res.status(400).json({
        success: false,
        message: 'Driver license number is already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new driver
    const driver = new Driver({
      name,
      phone,
      driverLicenseNumber,
      vehicleInfo,
      password: hashedPassword,
      isVerified: req.body.isVerified || false
    });

    await driver.save();

    res.status(201).json({
      success: true,
      message: 'Driver created successfully',
      data: driver
    });
  } catch (error) {
    console.error('Error creating driver:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        errors
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} is already registered`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create driver',
      error: error.message
    });
  }
};

/**
 * Update driver
 * PATCH /api/admin/drivers/:id
 */
exports.updateDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const { name, phone, driverLicenseNumber, vehicleInfo, password } = req.body;

    // Check if phone is being updated and already exists
    if (phone && phone !== driver.phone) {
      const existingDriver = await Driver.findOne({ phone });
      if (existingDriver) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is already registered'
        });
      }
      driver.phone = phone;
    }

    // Check if license number is being updated and already exists
    if (driverLicenseNumber && driverLicenseNumber !== driver.driverLicenseNumber) {
      const existingDriver = await Driver.findOne({ driverLicenseNumber });
      if (existingDriver) {
        return res.status(400).json({
          success: false,
          message: 'Driver license number is already registered'
        });
      }
      driver.driverLicenseNumber = driverLicenseNumber;
    }

    // Update other fields
    if (name) driver.name = name;
    if (vehicleInfo) driver.vehicleInfo = vehicleInfo;

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      const salt = await bcrypt.genSalt(10);
      driver.password = await bcrypt.hash(password, salt);
    }

    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Driver updated successfully',
      data: driver
    });
  } catch (error) {
    console.error('Error updating driver:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid driver ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update driver',
      error: error.message
    });
  }
};

/**
 * Toggle driver active status
 * PATCH /api/admin/drivers/:id/toggle-active
 */
exports.toggleDriverActive = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    driver.isActive = !driver.isActive;
    await driver.save();

    res.status(200).json({
      success: true,
      message: `Driver ${driver.isActive ? 'activated' : 'deactivated'} successfully`,
      data: driver
    });
  } catch (error) {
    console.error('Error toggling driver status:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid driver ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to toggle driver status',
      error: error.message
    });
  }
};

/**
 * Verify driver
 * PATCH /api/admin/drivers/:id/verify
 */
exports.verifyDriver = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    driver.isVerified = true;
    await driver.save();

    // Send push notification if FCM token is available
    if (driver.fcmToken) {
      await sendDriverVerificationNotification(driver.fcmToken, driver.name);
    }

    res.status(200).json({
      success: true,
      message: 'Driver verified successfully',
      data: driver
    });
  } catch (error) {
    console.error('Error verifying driver:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid driver ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to verify driver',
      error: error.message
    });
  }
};

/**
 * Delete driver
 * DELETE /api/admin/drivers/:id
 */
exports.deleteDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Driver deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting driver:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid driver ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete driver',
      error: error.message
    });
  }
};
