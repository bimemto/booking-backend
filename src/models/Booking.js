const mongoose = require('mongoose');

/**
 * Booking Schema for MongoDB
 */
const bookingSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [1, 'Full name cannot be empty']
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
  pickupLocation: {
    type: String,
    required: [true, 'Pickup location is required'],
    trim: true,
    minlength: [1, 'Pickup location cannot be empty']
  },
  dropoffLocation: {
    type: String,
    required: [true, 'Dropoff location is required'],
    trim: true,
    minlength: [1, 'Dropoff location cannot be empty']
  },
  numberOfBags: {
    type: Number,
    required: [true, 'Number of bags is required'],
    min: [1, 'Number of bags must be at least 1'],
    max: [5, 'Number of bags cannot exceed 5']
  },
  isPickedUp: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true, // Automatically adds createdAt and updatedAt
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
 * Custom validation method
 */
bookingSchema.statics.validateBooking = function(data) {
  const errors = [];

  if (!data.fullName || data.fullName.trim().length === 0) {
    errors.push('Full name is required');
  }

  const phoneRegex = /^0\d{9,10}$/;
  if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
    errors.push('Phone number is required');
  } else if (!phoneRegex.test(data.phoneNumber)) {
    errors.push('Invalid phone number format (must start with 0 and be 10-11 digits)');
  }

  if (!data.pickupLocation || data.pickupLocation.trim().length === 0) {
    errors.push('Pickup location is required');
  }

  if (!data.dropoffLocation || data.dropoffLocation.trim().length === 0) {
    errors.push('Dropoff location is required');
  }

  const bags = parseInt(data.numberOfBags);
  if (isNaN(bags) || bags < 1 || bags > 5) {
    errors.push('Number of bags must be between 1 and 5');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
