const mongoose = require('mongoose');

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Hotel name is required'],
    trim: true
  },
  address: {
    type: String,
    required: [true, 'Hotel address is required'],
    trim: true
  },
  zone: {
    type: String,
    required: [true, 'Zone is required'],
    enum: ['zone1', 'zone2', 'zone3'],
    default: 'zone1'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for faster search
hotelSchema.index({ name: 'text', address: 'text' });

const Hotel = mongoose.model('Hotel', hotelSchema);

module.exports = Hotel;
