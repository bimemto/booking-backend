# ADMIN PANEL - TECHNICAL SPECIFICATION & IMPLEMENTATION GUIDE

## 📋 TABLE OF CONTENTS
1. [Project Overview](#project-overview)
2. [System Architecture](#system-architecture)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [API Documentation](#api-documentation)
6. [Implementation Steps](#implementation-steps)
7. [Code Examples](#code-examples)

---

## 📌 PROJECT OVERVIEW

### Business Requirements
Build an Admin Panel web application (separate repository) to manage:
- **Customers**: View customer list and their booking history
- **Drivers**: Full CRUD operations, activate/deactivate, verify drivers
- **Bookings**: Confirm bookings manually, assign drivers, track pickup/delivery status
- **Support**: Handle customer support, add notes, track issues

### Technical Goals
- Separate frontend repository (React-based admin dashboard)
- Extend existing backend with admin-specific APIs
- Role-based access control (super_admin, admin, support)
- Real-time status tracking
- Responsive and user-friendly interface

---

## 🏗️ SYSTEM ARCHITECTURE

### Tech Stack

#### Backend (Extend existing booking-backend)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Existing Dependencies**: Already installed

#### Frontend (New Repository: booking-admin-panel)
- **Framework**: React 18 + Vite
- **UI Library**: Ant Design (antd) - recommended for admin dashboards
- **State Management**:
  - Zustand (auth state)
  - TanStack Query / React Query (server state)
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Form Handling**: React Hook Form + Zod
- **Date Handling**: dayjs
- **Notifications**: react-hot-toast

### Architecture Diagram
```
┌─────────────────────────────────────────────────────────────┐
│                     ADMIN PANEL (React)                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Bookings  │  │ Drivers  │  │Customers │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                           │                                  │
│                           │ HTTP/REST API                    │
│                           ▼                                  │
│              ┌─────────────────────────┐                    │
│              │   JWT Authentication    │                    │
│              └─────────────────────────┘                    │
└──────────────────────────│──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              BACKEND API (Express + MongoDB)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Admin Routes (/api/admin/*)                         │  │
│  │  - Authentication                                    │  │
│  │  - Booking Management (confirm, assign, track)      │  │
│  │  - Driver Management (CRUD, verify, activate)       │  │
│  │  - Customer Management (view, history)              │  │
│  └──────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         MongoDB Collections                          │  │
│  │  - admins (new)                                      │  │
│  │  - bookings (updated with new fields)               │  │
│  │  - drivers (existing)                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 BACKEND IMPLEMENTATION

### 1. Database Schema Updates

#### 1.1 Admin Model (NEW)
**File**: `src/models/Admin.js`

```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    validate: {
      validator: function(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'support'],
    default: 'admin'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    }
  }
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
```

#### 1.2 Update Booking Model
**File**: `src/models/Booking.js`

Add these fields to the existing schema:

```javascript
// ADD THESE FIELDS TO EXISTING bookingSchema

status: {
  type: String,
  enum: ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'],
  default: 'pending'
},
assignedDriver: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Driver',
  default: null
},
confirmedBy: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'Admin',
  default: null
},
confirmedAt: {
  type: Date,
  default: null
},
assignedAt: {
  type: Date,
  default: null
},
pickupTime: {
  type: Date,
  default: null
},
deliveryTime: {
  type: Date,
  default: null
},
completedAt: {
  type: Date,
  default: null
},
adminNotes: {
  type: String,
  default: '',
  trim: true
},
customerNotes: {
  type: String,
  default: '',
  trim: true
}
```

#### 1.3 Constants
**File**: `src/utils/constants.js`

```javascript
module.exports = {
  BOOKING_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
  },

  ADMIN_ROLES: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    SUPPORT: 'support'
  },

  STATUS_FLOW: {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['assigned', 'cancelled'],
    assigned: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: []
  }
};
```

### 2. Middleware

#### 2.1 Admin Authentication Middleware
**File**: `src/middleware/adminAuth.js`

```javascript
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.adminAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get admin from database
    const admin = await Admin.findById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated'
      });
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    console.error('Auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};
```

#### 2.2 Role Check Middleware
**File**: `src/middleware/roleCheck.js`

```javascript
exports.roleCheck = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};
```

### 3. Controllers

#### 3.1 Admin Auth Controller
**File**: `src/controllers/adminAuthController.js`

```javascript
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Login admin
// @route   POST /api/admin/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find admin
    const admin = await Admin.findOne({ email }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Admin account is deactivated'
      });
    }

    // Generate token
    const token = generateToken(admin._id);

    res.status(200).json({
      success: true,
      data: {
        token,
        admin: admin.toJSON()
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// @desc    Register new admin (super_admin only)
// @route   POST /api/admin/auth/register
// @access  Private (super_admin)
exports.register = async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Create admin
    const admin = await Admin.create({
      email,
      password,
      name,
      role: role || 'admin'
    });

    res.status(201).json({
      success: true,
      data: admin
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// @desc    Get current admin profile
// @route   GET /api/admin/auth/me
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: req.admin
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
      error: error.message
    });
  }
};
```

#### 3.2 Admin Booking Controller
**File**: `src/controllers/adminBookingController.js`

```javascript
const Booking = require('../models/Booking');
const Driver = require('../models/Driver');
const { BOOKING_STATUS, STATUS_FLOW } = require('../utils/constants');

// @desc    Get all bookings with filters
// @route   GET /api/admin/bookings
// @access  Private
exports.getAllBookings = async (req, res) => {
  try {
    const { status, assignedDriver, dateFrom, dateTo, search, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};

    if (status) {
      query.status = status;
    }

    if (assignedDriver) {
      query.assignedDriver = assignedDriver;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { hotel: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [bookings, total] = await Promise.all([
      Booking.find(query)
        .populate('assignedDriver', 'name phone vehicleInfo')
        .populate('confirmedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Booking.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: bookings,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bookings',
      error: error.message
    });
  }
};

// @desc    Get booking by ID
// @route   GET /api/admin/bookings/:id
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('assignedDriver', 'name phone driverLicenseNumber vehicleInfo')
      .populate('confirmedBy', 'name email');

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
    console.error('Get booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get booking',
      error: error.message
    });
  }
};

// @desc    Confirm booking
// @route   PATCH /api/admin/bookings/:id/confirm
// @access  Private
exports.confirmBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Check if booking can be confirmed
    if (booking.status !== BOOKING_STATUS.PENDING) {
      return res.status(400).json({
        success: false,
        message: `Cannot confirm booking with status: ${booking.status}`
      });
    }

    // Update booking
    booking.status = BOOKING_STATUS.CONFIRMED;
    booking.confirmedBy = req.admin._id;
    booking.confirmedAt = new Date();

    await booking.save();

    // Populate references
    await booking.populate('confirmedBy', 'name email');

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm booking',
      error: error.message
    });
  }
};

