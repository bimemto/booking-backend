const mongoose = require('mongoose');

/**
 * Customer Schema for MongoDB
 */
const customerSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Full name must be at least 2 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        if (!v) return true; // Email is optional
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    validate: {
      validator: function(v) {
        // Must start with 0 and be 10-11 digits
        return /^0\d{9,10}$/.test(v);
      },
      message: 'Invalid phone number format (must start with 0 and be 10-11 digits)'
    }
  },
  address: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
  totalBookings: {
    type: Number,
    default: 0
  },
  lastBookingDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

/**
 * Indexes for better query performance
 */
customerSchema.index({ phoneNumber: 1 });
customerSchema.index({ email: 1 });

/**
 * Custom validation method
 */
customerSchema.statics.validateCustomer = function(data) {
  const errors = [];

  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push('Full name must be at least 2 characters');
  }

  const phoneRegex = /^0\d{9,10}$/;
  if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
    errors.push('Phone number is required');
  } else if (!phoneRegex.test(data.phoneNumber)) {
    errors.push('Invalid phone number format (must start with 0 and be 10-11 digits)');
  }

  if (data.email && data.email.trim().length > 0) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      errors.push('Invalid email format');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
