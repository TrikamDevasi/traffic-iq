const axios = require('axios');
const mongoose = require('mongoose');

async function test() {
  await mongoose.connect('mongodb://localhost:27017/trafficiq', { useNewUrlParser: true, useUnifiedTopology: true });
  const User = require('./src/models/User');

  let admin = await User.findOne({ email: 'admin@trafficiq.app' });
  if (!admin) {
    admin = await User.create({ name: 'Admin', email: 'admin@trafficiq.app', password: 'password123', role: 'admin' });
  } else {
    admin.role = 'admin';
    await admin.save();
  }

  let testUser = await User.findOne({ email: 'test_user@trafficiq.app' });
  if (!testUser) {
    testUser = await User.create({ name: 'Test User', email: 'test_user@trafficiq.app', password: 'password123', role: 'viewer' });
  } else {
    testUser.role = 'viewer';
    testUser.isActive = true;
    testUser.password = 'password123';
    await testUser.save();
  }

  try {
    console.log('--- Logging in as Admin ---');
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', { email: 'admin@trafficiq.app', password: 'password123' });
    const adminToken = loginRes.data.data.accessToken;

    console.log('1. Changing test user role to operator');
    const updateRes = await axios.put(`http://localhost:5000/api/v1/admin/users/${testUser._id}`, { role: 'operator' }, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('Update Status:', updateRes.status, 'New Role:', updateRes.data.data.role);

    console.log('2. Deactivating test user');
    const deactRes = await axios.patch(`http://localhost:5000/api/v1/admin/users/${testUser._id}/deactivate`, {}, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log('Deactivate Status:', deactRes.status, 'IsActive:', deactRes.data.data.isActive);

    console.log('2b. Testing login as deactivated user');
    try {
      await axios.post('http://localhost:5000/api/v1/auth/login', { email: 'test_user@trafficiq.app', password: 'password123' });
      console.log('ERROR: Deactivated user logged in!');
    } catch (err) {
      console.log('Login failed as expected:', err.response?.data?.message || err.message);
    }

    console.log('3. Checking audit log');
    const auditRes = await axios.get('http://localhost:5000/api/v1/admin/audit?limit=5', { headers: { Authorization: `Bearer ${adminToken}` } });
    const logs = auditRes.data.data;
    console.log('Recent Audit Logs:');
    logs.forEach(l => console.log(`- Action: ${l.action}, Target: ${l.resource}, By: ${l.userId?.email}`));

    console.log('4. Logging in as Non-Admin (operator) to test /admin access');
    testUser.isActive = true; // reactivate
    await testUser.save();
    const loginNonAdmin = await axios.post('http://localhost:5000/api/v1/auth/login', { email: 'test_user@trafficiq.app', password: 'password123' });
    const nonAdminToken = loginNonAdmin.data.data.accessToken;
    
    try {
      await axios.get('http://localhost:5000/api/v1/admin/users', { headers: { Authorization: `Bearer ${nonAdminToken}` } });
      console.log('ERROR: Non-admin accessed admin route!');
    } catch (err) {
      console.log('Non-admin access denied as expected:', err.response?.data?.message || err.message);
    }

  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
  } finally {
    mongoose.connection.close();
  }
}
test();