// @desc    Assign driver to booking
// @route   PATCH /api/admin/bookings/:id/assign-driver
// @access  Private
exports.assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID is required'
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

    // Check booking status
    if (booking.status !== BOOKING_STATUS.CONFIRMED) {
      return res.status(400).json({
        success: false,
        message: 'Booking must be confirmed before assigning driver'
      });
    }

    // Check if driver exists and is available
    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    if (!driver.isActive || !driver.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Driver is not available (inactive or not verified)'
      });
    }

    // Check if driver has active bookings
    const activeBooking = await Booking.findOne({
      assignedDriver: driverId,
      status: { $in: [BOOKING_STATUS.ASSIGNED, BOOKING_STATUS.IN_PROGRESS] }
    });

    if (activeBooking) {
      return res.status(400).json({
        success: false,
        message: 'Driver is already assigned to an active booking'
      });
    }

    // Assign driver
    booking.assignedDriver = driverId;
    booking.status = BOOKING_STATUS.ASSIGNED;
    booking.assignedAt = new Date();

    await booking.save();

    // Populate references
    await booking.populate('assignedDriver', 'name phone vehicleInfo');
    await booking.populate('confirmedBy', 'name email');

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Assign driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign driver',
      error: error.message
    });
  }
};

// @desc    Update booking status
// @route   PATCH /api/admin/bookings/:id/status
// @access  Private
exports.updateBookingStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    // Validate status transition
    const allowedStatuses = STATUS_FLOW[booking.status];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot change status from ${booking.status} to ${status}`
      });
    }

    // Update status
    booking.status = status;

    // Update timestamps based on status
    if (status === BOOKING_STATUS.IN_PROGRESS && !booking.pickupTime) {
      booking.pickupTime = new Date();
    } else if (status === BOOKING_STATUS.COMPLETED) {
      booking.completedAt = new Date();
      if (!booking.deliveryTime) {
        booking.deliveryTime = new Date();
      }
    }

    await booking.save();

    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

// @desc    Update admin notes
// @route   PATCH /api/admin/bookings/:id/notes
// @access  Private
exports.updateAdminNotes = async (req, res) => {
  try {
    const { notes } = req.body;

    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { adminNotes: notes },
      { new: true, runValidators: true }
    );

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
    console.error('Update notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notes',
      error: error.message
    });
  }
};

// @desc    Get booking statistics
// @route   GET /api/admin/bookings/stats
// @access  Private
exports.getBookingStats = async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayBookings = await Booking.countDocuments({
      createdAt: { $gte: today }
    });

    // Pending confirmations
    const pendingCount = await Booking.countDocuments({
      status: BOOKING_STATUS.PENDING
    });

    // Format stats
    const statusCounts = {};
    Object.values(BOOKING_STATUS).forEach(status => {
      statusCounts[status] = 0;
    });

    stats.forEach(stat => {
      statusCounts[stat._id] = stat.count;
    });

    res.status(200).json({
      success: true,
      data: {
        byStatus: statusCounts,
        todayBookings,
        pendingConfirmations: pendingCount
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics',
      error: error.message
    });
  }
};
```

#### 3.3 Admin Driver Controller
**File**: `src/controllers/adminDriverController.js`

```javascript
const Driver = require('../models/Driver');
const Booking = require('../models/Booking');
const bcrypt = require('bcryptjs');

// @desc    Get all drivers
// @route   GET /api/admin/drivers
// @access  Private
exports.getAllDrivers = async (req, res) => {
  try {
    const { isActive, isVerified, search, page = 1, limit = 20 } = req.query;

    // Build query
    const query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { driverLicenseNumber: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [drivers, total] = await Promise.all([
      Driver.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Driver.countDocuments(query)
    ]);

    res.status(200).json({
      success: true,
      data: drivers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get drivers',
      error: error.message
    });
  }
};

// @desc    Get driver by ID
// @route   GET /api/admin/drivers/:id
// @access  Private
exports.getDriverById = async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Get driver's bookings
    const bookings = await Booking.find({ assignedDriver: req.params.id })
      .sort({ createdAt: -1 })
      .limit(10);

    // Get stats
    const stats = {
      totalBookings: await Booking.countDocuments({ assignedDriver: req.params.id }),
      completedBookings: await Booking.countDocuments({
        assignedDriver: req.params.id,
        status: 'completed'
      }),
      activeBookings: await Booking.countDocuments({
        assignedDriver: req.params.id,
        status: { $in: ['assigned', 'in_progress'] }
      })
    };

    res.status(200).json({
      success: true,
      data: {
        driver,
        recentBookings: bookings,
        stats
      }
    });
  } catch (error) {
    console.error('Get driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get driver',
      error: error.message
    });
  }
};

// @desc    Get available drivers
// @route   GET /api/admin/drivers/available
// @access  Private
exports.getAvailableDrivers = async (req, res) => {
  try {
    // Find active and verified drivers
    const activeDrivers = await Driver.find({
      isActive: true,
      isVerified: true
    });

    // Get drivers with active bookings
    const busyDriverIds = await Booking.distinct('assignedDriver', {
      status: { $in: ['assigned', 'in_progress'] }
    });

    // Filter out busy drivers
    const availableDrivers = activeDrivers.filter(
      driver => !busyDriverIds.some(id => id.equals(driver._id))
    );

    res.status(200).json({
      success: true,
      data: availableDrivers
    });
  } catch (error) {
    console.error('Get available drivers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get available drivers',
      error: error.message
    });
  }
};

// @desc    Create new driver
// @route   POST /api/admin/drivers
// @access  Private
exports.createDriver = async (req, res) => {
  try {
    const validation = Driver.validateDriverRegistration(req.body);

    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(req.body.password, 10);

    const driver = await Driver.create({
      ...req.body,
      password: hashedPassword
    });

    res.status(201).json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Create driver error:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Phone number or driver license number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create driver',
      error: error.message
    });
  }
};

// @desc    Update driver
// @route   PATCH /api/admin/drivers/:id
// @access  Private
exports.updateDriver = async (req, res) => {
  try {
    const { password, ...updateData } = req.body;

    // If password is being updated, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      updateData,
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
      data: driver
    });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update driver',
      error: error.message
    });
  }
};

// @desc    Verify driver
// @route   PATCH /api/admin/drivers/:id/verify
// @access  Private
exports.verifyDriver = async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(
      req.params.id,
      { isVerified: true },
      { new: true }
    );

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
    console.error('Verify driver error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify driver',
      error: error.message
    });
  }
};

// @desc    Toggle driver active status
// @route   PATCH /api/admin/drivers/:id/toggle-active
// @access  Private
exports.toggleDriverStatus = async (req, res) => {
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
      data: driver
    });
  } catch (error) {
    console.error('Toggle driver status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle driver status',
      error: error.message
    });
  }
};
```

