const mongoose = require('mongoose');
require('dotenv').config();
const { createAlert } = require('./src/services/alert.service');

async function run() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/trafficiq');
  console.log('Connected to DB');
  
  const alert = await createAlert({
    intersectionId: 'INT-001',
    type: 'incident',
    severity: 'critical',
    message: 'Manual test alert: collision reported in intersection'
  });
  
  if (alert) {
    console.log('Alert created!', alert._id);
  } else {
    console.log('Alert already exists or failed.');
  }
  process.exit(0);
}

run();
