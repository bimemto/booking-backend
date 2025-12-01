const Hotel = require('../models/Hotel');

/**
 * Search hotels for autocomplete (Public API for mobile app)
 * GET /api/hotels/search
 */
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
