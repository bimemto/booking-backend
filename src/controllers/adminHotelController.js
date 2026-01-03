const Hotel = require('../models/Hotel');
const mongoose = require('mongoose');

// Get all hotels with pagination and search
exports.getAllHotels = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, zone, isActive } = req.query;

    const query = {};

    // Search filter
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } }
      ];
    }

    // Zone filter
    if (zone) {
      query.zone = zone;
    }

    // Active status filter
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const hotels = await Hotel.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Hotel.countDocuments(query);

    res.json({
      success: true,
      data: hotels,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hotels',
      error: error.message
    });
  }
};

// Get hotel by ID
exports.getHotelById = async (req, res) => {
  try {
    // Validate hotel ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hotel ID'
      });
    }

    const hotel = await Hotel.findById(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    res.json({
      success: true,
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching hotel',
      error: error.message
    });
  }
};

// Create new hotel
exports.createHotel = async (req, res) => {
  try {
    const { name, address, zone } = req.body;

    // Validate required fields
    if (!name || !address || !zone) {
      return res.status(400).json({
        success: false,
        message: 'Name, address, and zone are required'
      });
    }

    // Validate zone
    if (!['zone1', 'zone2', 'zone3'].includes(zone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid zone. Must be zone1, zone2, or zone3'
      });
    }

    const hotel = new Hotel({
      name,
      address,
      zone
    });

    await hotel.save();

    res.status(201).json({
      success: true,
      message: 'Hotel created successfully',
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating hotel',
      error: error.message
    });
  }
};

// Update hotel
exports.updateHotel = async (req, res) => {
  try {
    // Validate hotel ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hotel ID'
      });
    }

    const { name, address, zone, isActive } = req.body;

    // Validate zone if provided
    if (zone && !['zone1', 'zone2', 'zone3'].includes(zone)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid zone. Must be zone1, zone2, or zone3'
      });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (address) updateData.address = address;
    if (zone) updateData.zone = zone;
    if (isActive !== undefined) updateData.isActive = isActive;

    const hotel = await Hotel.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    res.json({
      success: true,
      message: 'Hotel updated successfully',
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating hotel',
      error: error.message
    });
  }
};

// Delete hotel
exports.deleteHotel = async (req, res) => {
  try {
    // Validate hotel ID
    if (!req.params.id || !mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid hotel ID'
      });
    }

    const hotel = await Hotel.findByIdAndDelete(req.params.id);

    if (!hotel) {
      return res.status(404).json({
        success: false,
        message: 'Hotel not found'
      });
    }

    res.json({
      success: true,
      message: 'Hotel deleted successfully',
      data: hotel
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting hotel',
      error: error.message
    });
  }
};

// Autocomplete search for hotels (for mobile app)
exports.searchHotels = async (req, res) => {
  try {
    const { q, zone } = req.query;

    const query = { isActive: true };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { address: { $regex: q, $options: 'i' } }
      ];
    }

    if (zone) {
      query.zone = zone;
    }

    const hotels = await Hotel.find(query)
      .select('name address zone')
      .limit(20)
      .sort({ name: 1 });

    res.json({
      success: true,
      data: hotels
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error searching hotels',
      error: error.message
    });
  }
};
