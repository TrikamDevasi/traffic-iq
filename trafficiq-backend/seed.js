const mongoose = require('mongoose');
const User = require('./src/models/User');
require('dotenv').config();

async function seed() {
  try {
    await mongoose.connect('mongodb://localhost:27017/trafficiq');
    console.log('Connected to MongoDB');

    const adminExists = await User.findOne({ email: 'admin@trafficiq.app' });
    if (!adminExists) {
      await User.create({
        name: 'TrafficIQ Admin',
        email: 'admin@trafficiq.app',
        password: 'password123',
        role: 'admin'
      });
      console.log('Admin user seeded successfully!');
    } else {
      console.log('Admin user already exists.');
    }
    
    // Also seed a test intersection to test the map
    const Intersection = require('./src/models/Intersection');
    const intsCount = await Intersection.countDocuments();
    if (intsCount === 0) {
       await Intersection.create({
        intersectionId: 'INT-001',
        name: 'Main St & 1st Ave',
        location: {
          type: 'Point',
          coordinates: [-73.935242, 40.730610]
        },
        highway: 'HWY-1',
        isActive: true,
        laneCount: 4,
        phases: [
          { phaseId: 0, name: 'North/South Straight', duration: 30, direction: 'NS' },
          { phaseId: 1, name: 'North/South Left', duration: 15, direction: 'NS' },
          { phaseId: 2, name: 'East/West Straight', duration: 30, direction: 'EW' },
          { phaseId: 3, name: 'East/West Left', duration: 15, direction: 'EW' }
        ]
      });
       console.log('Test intersection seeded!');
    }
  } catch (error) {
    console.error('Error seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed();