#### 3.4 Admin Customer Controller
**File**: `src/controllers/adminCustomerController.js`

```javascript
const Booking = require('../models/Booking');

// @desc    Get all customers
// @route   GET /api/admin/customers
// @access  Private
exports.getAllCustomers = async (req, res) => {
  try {
    // Aggregate customers by phone number
    const customers = await Booking.aggregate([
      {
        $group: {
          _id: '$phoneNumber',
          fullName: { $last: '$fullName' },
          totalBookings: { $sum: 1 },
          lastBookingDate: { $max: '$createdAt' },
          firstBookingDate: { $min: '$createdAt' }
        }
      },
      {
        $project: {
          _id: 0,
          phoneNumber: '$_id',
          fullName: 1,
          totalBookings: 1,
          lastBookingDate: 1,
          firstBookingDate: 1
        }
      },
      {
        $sort: { lastBookingDate: -1 }
      }
    ]);

    res.status(200).json({
      success: true,
      count: customers.length,
      data: customers
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers',
      error: error.message
    });
  }
};

// @desc    Get customer bookings by phone
// @route   GET /api/admin/customers/:phoneNumber/bookings
// @access  Private
exports.getCustomerBookings = async (req, res) => {
  try {
    const { phoneNumber } = req.params;

    const bookings = await Booking.find({ phoneNumber })
      .populate('assignedDriver', 'name phone vehicleInfo')
      .sort({ createdAt: -1 });

    if (bookings.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No bookings found for this customer'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        customer: {
          phoneNumber,
          fullName: bookings[0].fullName,
          totalBookings: bookings.length
        },
        bookings
      }
    });
  } catch (error) {
    console.error('Get customer bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer bookings',
      error: error.message
    });
  }
};
```

### 4. Routes Setup

**File**: `src/routes/adminRoutes.js`

```javascript
const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const { roleCheck } = require('../middleware/roleCheck');

// Controllers
const adminAuthController = require('../controllers/adminAuthController');
const adminBookingController = require('../controllers/adminBookingController');
const adminDriverController = require('../controllers/adminDriverController');
const adminCustomerController = require('../controllers/adminCustomerController');

// ============================================
// PUBLIC ROUTES
// ============================================

// Authentication
router.post('/auth/login', adminAuthController.login);

// ============================================
// PROTECTED ROUTES (require authentication)
// ============================================

router.use(adminAuth); // All routes below require authentication

// Profile
router.get('/auth/me', adminAuthController.getProfile);

// ============================================
// BOOKING MANAGEMENT
// ============================================

router.get('/bookings/stats', adminBookingController.getBookingStats);
router.get('/bookings', adminBookingController.getAllBookings);
router.get('/bookings/:id', adminBookingController.getBookingById);
router.patch('/bookings/:id/confirm', adminBookingController.confirmBooking);
router.patch('/bookings/:id/assign-driver', adminBookingController.assignDriver);
router.patch('/bookings/:id/status', adminBookingController.updateBookingStatus);
router.patch('/bookings/:id/notes', adminBookingController.updateAdminNotes);

// ============================================
// DRIVER MANAGEMENT (admin & super_admin only)
// ============================================

router.use('/drivers', roleCheck(['admin', 'super_admin']));

router.get('/drivers/available', adminDriverController.getAvailableDrivers);
router.get('/drivers', adminDriverController.getAllDrivers);
router.get('/drivers/:id', adminDriverController.getDriverById);
router.post('/drivers', adminDriverController.createDriver);
router.patch('/drivers/:id', adminDriverController.updateDriver);
router.patch('/drivers/:id/verify', adminDriverController.verifyDriver);
router.patch('/drivers/:id/toggle-active', adminDriverController.toggleDriverStatus);

// ============================================
// CUSTOMER MANAGEMENT
// ============================================

router.get('/customers', adminCustomerController.getAllCustomers);
router.get('/customers/:phoneNumber/bookings', adminCustomerController.getCustomerBookings);

// ============================================
// ADMIN MANAGEMENT (super_admin only)
// ============================================

router.post('/auth/register', roleCheck(['super_admin']), adminAuthController.register);

module.exports = router;
```

### 5. Update Server

**File**: `src/server.js`

Add admin routes:

```javascript
// ... existing imports
const adminRoutes = require('./routes/adminRoutes');

// ... existing middleware

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes); // ADD THIS LINE
app.use('/api', bookingRoutes);

// ... rest of the file
```

### 6. Seed Script for First Admin

**File**: `src/scripts/createSuperAdmin.js`

```javascript
require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

const createSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if super admin exists
    const existingSuperAdmin = await Admin.findOne({ role: 'super_admin' });

    if (existingSuperAdmin) {
      console.log('Super admin already exists');
      process.exit(0);
    }

    // Create super admin
    const superAdmin = await Admin.create({
      email: 'admin@booking.com',
      password: 'admin123456',
      name: 'Super Admin',
      role: 'super_admin',
      isActive: true
    });

    console.log('Super admin created successfully:');
    console.log('Email:', superAdmin.email);
    console.log('Password: admin123456');
    console.log('IMPORTANT: Change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating super admin:', error);
    process.exit(1);
  }
};

createSuperAdmin();
```

Add to package.json:

```json
"scripts": {
  "create-admin": "node src/scripts/createSuperAdmin.js"
}
```

---

## 🎨 FRONTEND IMPLEMENTATION

### 1. Project Setup

```bash
# Create new React project
npm create vite@latest booking-admin-panel -- --template react
cd booking-admin-panel

# Install dependencies
npm install

# Core dependencies
npm install react-router-dom axios zustand @tanstack/react-query

# Ant Design
npm install antd @ant-design/icons

# Form handling
npm install react-hook-form zod @hookform/resolvers

# Utilities
npm install dayjs react-hot-toast

# Development
npm install -D @types/node
```

### 2. Project Structure

Create this structure:

