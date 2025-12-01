const express = require('express');
const router = express.Router();
const adminHotelController = require('../controllers/adminHotelController');
const { authenticateAdmin } = require('../middleware/auth');

// All routes require admin authentication
router.use(authenticateAdmin);

// Autocomplete search (for app)
router.get('/search', adminHotelController.searchHotels);

// CRUD operations
router.get('/', adminHotelController.getAllHotels);
router.get('/:id', adminHotelController.getHotelById);
router.post('/', adminHotelController.createHotel);
router.put('/:id', adminHotelController.updateHotel);
router.delete('/:id', adminHotelController.deleteHotel);

module.exports = router;
