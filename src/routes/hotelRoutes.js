const express = require('express');
const router = express.Router();
const hotelController = require('../controllers/hotelController');

// Public routes - no authentication required
router.get('/search', hotelController.searchHotels);

module.exports = router;