```
src/
├── components/
│   ├── layout/
│   │   ├── AdminLayout.jsx
│   │   ├── Header.jsx
│   │   └── Sidebar.jsx
│   ├── common/
│   │   ├── StatusBadge.jsx
│   │   └── ProtectedRoute.jsx
│   ├── bookings/
│   │   ├── BookingList.jsx
│   │   ├── BookingDetailModal.jsx
│   │   ├── AssignDriverModal.jsx
│   │   └── BookingStatusTimeline.jsx
│   ├── drivers/
│   │   ├── DriverList.jsx
│   │   ├── DriverFormModal.jsx
│   │   └── DriverDetailModal.jsx
│   └── customers/
│       ├── CustomerList.jsx
│       └── CustomerBookingsModal.jsx
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Bookings.jsx
│   ├── Drivers.jsx
│   └── Customers.jsx
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── bookingService.js
│   ├── driverService.js
│   └── customerService.js
├── store/
│   └── authStore.js
├── utils/
│   ├── constants.js
│   └── helpers.js
├── App.jsx
└── main.jsx
```

### 3. Environment Configuration

**File**: `.env`

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ADMIN_API_BASE_URL=http://localhost:3000/api/admin
```

**File**: `.env.example`

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_ADMIN_API_BASE_URL=http://localhost:3000/api/admin
```

### 4. Core Services

**File**: `src/services/api.js`

```javascript
import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: import.meta.env.VITE_ADMIN_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status === 403) {
      toast.error('You do not have permission to perform this action');
    } else if (error.response?.data?.message) {
      toast.error(error.response.data.message);
    } else {
      toast.error('An error occurred. Please try again.');
    }
    return Promise.reject(error);
  }
);

export default api;
```

**File**: `src/services/authService.js`

```javascript
import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    const { token, admin } = response.data.data;
    localStorage.setItem('admin_token', token);
    return admin;
  },

  logout: () => {
    localStorage.removeItem('admin_token');
  },

  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data.data;
  },
};
```

**File**: `src/services/bookingService.js`

```javascript
import api from './api';

export const bookingService = {
  getAll: async (params) => {
    const response = await api.get('/bookings', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/bookings/${id}`);
    return response.data.data;
  },

  confirm: async (id) => {
    const response = await api.patch(`/bookings/${id}/confirm`);
    return response.data.data;
  },

  assignDriver: async (bookingId, driverId) => {
    const response = await api.patch(`/bookings/${bookingId}/assign-driver`, {
      driverId,
    });
    return response.data.data;
  },

  updateStatus: async (id, status) => {
    const response = await api.patch(`/bookings/${id}/status`, { status });
    return response.data.data;
  },

  updateNotes: async (id, notes) => {
    const response = await api.patch(`/bookings/${id}/notes`, { notes });
    return response.data.data;
  },

  getStats: async () => {
    const response = await api.get('/bookings/stats');
    return response.data.data;
  },
};
```

**File**: `src/services/driverService.js`

```javascript
import api from './api';

