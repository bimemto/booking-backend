const Admin = require('../models/Admin');
const bcrypt = require('bcryptjs');

/**
 * Get all admin users with filters
 * GET /api/admin/users
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const { isActive, role, search, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get admins
    const admins = await Admin.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const total = await Admin.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        admins,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting admins:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admin users',
      error: error.message
    });
  }
};

/**
 * Get admin user by ID
 * GET /api/admin/users/:id
 */
exports.getAdminById = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    res.status(200).json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Error getting admin:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get admin user',
      error: error.message
    });
  }
};

/**
 * Create new admin user
 * POST /api/admin/users
 */
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Check if admin already exists with this email
    const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new admin
    const admin = new Admin({
      name: name || email.split('@')[0], // Use email prefix as default name
      email: email.toLowerCase(),
      password: hashedPassword,
      role: role || 'admin'
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: admin
    });
  } catch (error) {
    console.error('Error creating admin:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        errors
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
};

/**
 * Update admin user
 * PATCH /api/admin/users/:id
 */
exports.updateAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    const { name, email, password, role, isActive } = req.body;

    // Check if email is being updated and already exists
    if (email && email.toLowerCase() !== admin.email) {
      const emailRegex = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid email format'
        });
      }

      const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
      admin.email = email.toLowerCase();
    }

    // Update other fields
    if (name !== undefined) admin.name = name;
    if (role !== undefined) admin.role = role;
    if (isActive !== undefined) admin.isActive = isActive;

    // Update password if provided
    if (password) {
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters'
        });
      }
      const salt = await bcrypt.genSalt(10);
      admin.password = await bcrypt.hash(password, salt);
    }

    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Admin user updated successfully',
      data: admin
    });
  } catch (error) {
    console.error('Error updating admin:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update admin user',
      error: error.message
    });
  }
};

/**
 * Toggle admin active status
 * PATCH /api/admin/users/:id/toggle-active
 */
exports.toggleAdminActive = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    // Prevent deactivating yourself
    if (req.admin.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    admin.isActive = !admin.isActive;
    await admin.save({ validateModifiedOnly: true });

    res.status(200).json({
      success: true,
      message: `Admin user ${admin.isActive ? 'activated' : 'deactivated'} successfully`,
      data: admin
    });
  } catch (error) {
    console.error('Error toggling admin status:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to toggle admin status',
      error: error.message
    });
  }
};

/**
 * Delete admin user
 * DELETE /api/admin/users/:id
 */
exports.deleteAdmin = async (req, res) => {
  try {
    // Prevent deleting yourself
    if (req.admin.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    const admin = await Admin.findByIdAndDelete(req.params.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin user not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Admin user deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete admin user',
      error: error.message
    });
  }
};
