const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');

// Admin accounts to seed
const adminAccounts = [
  {
    name: 'Super Admin',
    email: 'superadmin@booking.com',
    password: 'SuperAdmin@123',
    role: 'super_admin'
  },
  {
    name: 'Admin User 1',
    email: 'admin1@booking.com',
    password: 'Admin@123',
    role: 'admin'
  },
  {
    name: 'Admin User 2',
    email: 'admin2@booking.com',
    password: 'Admin@123',
    role: 'admin'
  }
];

// Seed admin endpoint - Only works once
// POST /api/seed/admins?secret=YOUR_SECRET_KEY
router.post('/admins', async (req, res) => {
  try {
    // Security: Check secret key from query or header
    const secret = req.query.secret || req.headers['x-seed-secret'];
    const expectedSecret = process.env.SEED_SECRET || 'change-this-secret-in-production';

    if (secret !== expectedSecret) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized: Invalid seed secret'
      });
    }

    // Check if admins already exist
    const existingAdmins = await Admin.countDocuments();
    if (existingAdmins > 0) {
      return res.status(400).json({
        success: false,
        message: `Admins already exist (${existingAdmins} found). Cannot seed again.`,
        hint: 'If you want to reset, manually delete admins from MongoDB first.'
      });
    }

    // Create admin accounts
    const salt = await bcrypt.genSalt(10);
    const createdAdmins = [];

    for (const adminData of adminAccounts) {
      const hashedPassword = await bcrypt.hash(adminData.password, salt);

      const admin = new Admin({
        name: adminData.name,
        email: adminData.email,
        password: hashedPassword,
        role: adminData.role,
        isActive: true
      });

      await admin.save();
      createdAdmins.push({
        name: adminData.name,
        email: adminData.email,
        role: adminData.role,
        originalPassword: adminData.password
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully seeded ${createdAdmins.length} admin accounts`,
      admins: createdAdmins,
      warning: 'SAVE THESE CREDENTIALS! This endpoint will not work again.'
    });

  } catch (error) {
    console.error('Seed admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to seed admins',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Health check for seed routes
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Seed routes are available',
    endpoint: 'POST /api/seed/admins?secret=YOUR_SECRET'
  });
});

module.exports = router;
