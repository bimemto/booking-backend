const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');
const Admin = require('../models/Admin');

/**
 * Auth middleware to protect routes
 * Verifies JWT token and attaches driver info to request
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Please login.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');

      // Check if driver exists
      const driver = await Driver.findById(decoded.id);

      if (!driver) {
        return res.status(401).json({
          success: false,
          message: 'Driver not found'
        });
      }

      // Check if driver is active
      if (!driver.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account has been deactivated'
        });
      }

      // Attach driver to request
      req.driver = {
        id: driver._id.toString(),
        name: driver.name,
        phone: driver.phone
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route. Invalid token.'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

/**
 * Admin Auth middleware to protect admin routes
 * Verifies JWT token and attaches admin info to request
 */
exports.authenticateAdmin = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Admin authentication required.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-this');

      // Check if admin exists
      const admin = await Admin.findById(decoded.id).select('-password');

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Admin not found'
        });
      }

      // Check if admin is active
      if (!admin.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your admin account has been deactivated'
        });
      }

      // Attach admin to request
      req.admin = {
        id: admin._id.toString(),
        name: admin.name,
        email: admin.email,
        role: admin.role
      };

      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized. Invalid token.'
      });
    }
  } catch (error) {
    console.error('Admin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};
