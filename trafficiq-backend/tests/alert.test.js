const request = require('supertest');
const app = require('../src/app');
const { setupDB, teardownDB, clearDB } = require('./setup');
const jwt = require('jsonwebtoken');
const Alert = require('../src/models/Alert');

beforeAll(async () => await setupDB());
afterAll(async () => await teardownDB());
afterEach(async () => await clearDB());

const generateToken = (role = 'operator') => jwt.sign({ id: 'dummy', role }, 'testsecret', { expiresIn: '1h' });

describe('Alert Controller', () => {
  beforeAll(() => { process.env.JWT_SECRET = 'testsecret'; });

  it('should list alerts successfully', async () => {
    await Alert.create({
      alertId: 'ALT-123',
      intersectionId: 'INT-001',
      type: 'congestion',
      severity: 'high',
      message: 'Heavy traffic detected.'
    });

    const res = await request(app)
      .get('/api/v1/alerts')
      .set('Authorization', `Bearer ${generateToken('viewer')}`);
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.length).toEqual(1);
  });

  it('should fail to resolve alert with viewer role', async () => {
    const alert = await Alert.create({
      alertId: 'ALT-124',
      intersectionId: 'INT-001',
      type: 'congestion',
      severity: 'high',
      message: 'Heavy traffic detected.'
    });

    const res = await request(app)
      .patch(`/api/v1/alerts/${alert._id}/resolve`)
      .set('Authorization', `Bearer ${generateToken('viewer')}`)
      .send({ resolutionNotes: 'Fixed' });
      
    expect(res.statusCode).toEqual(403);
  });
});
