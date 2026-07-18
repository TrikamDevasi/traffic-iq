const axios = require('axios');
require('dotenv').config();

async function test() {
  try {
    // 1. Login
    const loginRes = await axios.post('http://localhost:5000/api/v1/auth/login', {
      email: 'admin@trafficiq.app',
      password: 'password123'
    });
    const token = loginRes.data.data.accessToken;
    console.log('Got token:', token ? 'yes' : 'no');

    // 2. Start simulation 1 (duration: 60)
    console.log('Starting simulation 1 (duration 60s)...');
    const syncRes1 = await axios.post('http://localhost:5000/api/v1/simulations/run', {
      scenario: 'Test Sync 1',
      duration: 60,
      controllerType: 'MARL',
      comparedTo: 'fixed-time'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Sim 1 Response:', syncRes1.data.data.avgWaitTimeReduction, syncRes1.data.data.avgTravelTimeReduction);

    // 3. Start simulation 2 (duration: 120)
    console.log('Starting simulation 2 (duration 120s)...');
    const syncRes2 = await axios.post('http://localhost:5000/api/v1/simulations/run', {
      scenario: 'Test Sync 2',
      duration: 120,
      controllerType: 'MARL',
      comparedTo: 'fixed-time'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Sim 2 Response:', syncRes2.data.data.avgWaitTimeReduction, syncRes2.data.data.avgTravelTimeReduction);

    // 4. Test bad config
    try {
      await axios.post('http://localhost:5000/api/v1/simulations/run', {
        comparedTo: 'invalid-choice'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (err) {
      console.log('Bad config response:', err.response.status, err.response.data);
    }
  } catch (err) {
    console.error('Test failed:', err.response?.data || err.message);
  }
}
test();
