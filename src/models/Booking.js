const mongoose = require('mongoose');
const { isValidPhone } = require('../utils/phoneValidator');

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
        // Validate international phone numbers using libphonenumber-js
        return isValidPhone(v);
      },
      message: 'Invalid phone number format'
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Email is optional, but if provided, must be valid
        if (!v || v.trim().length === 0) return true;
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Invalid email format'
    }
  },
  hotel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hotel',
    required: [true, 'Hotel is required']
  },
  bookingType: {
    type: String,
    enum: ['Airport', 'Other'],
    required: [true, 'Booking type is required'],
    default: 'Airport'
  },
  pickupLocationAddress: {
    type: String,
    trim: true,
    required: function() {
      return this.bookingType === 'Other';
    }
  },
  arrivalTime: {
    type: String,
    trim: true,
    required: function() {
      return this.bookingType === 'Airport';
    }
  },
  numberOfBags: {
    type: Number,
    required: [true, 'Number of bags is required'],
    min: [1, 'Number of bags must be at least 1'],
    max: [5, 'Number of bags cannot exceed 5']
  },
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    trim: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  isPickedUp: {
    type: Boolean,
    default: false
  },
  pickedUpAt: {
    type: Date,
    default: null
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  notes: {
    type: String,
    default: '',
    trim: true
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
  completedAt: {
    type: Date,
    default: null
  },
  completionImages: {
    type: [String],
    default: []
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

  if (!data.phoneNumber || data.phoneNumber.trim().length === 0) {
    errors.push('Phone number is required');
  } else if (!isValidPhone(data.phoneNumber)) {
    errors.push('Invalid phone number format');
  }

  if (!data.hotel) {
    errors.push('Hotel is required');
  }

  // Validate booking type
  if (!data.bookingType) {
    errors.push('Booking type is required');
  } else if (!['Airport', 'Other'].includes(data.bookingType)) {
    errors.push('Booking type must be either "Airport" or "Other"');
  }

  // Conditional validation based on booking type
  if (data.bookingType === 'Airport') {
    if (!data.arrivalTime || data.arrivalTime.trim().length === 0) {
      errors.push('Arrival time is required for Airport bookings');
    }
  } else if (data.bookingType === 'Other') {
    if (!data.pickupLocationAddress || data.pickupLocationAddress.trim().length === 0) {
      errors.push('Pickup location address is required for Other bookings');
    }
  }

  const bags = parseInt(data.numberOfBags);
  if (isNaN(bags) || bags < 1 || bags > 5) {
    errors.push('Number of bags must be between 1 and 5');
  }

  if (!data.deviceId || data.deviceId.trim().length === 0) {
    errors.push('Device ID is required');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
