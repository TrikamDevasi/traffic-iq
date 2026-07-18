const axios = require('axios');
async function test() {
  try {
    const login = await axios.post('http://127.0.0.1:5000/api/v1/auth/login', {email: 'admin@trafficiq.app', password: 'password123'});
    const token = login.data.data.accessToken;
    console.log('Login OK');

    const res = await axios.get('http://127.0.0.1:5000/api/v1/signals/INT-001/optimal', {
      headers: { Authorization: 'Bearer ' + token }
    });
    console.log('SUCCESS:', JSON.stringify(res.data, null, 2));
  } catch(e) {
    console.error('FULL ERROR:', e.response ? e.response.data : e.message);
    if (!e.response) console.error(e);
  }
}
test();
