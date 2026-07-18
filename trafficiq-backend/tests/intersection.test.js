const request = require('supertest');
const app = require('../src/app');
const { setupDB, teardownDB, clearDB } = require('./setup');
const Intersection = require('../src/models/Intersection');
const jwt = require('jsonwebtoken');

beforeAll(async () => await setupDB());
afterAll(async () => await teardownDB());
afterEach(async () => await clearDB());

const generateAdminToken = () => {
  return jwt.sign({ id: 'dummy_id', role: 'admin' }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
};

describe('Intersection Controller', () => {
  let token;
  
  beforeAll(() => {
    process.env.JWT_SECRET = 'testsecret';
    token = generateAdminToken();
  });

  it('should create an intersection successfully', async () => {
    const res = await request(app)
      .post('/api/v1/intersections')
      .set('Authorization', `Bearer ${token}`)
      .send({
        intersectionId: 'INT-001',
        name: 'Main & 1st',
        location: { type: 'Point', coordinates: [72.5714, 23.0225] },
        laneCount: 4,
        phases: [
          { phaseId: 0, name: 'NS Green', duration: 30, direction: 'NS' },
          { phaseId: 1, name: 'EW Green', duration: 30, direction: 'EW' }
        ],
        status: 'online'
      });
      
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBeTruthy();
    expect(res.body.data.intersectionId).toEqual('INT-001');
  });

  it('should fail to create without admin token', async () => {
    const res = await request(app)
      .post('/api/v1/intersections')
      .send({
        intersectionId: 'INT-002',
        name: 'Main & 2nd',
        location: { type: 'Point', coordinates: [72.5714, 23.0225] },
      });
      
    expect(res.statusCode).toEqual(401);
  });
});
