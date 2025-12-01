const mongoose = require('mongoose');

/**
 * Vehicle Information Schema
 */
const vehicleInfoSchema = new mongoose.Schema({
  vehicleType: {
    type: String,
    required: [true, 'Vehicle type is required'],
    trim: true
  },
  vehicleMake: {
    type: String,
    required: [true, 'Vehicle make is required'],
    trim: true
  },
  vehicleModel: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true
  },
  vehicleYear: {
    type: Number,
    required: [true, 'Vehicle year is required'],
    min: [1900, 'Invalid vehicle year'],
    max: [new Date().getFullYear() + 1, 'Invalid vehicle year']
  },
  licensePlate: {
    type: String,
    required: [true, 'License plate is required'],
    trim: true,
    uppercase: true
  },
  vehicleColor: {
    type: String,
    trim: true
  }
}, { _id: false });

/**
 * Driver Schema for MongoDB
 */
const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    validate: {
      validator: function(v) {
        // Must start with 0 and be 10-11 digits
        return /^0\d{9,10}$/.test(v);
      },
      message: 'Invalid phone number format (must start with 0 and be 10-11 digits)'
    }
  },
  driverLicenseNumber: {
    type: String,
    required: [true, 'Driver license number is required'],
    unique: true,
    trim: true,
    minlength: [5, 'Driver license number must be at least 5 characters']
  },
  vehicleInfo: {
    type: vehicleInfoSchema,
    required: [true, 'Vehicle information is required']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.password; // Never return password in JSON
      return ret;
    }
  }
});

/**
 * Indexes for better query performance
 */
driverSchema.index({ phone: 1 });
driverSchema.index({ driverLicenseNumber: 1 });

/**
 * Custom validation method
 */
driverSchema.statics.validateDriverRegistration = function(data) {
  const errors = [];

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  // Phone validation
  const phoneRegex = /^0\d{9,10}$/;
  if (!data.phone || data.phone.trim().length === 0) {
    errors.push('Phone number is required');
  } else if (!phoneRegex.test(data.phone)) {
    errors.push('Invalid phone number format (must start with 0 and be 10-11 digits)');
  }

  // Driver license validation
  if (!data.driverLicenseNumber || data.driverLicenseNumber.trim().length < 5) {
    errors.push('Driver license number must be at least 5 characters');
  }

  // Password validation
  if (!data.password || data.password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  // Vehicle info validation
  if (!data.vehicleInfo) {
    errors.push('Vehicle information is required');
  } else {
    if (!data.vehicleInfo.vehicleType) {
      errors.push('Vehicle type is required');
    }
    if (!data.vehicleInfo.vehicleMake) {
      errors.push('Vehicle make is required');
    }
    if (!data.vehicleInfo.vehicleModel) {
      errors.push('Vehicle model is required');
    }
    if (!data.vehicleInfo.vehicleYear) {
      errors.push('Vehicle year is required');
    }
    if (!data.vehicleInfo.licensePlate) {
      errors.push('License plate is required');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

const Driver = mongoose.model('Driver', driverSchema);

module.exports = Driver;
