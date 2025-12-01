const Customer = require('../models/Customer');
const Booking = require('../models/Booking');

/**
 * Get all customers with filters
 * GET /api/admin/customers
 */
exports.getAllCustomers = async (req, res) => {
  try {
    const { isActive, search, page = 1, limit = 20 } = req.query;

    // Build filter
    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get customers
    const customers = await Customer.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);

    // Get total count for pagination
    const total = await Customer.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        customers,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error getting customers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customers',
      error: error.message
    });
  }
};

/**
 * Get customer statistics
 * GET /api/admin/customers/stats
 */
exports.getCustomerStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      customersWithBookings
    ] = await Promise.all([
      Customer.countDocuments(),
      Customer.countDocuments({ isActive: true }),
      Customer.countDocuments({ isActive: false }),
      Customer.countDocuments({ totalBookings: { $gt: 0 } })
    ]);

    res.status(200).json({
      success: true,
      data: {
        total: totalCustomers,
        active: activeCustomers,
        inactive: inactiveCustomers,
        withBookings: customersWithBookings
      }
    });
  } catch (error) {
    console.error('Error getting customer stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get customer statistics',
      error: error.message
    });
  }
};

/**
 * Get customer by ID
 * GET /api/admin/customers/:id
 */
exports.getCustomerById = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Get customer's bookings
    const bookings = await Booking.find({
      $or: [
        { phoneNumber: customer.phoneNumber },
        { fullName: customer.fullName }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: {
        customer,
        recentBookings: bookings
      }
    });
  } catch (error) {
    console.error('Error getting customer:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get customer',
      error: error.message
    });
  }
};

/**
 * Create new customer
 * POST /api/admin/customers
 */
exports.createCustomer = async (req, res) => {
  try {
    const { fullName, email, phoneNumber, address, notes } = req.body;

    // Validate request body
    const validation = Customer.validateCustomer(req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        errors: validation.errors
      });
    }

    // Check if customer already exists with phone
    const existingCustomer = await Customer.findOne({ phoneNumber });
    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    // Create new customer
    const customer = new Customer({
      fullName,
      email,
      phoneNumber,
      address,
      notes
    });

    await customer.save();

    res.status(201).json({
      success: true,
      message: 'Customer created successfully',
      data: customer
    });
  } catch (error) {
    console.error('Error creating customer:', error);

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
        message: 'Customer with this phone number already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create customer',
      error: error.message
    });
  }
};

/**
 * Update customer
 * PATCH /api/admin/customers/:id
 */
exports.updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    const { fullName, email, phoneNumber, address, notes } = req.body;

    // Check if phone is being updated and already exists
    if (phoneNumber && phoneNumber !== customer.phoneNumber) {
      const existingCustomer = await Customer.findOne({ phoneNumber });
      if (existingCustomer) {
        return res.status(400).json({
          success: false,
          message: 'Customer with this phone number already exists'
        });
      }
      customer.phoneNumber = phoneNumber;
    }

    // Update other fields
    if (fullName) customer.fullName = fullName;
    if (email !== undefined) customer.email = email;
    if (address !== undefined) customer.address = address;
    if (notes !== undefined) customer.notes = notes;

    await customer.save();

    res.status(200).json({
      success: true,
      message: 'Customer updated successfully',
      data: customer
    });
  } catch (error) {
    console.error('Error updating customer:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update customer',
      error: error.message
    });
  }
};

/**
 * Toggle customer active status
 * PATCH /api/admin/customers/:id/toggle-active
 */
exports.toggleCustomerActive = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    customer.isActive = !customer.isActive;
    await customer.save();

    res.status(200).json({
      success: true,
      message: `Customer ${customer.isActive ? 'activated' : 'deactivated'} successfully`,
      data: customer
    });
  } catch (error) {
    console.error('Error toggling customer status:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to toggle customer status',
      error: error.message
    });
  }
};

/**
 * Delete customer
 * DELETE /api/admin/customers/:id
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByIdAndDelete(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting customer:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete customer',
      error: error.message
    });
  }
};

/**
 * Get all bookings for a specific customer
 * GET /api/admin/customers/:id/bookings
 */
exports.getCustomerBookings = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

    // Check if customer exists
    const customer = await Customer.findById(id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Build filter for bookings
    const filter = {
      $or: [
        { phoneNumber: customer.phoneNumber },
        { fullName: customer.fullName }
      ]
    };

    // Add status filter if provided
    if (status) {
      filter.status = status;
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Sort options
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Get bookings
    const bookings = await Booking.find(filter)
      .sort(sortOptions)
      .limit(parseInt(limit))
      .skip(skip)
      .populate('assignedDriver', 'name phone vehicleInfo')
      .populate('hotel', 'name address zone');

    // Get total count for pagination
    const total = await Booking.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customer._id,
          fullName: customer.fullName,
          phoneNumber: customer.phoneNumber,
          email: customer.email
        },
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
    console.error('Error getting customer bookings:', error);

    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get customer bookings',
      error: error.message
    });
  }
};