export const driverService = {
  getAll: async (params) => {
    const response = await api.get('/drivers', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/drivers/${id}`);
    return response.data.data;
  },

  getAvailable: async () => {
    const response = await api.get('/drivers/available');
    return response.data.data;
  },

  create: async (data) => {
    const response = await api.post('/drivers', data);
    return response.data.data;
  },

  update: async (id, data) => {
    const response = await api.patch(`/drivers/${id}`, data);
    return response.data.data;
  },

  verify: async (id) => {
    const response = await api.patch(`/drivers/${id}/verify`);
    return response.data.data;
  },

  toggleActive: async (id) => {
    const response = await api.patch(`/drivers/${id}/toggle-active`);
    return response.data.data;
  },
};
```

**File**: `src/services/customerService.js`

```javascript
import api from './api';

export const customerService = {
  getAll: async () => {
    const response = await api.get('/customers');
    return response.data;
  },

  getBookings: async (phoneNumber) => {
    const response = await api.get(`/customers/${phoneNumber}/bookings`);
    return response.data.data;
  },
};
```

### 5. State Management

**File**: `src/store/authStore.js`

```javascript
import { create } from 'zustand';
import { authService } from '../services/authService';

export const useAuthStore = create((set) => ({
  admin: null,
  isAuthenticated: false,
  isLoading: true,

  login: async (email, password) => {
    const admin = await authService.login(email, password);
    set({ admin, isAuthenticated: true });
  },

  logout: () => {
    authService.logout();
    set({ admin: null, isAuthenticated: false });
    window.location.href = '/login';
  },

  loadUser: async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const admin = await authService.getProfile();
      set({ admin, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('admin_token');
      set({ admin: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
```

### 6. Constants & Helpers

**File**: `src/utils/constants.js`

```javascript
export const BOOKING_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const STATUS_COLORS = {
  pending: 'gold',
  confirmed: 'blue',
  assigned: 'purple',
  in_progress: 'orange',
  completed: 'green',
  cancelled: 'red',
};

export const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  SUPPORT: 'support',
};
```

**File**: `src/utils/helpers.js`

```javascript
import dayjs from 'dayjs';

export const formatDate = (date) => {
  return dayjs(date).format('DD/MM/YYYY HH:mm');
};

export const formatDateShort = (date) => {
  return dayjs(date).format('DD/MM/YYYY');
};

export const getStatusText = (status) => {
  const statusMap = {
    pending: 'Pending',
    confirmed: 'Confirmed',
    assigned: 'Assigned',
    in_progress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };
  return statusMap[status] || status;
};
```

### 7. Common Components

**File**: `src/components/common/StatusBadge.jsx`

```jsx
import { Tag } from 'antd';
import { STATUS_COLORS, STATUS_LABELS } from '../../utils/constants';

const StatusBadge = ({ status }) => {
  return (
    <Tag color={STATUS_COLORS[status]}>
      {STATUS_LABELS[status]}
    </Tag>
  );
};

export default StatusBadge;
```

**File**: `src/components/common/ProtectedRoute.jsx`

```jsx
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Spin } from 'antd';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
```

### 8. Layout Components

**File**: `src/components/layout/AdminLayout.jsx`

```jsx
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const { Content } = Layout;

const AdminLayout = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Header />
        <Content style={{ margin: '24px 16px', padding: 24, background: '#fff' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;
```

**File**: `src/components/layout/Sidebar.jsx`

```jsx
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  BookOutlined,
  CarOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Sider } = Layout;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/bookings',
      icon: <BookOutlined />,
      label: 'Bookings',
    },
    {
      key: '/drivers',
      icon: <CarOutlined />,
      label: 'Drivers',
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: 'Customers',
    },
  ];

  return (
    <Sider theme="dark" width={250}>
      <div style={{
        height: 64,
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        Booking Admin
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
};

export default Sidebar;
```

**File**: `src/components/layout/Header.jsx`

```jsx
import { Layout, Dropdown, Avatar, Space } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuthStore } from '../../store/authStore';

const { Header: AntHeader } = Layout;

const Header = () => {
  const { admin, logout } = useAuthStore();

  const menuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: logout,
    },
  ];

  return (
    <AntHeader style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Space style={{ cursor: 'pointer' }}>
          <Avatar icon={<UserOutlined />} />
          <span>{admin?.name}</span>
        </Space>
      </Dropdown>
    </AntHeader>
  );
};

export default Header;
```

### 9. Main Pages

**File**: `src/pages/Login.jsx`

```jsx
import { Form, Input, Button, Card, Typography } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuthStore } from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const { Title } = Typography;

const Login = () => {
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const onFinish = async (values) => {
    try {
      await login(values.email, values.password);
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      // Error handled by axios interceptor
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f0f2f5'
    }}>
      <Card style={{ width: 400 }}>
        <Title level={2} style={{ textAlign: 'center', marginBottom: 30 }}>
          Admin Login
        </Title>
        <Form form={form} onFinish={onFinish} layout="vertical">
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email!' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block>
              Login
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Login;
```

**File**: `src/pages/Dashboard.jsx`

```jsx
import { Card, Row, Col, Statistic, Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../services/bookingService';
import StatusBadge from '../components/common/StatusBadge';
import { formatDate } from '../utils/helpers';

const Dashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['booking-stats'],
    queryFn: bookingService.getStats,
  });

  const { data: recentBookings } = useQuery({
    queryKey: ['recent-bookings'],
    queryFn: () => bookingService.getAll({ page: 1, limit: 5 }),
  });

  const columns = [
    {
      title: 'Customer',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Hotel',
      dataIndex: 'hotel',
      key: 'hotel',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
  ];

  return (
    <div>
      <h1>Dashboard</h1>

      <Row gutter={16} style={{ marginTop: 20 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pending Confirmations"
              value={stats?.pendingConfirmations || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Today's Bookings"
              value={stats?.todayBookings || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Completed"
              value={stats?.byStatus?.completed || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats?.byStatus?.in_progress || 0}
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Bookings" style={{ marginTop: 20 }}>
        <Table
          columns={columns}
          dataSource={recentBookings?.data || []}
          rowKey="id"
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default Dashboard;
```

**File**: `src/pages/Bookings.jsx`

```jsx
import { useState } from 'react';
import { Table, Button, Space, Input, Select } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { bookingService } from '../services/bookingService';
import StatusBadge from '../components/common/StatusBadge';
import { formatDate } from '../utils/helpers';
import { BOOKING_STATUS } from '../utils/constants';
import AssignDriverModal from '../components/bookings/AssignDriverModal';
import BookingDetailModal from '../components/bookings/BookingDetailModal';
import toast from 'react-hot-toast';

const Bookings = () => {
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => bookingService.getAll(filters),
  });

  const handleConfirm = async (id) => {
    try {
      await bookingService.confirm(id);
      toast.success('Booking confirmed successfully');
      refetch();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const handleAssignDriver = (booking) => {
    setSelectedBooking(booking);
    setShowAssignModal(true);
  };

  const handleViewDetail = (booking) => {
    setSelectedBooking(booking);
    setShowDetailModal(true);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      render: (id) => id.slice(-6),
    },
    {
      title: 'Customer',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Phone',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
    },
    {
      title: 'Hotel',
      dataIndex: 'hotel',
      key: 'hotel',
    },
    {
      title: 'Arrival Time',
      dataIndex: 'arrivalTime',
      key: 'arrivalTime',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <StatusBadge status={status} />,
    },
    {
      title: 'Driver',
      dataIndex: 'assignedDriver',
      key: 'assignedDriver',
      render: (driver) => driver?.name || '-',
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => handleViewDetail(record)}>
            View
          </Button>
          {record.status === BOOKING_STATUS.PENDING && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleConfirm(record.id)}
            >
              Confirm
            </Button>
          )}
          {record.status === BOOKING_STATUS.CONFIRMED && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleAssignDriver(record)}
            >
              Assign Driver
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1>Bookings Management</h1>

      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Search by name, phone, hotel..."
          onSearch={(value) => setFilters({ ...filters, search: value, page: 1 })}
          style={{ width: 300 }}
        />
        <Select
          placeholder="Filter by status"
          style={{ width: 200 }}
          allowClear
          onChange={(value) => setFilters({ ...filters, status: value, page: 1 })}
        >
          {Object.entries(BOOKING_STATUS).map(([key, value]) => (
            <Select.Option key={value} value={value}>
              {key.replace('_', ' ')}
            </Select.Option>
          ))}
        </Select>
      </Space>

      <Table
        columns={columns}
        dataSource={data?.data || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total: data?.pagination?.total,
          onChange: (page) => setFilters({ ...filters, page }),
        }}
      />

      {showAssignModal && (
        <AssignDriverModal
          booking={selectedBooking}
          open={showAssignModal}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedBooking(null);
          }}
          onSuccess={() => {
            refetch();
            setShowAssignModal(false);
            setSelectedBooking(null);
          }}
        />
      )}

      {showDetailModal && (
        <BookingDetailModal
          booking={selectedBooking}
          open={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedBooking(null);
          }}
          onUpdate={refetch}
        />
      )}
    </div>
  );
};

export default Bookings;
```

**File**: `src/pages/Drivers.jsx`

```jsx
import { useState } from 'react';
import { Table, Button, Space, Tag, Input } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { driverService } from '../services/driverService';
import DriverFormModal from '../components/drivers/DriverFormModal';
import toast from 'react-hot-toast';

const Drivers = () => {
  const [filters, setFilters] = useState({ page: 1, limit: 20 });
  const [showFormModal, setShowFormModal] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['drivers', filters],
    queryFn: () => driverService.getAll(filters),
  });

  const handleVerify = async (id) => {
    try {
      await driverService.verify(id);
      toast.success('Driver verified successfully');
      refetch();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const handleToggleActive = async (id) => {
    try {
      await driverService.toggleActive(id);
      toast.success('Driver status updated');
      refetch();
    } catch (error) {
      // Error handled by interceptor
    }
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
    },
    {
      title: 'License',
      dataIndex: 'driverLicenseNumber',
      key: 'driverLicenseNumber',
    },
    {
      title: 'Vehicle',
      key: 'vehicle',
      render: (_, record) => (
        <div>
          {record.vehicleInfo?.vehicleMake} {record.vehicleInfo?.vehicleModel}
          <br />
          <small>{record.vehicleInfo?.licensePlate}</small>
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: (_, record) => (
        <Space>
          <Tag color={record.isActive ? 'green' : 'red'}>
            {record.isActive ? 'Active' : 'Inactive'}
          </Tag>
          <Tag color={record.isVerified ? 'blue' : 'orange'}>
            {record.isVerified ? 'Verified' : 'Not Verified'}
          </Tag>
        </Space>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => {
            setSelectedDriver(record);
            setShowFormModal(true);
          }}>
            Edit
          </Button>
          {!record.isVerified && (
            <Button
              size="small"
              type="primary"
              onClick={() => handleVerify(record.id)}
            >
              Verify
            </Button>
          )}
          <Button
            size="small"
            danger={record.isActive}
            onClick={() => handleToggleActive(record.id)}
          >
            {record.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <h1>Drivers Management</h1>
        <Button
          type="primary"
          onClick={() => {
            setSelectedDriver(null);
            setShowFormModal(true);
          }}
        >
          Add Driver
        </Button>
      </div>

      <Input.Search
        placeholder="Search by name, phone, license..."
        onSearch={(value) => setFilters({ ...filters, search: value, page: 1 })}
        style={{ width: 300, marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={data?.data || []}
        rowKey="id"
        loading={isLoading}
        pagination={{
          current: filters.page,
          pageSize: filters.limit,
          total: data?.pagination?.total,
          onChange: (page) => setFilters({ ...filters, page }),
        }}
      />

      {showFormModal && (
        <DriverFormModal
          driver={selectedDriver}
          open={showFormModal}
          onClose={() => {
            setShowFormModal(false);
            setSelectedDriver(null);
          }}
          onSuccess={() => {
            refetch();
            setShowFormModal(false);
            setSelectedDriver(null);
          }}
        />
      )}
    </div>
  );
};

export default Drivers;
```

**File**: `src/pages/Customers.jsx`

```jsx
import { useState } from 'react';
import { Table } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { customerService } from '../services/customerService';
import { formatDate } from '../utils/helpers';
import CustomerBookingsModal from '../components/customers/CustomerBookingsModal';

const Customers = () => {
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showBookingsModal, setShowBookingsModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: customerService.getAll,
  });

  const columns = [
    {
      title: 'Phone Number',
      dataIndex: 'phoneNumber',
      key: 'phoneNumber',
    },
    {
      title: 'Name',
      dataIndex: 'fullName',
      key: 'fullName',
    },
    {
      title: 'Total Bookings',
      dataIndex: 'totalBookings',
      key: 'totalBookings',
    },
    {
      title: 'First Booking',
      dataIndex: 'firstBookingDate',
      key: 'firstBookingDate',
      render: (date) => formatDate(date),
    },
    {
      title: 'Last Booking',
      dataIndex: 'lastBookingDate',
      key: 'lastBookingDate',
      render: (date) => formatDate(date),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <a onClick={() => {
          setSelectedCustomer(record);
          setShowBookingsModal(true);
        }}>
          View Bookings
        </a>
      ),
    },
  ];

  return (
    <div>
      <h1>Customers</h1>

      <Table
        columns={columns}
        dataSource={data?.data || []}
        rowKey="phoneNumber"
        loading={isLoading}
      />

      {showBookingsModal && (
        <CustomerBookingsModal
          customer={selectedCustomer}
          open={showBookingsModal}
          onClose={() => {
            setShowBookingsModal(false);
            setSelectedCustomer(null);
          }}
        />
      )}
    </div>
  );
};

export default Customers;
```

### 10. Booking Components (Examples)

**File**: `src/components/bookings/AssignDriverModal.jsx`

```jsx
import { Modal, Select, Button, Spin } from 'antd';
import { useQuery, useMutation } from '@tanstack/react-query';
import { driverService } from '../../services/driverService';
import { bookingService } from '../../services/bookingService';
import { useState } from 'react';
import toast from 'react-hot-toast';

const AssignDriverModal = ({ booking, open, onClose, onSuccess }) => {
  const [selectedDriver, setSelectedDriver] = useState(null);

  const { data: drivers, isLoading } = useQuery({
    queryKey: ['available-drivers'],
    queryFn: driverService.getAvailable,
    enabled: open,
  });

  const assignMutation = useMutation({
    mutationFn: () => bookingService.assignDriver(booking.id, selectedDriver),
    onSuccess: () => {
      toast.success('Driver assigned successfully');
      onSuccess();
    },
  });

  return (
    <Modal
      title="Assign Driver"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="assign"
          type="primary"
          disabled={!selectedDriver}
          loading={assignMutation.isPending}
          onClick={() => assignMutation.mutate()}
        >
          Assign
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <strong>Booking:</strong> {booking.fullName} - {booking.hotel}
      </div>

      {isLoading ? (
        <Spin />
      ) : (
        <Select
          placeholder="Select a driver"
          style={{ width: '100%' }}
          onChange={setSelectedDriver}
          value={selectedDriver}
        >
          {drivers?.map((driver) => (
            <Select.Option key={driver.id} value={driver.id}>
              {driver.name} - {driver.vehicleInfo?.vehicleMake} {driver.vehicleInfo?.vehicleModel}
              ({driver.vehicleInfo?.licensePlate})
            </Select.Option>
          ))}
        </Select>
      )}

      {drivers?.length === 0 && (
        <div style={{ marginTop: 16, color: '#999' }}>
          No available drivers at the moment
        </div>
      )}
    </Modal>
  );
};

export default AssignDriverModal;
```

**File**: `src/components/bookings/BookingDetailModal.jsx`

```jsx
import { Modal, Descriptions, Button, Input, Space } from 'antd';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { bookingService } from '../../services/bookingService';
import StatusBadge from '../common/StatusBadge';
import { formatDate } from '../../utils/helpers';
import BookingStatusTimeline from './BookingStatusTimeline';
import toast from 'react-hot-toast';

const BookingDetailModal = ({ booking, open, onClose, onUpdate }) => {
  const [notes, setNotes] = useState(booking.adminNotes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const updateNotesMutation = useMutation({
    mutationFn: () => bookingService.updateNotes(booking.id, notes),
    onSuccess: () => {
      toast.success('Notes updated');
      setIsEditingNotes(false);
      onUpdate();
    },
  });

  return (
    <Modal
      title="Booking Details"
      open={open}
      onCancel={onClose}
      width={800}
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
      ]}
    >
      <Descriptions bordered column={2}>
        <Descriptions.Item label="Booking ID" span={2}>
          {booking.id}
        </Descriptions.Item>
        <Descriptions.Item label="Customer">
          {booking.fullName}
        </Descriptions.Item>
        <Descriptions.Item label="Phone">
          {booking.phoneNumber}
        </Descriptions.Item>
        <Descriptions.Item label="Hotel" span={2}>
          {booking.hotel}
        </Descriptions.Item>
        <Descriptions.Item label="Arrival Time">
          {booking.arrivalTime}
        </Descriptions.Item>
        <Descriptions.Item label="Bags">
          {booking.numberOfBags}
        </Descriptions.Item>
        <Descriptions.Item label="Status">
          <StatusBadge status={booking.status} />
        </Descriptions.Item>
        <Descriptions.Item label="Created">
          {formatDate(booking.createdAt)}
        </Descriptions.Item>
        {booking.assignedDriver && (
          <>
            <Descriptions.Item label="Driver" span={2}>
              {booking.assignedDriver.name} - {booking.assignedDriver.phone}
            </Descriptions.Item>
            <Descriptions.Item label="Vehicle" span={2}>
              {booking.assignedDriver.vehicleInfo?.vehicleMake}{' '}
              {booking.assignedDriver.vehicleInfo?.vehicleModel} -{' '}
              {booking.assignedDriver.vehicleInfo?.licensePlate}
            </Descriptions.Item>
          </>
        )}
        {booking.confirmedBy && (
          <Descriptions.Item label="Confirmed By" span={2}>
            {booking.confirmedBy.name} at {formatDate(booking.confirmedAt)}
          </Descriptions.Item>
        )}
      </Descriptions>

      <div style={{ marginTop: 24 }}>
        <h3>Status Timeline</h3>
        <BookingStatusTimeline booking={booking} />
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 8 }}>
          <strong>Admin Notes:</strong>
        </div>
        {isEditingNotes ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input.TextArea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
            <Space>
              <Button
                type="primary"
                onClick={() => updateNotesMutation.mutate()}
                loading={updateNotesMutation.isPending}
              >
                Save
              </Button>
              <Button onClick={() => {
                setNotes(booking.adminNotes || '');
                setIsEditingNotes(false);
              }}>
                Cancel
              </Button>
            </Space>
          </Space>
        ) : (
          <div>
            <p>{notes || 'No notes yet'}</p>
            <Button onClick={() => setIsEditingNotes(true)}>
              Edit Notes
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default BookingDetailModal;
```

**File**: `src/components/bookings/BookingStatusTimeline.jsx`

```jsx
import { Steps } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { formatDate } from '../../utils/helpers';

const BookingStatusTimeline = ({ booking }) => {
  const getStepStatus = (stepStatus) => {
    const statusOrder = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed'];
    const currentIndex = statusOrder.indexOf(booking.status);
    const stepIndex = statusOrder.indexOf(stepStatus);

    if (booking.status === 'cancelled') return 'error';
    if (stepIndex < currentIndex) return 'finish';
    if (stepIndex === currentIndex) return 'process';
    return 'wait';
  };

  const items = [
    {
      title: 'Created',
      description: formatDate(booking.createdAt),
      status: 'finish',
      icon: <CheckCircleOutlined />,
    },
    {
      title: 'Confirmed',
      description: booking.confirmedAt
        ? `${formatDate(booking.confirmedAt)}\nBy: ${booking.confirmedBy?.name}`
        : 'Waiting for confirmation',
      status: getStepStatus('confirmed'),
      icon: booking.confirmedAt ? <CheckCircleOutlined /> : <ClockCircleOutlined />,
    },
    {
      title: 'Driver Assigned',
      description: booking.assignedAt
        ? `${formatDate(booking.assignedAt)}\nDriver: ${booking.assignedDriver?.name}`
        : 'Waiting for driver assignment',
      status: getStepStatus('assigned'),
      icon: booking.assignedAt ? <CheckCircleOutlined /> : <ClockCircleOutlined />,
    },
    {
      title: 'In Progress',
      description: booking.pickupTime
        ? `Picked up at ${formatDate(booking.pickupTime)}`
        : 'Not started yet',
      status: getStepStatus('in_progress'),
      icon: booking.pickupTime ? <CheckCircleOutlined /> : <ClockCircleOutlined />,
    },
    {
      title: 'Completed',
      description: booking.completedAt
        ? formatDate(booking.completedAt)
        : 'Not completed yet',
      status: getStepStatus('completed'),
      icon: booking.completedAt ? <CheckCircleOutlined /> : <ClockCircleOutlined />,
    },
  ];

  if (booking.status === 'cancelled') {
    return (
      <Steps
        direction="vertical"
        current={0}
        status="error"
        items={[
          {
            title: 'Cancelled',
            description: 'This booking has been cancelled',
            icon: <CloseCircleOutlined />,
          },
        ]}
      />
    );
  }

  return <Steps direction="vertical" items={items} />;
};

export default BookingStatusTimeline;
```

### 11. App Entry Point

**File**: `src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/common/ProtectedRoute';
import AdminLayout from './components/layout/AdminLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Bookings from './pages/Bookings';
import Drivers from './pages/Drivers';
import Customers from './pages/Customers';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  const { loadUser } = useAuthStore();

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="bookings" element={<Bookings />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="customers" element={<Customers />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}

export default App;
```

**File**: `src/main.jsx`

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import 'antd/dist/reset.css';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

---

## 📚 API DOCUMENTATION

### Authentication

#### Login
```
POST /api/admin/auth/login
```

Request:
```json
{
  "email": "admin@booking.com",
  "password": "admin123456"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "admin": {
      "id": "...",
      "email": "admin@booking.com",
      "name": "Super Admin",
      "role": "super_admin"
    }
  }
}
```

#### Get Profile
```
GET /api/admin/auth/me
Headers: Authorization: Bearer <token>
```

### Bookings Management

#### Get All Bookings
```
GET /api/admin/bookings?status=pending&page=1&limit=20&search=nguyen
```

#### Get Booking by ID
```
GET /api/admin/bookings/:id
```

#### Confirm Booking
```
PATCH /api/admin/bookings/:id/confirm
```

#### Assign Driver
```
PATCH /api/admin/bookings/:id/assign-driver
Body: { "driverId": "..." }
```

#### Update Status
```
PATCH /api/admin/bookings/:id/status
Body: { "status": "in_progress" }
```

#### Update Notes
```
PATCH /api/admin/bookings/:id/notes
Body: { "notes": "Customer called about..." }
```

#### Get Statistics
```
GET /api/admin/bookings/stats
```

### Drivers Management

#### Get All Drivers
```
GET /api/admin/drivers?isActive=true&isVerified=true
```

#### Get Available Drivers
```
GET /api/admin/drivers/available
```

#### Create Driver
```
POST /api/admin/drivers
Body: {
  "name": "...",
  "phone": "...",
  "driverLicenseNumber": "...",
  "password": "...",
  "vehicleInfo": { ... }
}
```

#### Update Driver
```
PATCH /api/admin/drivers/:id
Body: { "name": "...", ... }
```

#### Verify Driver
```
PATCH /api/admin/drivers/:id/verify
```

#### Toggle Active Status
```
PATCH /api/admin/drivers/:id/toggle-active
```

### Customers

#### Get All Customers
```
GET /api/admin/customers
```

#### Get Customer Bookings
```
GET /api/admin/customers/:phoneNumber/bookings
```

---

## 🚀 IMPLEMENTATION STEPS

### Step 1: Backend Updates (2-3 days)

1. Create new models:
   ```bash
   # In booking-backend repo
   touch src/models/Admin.js
   touch src/utils/constants.js
   ```

2. Update Booking model with new fields

3. Create middleware:
   ```bash
   touch src/middleware/adminAuth.js
   touch src/middleware/roleCheck.js
   ```

4. Create controllers:
   ```bash
   touch src/controllers/adminAuthController.js
   touch src/controllers/adminBookingController.js
   touch src/controllers/adminDriverController.js
   touch src/controllers/adminCustomerController.js
   ```

5. Create routes:
   ```bash
   touch src/routes/adminRoutes.js
   ```

6. Update server.js to include admin routes

7. Create seed script:
   ```bash
   mkdir -p src/scripts
   touch src/scripts/createSuperAdmin.js
   ```

8. Run seed script:
   ```bash
   npm run create-admin
   ```

9. Test all APIs with Postman or cURL

### Step 2: Frontend Setup (1 day)

1. Create new repository:
   ```bash
   npm create vite@latest booking-admin-panel -- --template react
   cd booking-admin-panel
   ```

2. Install dependencies (see Frontend Implementation section)

3. Create folder structure

4. Setup environment variables (.env, .env.example)

### Step 3: Frontend Core Implementation (3-4 days)

1. Implement services layer (api.js, authService.js, etc.)

2. Implement store (authStore.js)

3. Implement layout components (AdminLayout, Sidebar, Header)

4. Implement common components (StatusBadge, ProtectedRoute)

5. Implement Login page

6. Implement Dashboard page

7. Test authentication flow

### Step 4: Features Implementation (4-5 days)

1. Implement Bookings page:
   - List view with filters
   - Confirm functionality
   - Assign driver modal
   - Detail modal with status timeline
   - Notes functionality

2. Implement Drivers page:
   - List view
   - Create/Edit form modal
   - Verify functionality
   - Toggle active status

3. Implement Customers page:
   - List view
   - Customer bookings modal

### Step 5: Testing & Polish (2-3 days)

1. Integration testing
2. UI/UX improvements
3. Error handling
4. Loading states
5. Responsive design
6. Documentation

### Step 6: Deployment

**Backend:**
- No separate deployment needed (extend existing backend)
- Run migrations if needed
- Update environment variables

**Frontend:**
- Deploy to Vercel/Netlify
- Configure environment variables
- Update CORS settings on backend

---

## 🧪 TESTING GUIDE

### Backend Testing

1. Create super admin:
```bash
npm run create-admin
```

2. Test login:
```bash
curl -X POST http://localhost:3000/api/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@booking.com",
    "password": "admin123456"
  }'
```

3. Test protected endpoint:
```bash
curl -X GET http://localhost:3000/api/admin/bookings \
  -H "Authorization: Bearer <token>"
```

### Frontend Testing

1. Start development server:
```bash
npm run dev
```

2. Test login flow:
   - Navigate to http://localhost:5173
   - Should redirect to /login
   - Login with admin credentials
   - Should redirect to /dashboard

3. Test features:
   - Create test bookings
   - Confirm bookings
   - Create test drivers
   - Assign drivers to bookings
   - Update booking status
   - View customer list

---

## 📝 NOTES FOR AI CODING

### When implementing backend:
- All controllers should follow the existing pattern in `src/controllers/bookingController.js`
- Use try-catch blocks for error handling
- Always return consistent JSON response format: `{ success, data/errors, message }`
- Populate references when needed (assignedDriver, confirmedBy)
- Add proper validation before database operations

### When implementing frontend:
- Use Ant Design components consistently
- All API calls should be wrapped in React Query
- Handle loading and error states
- Use toast notifications for user feedback
- Follow the existing component structure
- Keep components small and focused
- Extract reusable logic into custom hooks

### Common pitfalls to avoid:
- Don't forget to hash passwords before saving
- Don't expose password field in API responses
- Check authorization before sensitive operations
- Validate status transitions (use STATUS_FLOW)
- Check driver availability before assignment
- Update timestamps when changing status

---

## 🎯 SUCCESS CRITERIA

Admin Panel is considered complete when:

- [ ] Admin can login with credentials
- [ ] Dashboard shows accurate statistics
- [ ] Admin can view all bookings with filters
- [ ] Admin can confirm pending bookings
- [ ] Admin can view available drivers
- [ ] Admin can assign driver to confirmed booking
- [ ] Admin can track booking status through timeline
- [ ] Admin can add/edit drivers
- [ ] Admin can verify drivers
- [ ] Admin can activate/deactivate drivers
- [ ] Admin can view customer list
- [ ] Admin can view customer booking history
- [ ] Admin can add notes to bookings
- [ ] All actions show appropriate feedback
- [ ] UI is responsive and user-friendly
- [ ] Error handling works correctly

---

## 📦 DELIVERABLES

1. **Backend Updates** (in existing repo):
   - Updated models (Admin, Booking)
   - New middleware (adminAuth, roleCheck)
   - New controllers (4 files)
   - New routes (adminRoutes.js)
   - Seed script
   - Updated server.js

2. **Frontend** (new repo: booking-admin-panel):
   - Complete React application
   - All pages and components
   - Services layer
   - State management
   - Routing
   - README.md with setup instructions
   - .env.example

3. **Documentation**:
   - API documentation
   - Setup instructions
   - Testing guide

---

This specification provides complete implementation details for both backend and frontend. You can use this document with AI coding assistants (Claude, ChatGPT, etc.) by:

1. Sharing the entire document for context
2. Asking to implement specific sections
3. Requesting code for specific files
4. Getting help with debugging

The document includes all necessary code examples, file structures, and implementation details needed to build the complete admin panel system.
