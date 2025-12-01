require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/database');
const bookingRoutes = require('./routes/bookingRoutes');
const authRoutes = require('./routes/authRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const adminBookingRoutes = require('./routes/adminBookingRoutes');
const adminDriverRoutes = require('./routes/adminDriverRoutes');
const adminCustomerRoutes = require('./routes/adminCustomerRoutes');
const adminHotelRoutes = require('./routes/adminHotelRoutes');
const hotelRoutes = require('./routes/hotelRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded images as static files
app.use('/uploads', express.static('uploads'));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Booking API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin/auth', adminAuthRoutes);
app.use('/api/admin/bookings', adminBookingRoutes);
app.use('/api/admin/drivers', adminDriverRoutes);
app.use('/api/admin/customers', adminCustomerRoutes);
app.use('/api/admin/hotels', adminHotelRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api', bookingRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to database and start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server is running on port ${PORT}`);
      console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health`);
      console.log(`\nAvailable endpoints:`);
      console.log(`\nDriver Authentication:`);
      console.log(`  POST   /api/auth/register  - Register a new driver`);
      console.log(`  POST   /api/auth/login     - Login driver`);
      console.log(`  GET    /api/auth/me        - Get current driver profile (requires auth)`);
      console.log(`\nAdmin Authentication:`);
      console.log(`  POST   /api/admin/auth/login - Login admin`);
      console.log(`  GET    /api/admin/auth/me    - Get current admin profile (requires auth)`);
      console.log(`\nAdmin Booking Management:`);
      console.log(`  GET    /api/admin/bookings       - Get all bookings with filters (requires auth)`);
      console.log(`  GET    /api/admin/bookings/stats - Get booking statistics (requires auth)`);
      console.log(`  GET    /api/admin/bookings/:id   - Get booking by ID (requires auth)`);
      console.log(`  PATCH  /api/admin/bookings/:id/confirm - Confirm booking (requires auth)`);
      console.log(`  PATCH  /api/admin/bookings/:id/assign-driver - Assign driver (requires auth)`);
      console.log(`  PATCH  /api/admin/bookings/:id/status - Update status (requires auth)`);
      console.log(`  PATCH  /api/admin/bookings/:id/notes  - Update notes (requires auth)`);
      console.log(`\nAdmin Driver Management:`);
      console.log(`  GET    /api/admin/drivers           - Get all drivers with filters (requires auth)`);
      console.log(`  GET    /api/admin/drivers/available - Get available drivers for assignment (requires auth)`);
      console.log(`  GET    /api/admin/drivers/stats     - Get driver statistics (requires auth)`);
      console.log(`  POST   /api/admin/drivers           - Create new driver (requires auth)`);
      console.log(`  GET    /api/admin/drivers/:id       - Get driver by ID (requires auth)`);
      console.log(`  PATCH  /api/admin/drivers/:id       - Update driver (requires auth)`);
      console.log(`  PATCH  /api/admin/drivers/:id/toggle-active - Toggle driver status (requires auth)`);
      console.log(`  PATCH  /api/admin/drivers/:id/verify - Verify driver (requires auth)`);
      console.log(`  DELETE /api/admin/drivers/:id       - Delete driver (requires auth)`);
      console.log(`\nAdmin Customer Management:`);
      console.log(`  GET    /api/admin/customers      - Get all customers with filters (requires auth)`);
      console.log(`  GET    /api/admin/customers/stats - Get customer statistics (requires auth)`);
      console.log(`  POST   /api/admin/customers      - Create new customer (requires auth)`);
      console.log(`  GET    /api/admin/customers/:id  - Get customer by ID (requires auth)`);
      console.log(`  PATCH  /api/admin/customers/:id  - Update customer (requires auth)`);
      console.log(`  PATCH  /api/admin/customers/:id/toggle-active - Toggle customer status (requires auth)`);
      console.log(`  DELETE /api/admin/customers/:id  - Delete customer (requires auth)`);
      console.log(`\nAdmin Hotel Management:`);
      console.log(`  GET    /api/admin/hotels        - Get all hotels with filters (requires auth)`);
      console.log(`  GET    /api/admin/hotels/search - Search hotels for autocomplete (requires auth)`);
      console.log(`  POST   /api/admin/hotels        - Create new hotel (requires auth)`);
      console.log(`  GET    /api/admin/hotels/:id    - Get hotel by ID (requires auth)`);
      console.log(`  PUT    /api/admin/hotels/:id    - Update hotel (requires auth)`);
      console.log(`  DELETE /api/admin/hotels/:id    - Delete hotel (requires auth)`);
      console.log(`\nPublic Hotel (for Mobile App):`);
      console.log(`  GET    /api/hotels/search  - Search hotels for autocomplete (no auth required)`);
      console.log(`\nPublic Booking:`);
      console.log(`  POST   /api/booking        - Create a new booking`);
      console.log(`  GET    /api/bookings       - Get all bookings`);
      console.log(`  GET    /api/bookings/my-bookings - Get my bookings by deviceId`);
      console.log(`  GET    /api/booking/:id    - Get booking by ID`);
      console.log(`  PATCH  /api/booking/:id/status - Update booking status`);
      console.log(`\nDriver Booking Management:`);
      console.log(`  GET    /api/bookings/driver/assigned  - Get assigned bookings (requires driver auth)`);
      console.log(`  GET    /api/bookings/driver/completed - Get completed bookings (requires driver auth)`);
      console.log(`  PATCH  /api/bookings/driver/:id/picked-up - Mark booking as picked up (requires driver auth)`);
      console.log(`  PATCH  /api/bookings/driver/:id/completed - Mark booking as completed with images (requires driver auth)\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n\nShutting down server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\nShutting down server...');
  process.exit(0);
});

// Start the server
startServer();

module.exports = app;
