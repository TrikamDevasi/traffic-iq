process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
const request = require('supertest');
const app = require('../src/app');
const { setupDB, teardownDB, clearDB } = require('./setup');
const jwt = require('jsonwebtoken');

beforeAll(async () => await setupDB());
afterAll(async () => await teardownDB());
afterEach(async () => await clearDB());

const generateToken = () => jwt.sign({ id: 'dummy', role: 'admin' }, 'testsecret', { expiresIn: '1h' });

describe('Traffic Controller', () => {
  it('should get live traffic data successfully', async () => {
    const res = await request(app)
      .get('/api/v1/traffic/live')
      .set('Authorization', `Bearer ${generateToken()}`);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBeTruthy();
    expect(Array.isArray(res.body.data)).toBeTruthy();
  });
});
