require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../src/models/Admin');

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

const seedAdmins = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/booking_app', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing admin accounts
    console.log('\nClearing existing admin accounts...');
    await Admin.deleteMany({});
    console.log('✅ Cleared existing admin accounts');

    // Hash passwords and create admin accounts
    console.log('\nCreating admin accounts...');
    const salt = await bcrypt.genSalt(10);

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
      console.log(`✅ Created ${adminData.role}: ${adminData.email}`);
    }

    console.log('\n✅ Successfully seeded admin accounts!');
    console.log('\nAdmin login credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    adminAccounts.forEach(admin => {
      console.log(`\n${admin.name} (${admin.role}):`);
      console.log(`  Email: ${admin.email}`);
      console.log(`  Password: ${admin.password}`);
    });
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Close connection
    await mongoose.connection.close();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin accounts:', error);
    process.exit(1);
  }
};

// Run the seed script
seedAdmins();
