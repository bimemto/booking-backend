const Driver = require('../models/Driver');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { isValidPhone } = require('../utils/phoneValidator');

/**
 * Register a new driver
 * POST /api/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { name, phone, driverLicenseNumber, vehicleInfo, password, fcmToken } = req.body;

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
      fcmToken: fcmToken || null
    });

    // Save to database
    await driver.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        id: driver._id.toString(),
        phone: driver.phone,
        name: driver.name
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '30d' }
    );

    // Return response
    res.status(201).json({
      success: true,
      message: 'Driver registered successfully',
      data: {
        driver: driver.toJSON(),
        token
      }
    });
  } catch (error) {
    console.error('Error registering driver:', error);

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        errors
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} is already registered`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to register driver',
      error: error.message
    });
  }
};

/**
 * Login driver
 * POST /api/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    // Validate input
    if (!phone || !password) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and password are required'
      });
    }

    // Validate phone format
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format'
      });
    }

    // Find driver by phone (need to include password for comparison)
    const driver = await Driver.findOne({ phone }).select('+password');

    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    // Check if account is active
    if (!driver.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated'
      });
    }

    // Compare password
    const isPasswordMatch = await bcrypt.compare(password, driver.password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid phone number or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: driver._id.toString(),
        phone: driver.phone,
        name: driver.name
      },
      process.env.JWT_SECRET || 'your-secret-key-change-this',
      { expiresIn: '30d' }
    );

    // Remove password from driver object
    const driverData = driver.toObject();
    delete driverData.password;

    // Return response
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        driver: {
          id: driver._id.toString(),
          name: driver.name,
          phone: driver.phone,
          driverLicenseNumber: driver.driverLicenseNumber,
          vehicleInfo: driver.vehicleInfo,
          isActive: driver.isActive,
          isVerified: driver.isVerified,
          createdAt: driver.createdAt,
          updatedAt: driver.updatedAt
        },
        token
      }
    });
  } catch (error) {
    console.error('Error logging in driver:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to login',
      error: error.message
    });
  }
};

/**
 * Get current driver profile
 * GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.id);

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
    console.error('Error getting driver profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver profile',
      error: error.message
    });
  }
};

/**
 * Update FCM token
 * POST /api/auth/fcm-token
 */
exports.updateFcmToken = async (req, res) => {
  try {
    const { fcmToken } = req.body;

    // Validate fcmToken
    if (!fcmToken || typeof fcmToken !== 'string' || fcmToken.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'FCM token is required'
      });
    }

    // Update driver's FCM token
    const driver = await Driver.findByIdAndUpdate(
      req.driver.id,
      { fcmToken: fcmToken.trim() },
      { new: true, runValidators: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'FCM token updated successfully',
      data: {
        fcmToken: driver.fcmToken
      }
    });
  } catch (error) {
    console.error('Error updating FCM token:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update FCM token',
      error: error.message
    });
  }
};

/**
 * Logout driver
 * POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  try {
    // Remove FCM token from driver's account
    const driver = await Driver.findByIdAndUpdate(
      req.driver.id,
      { fcmToken: null },
      { new: true, runValidators: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error logging out driver:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to logout',
      error: error.message
    });
  }
};
