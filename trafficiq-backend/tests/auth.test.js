process.env.JWT_SECRET = 'testsecret';
process.env.JWT_REFRESH_SECRET = 'testrefreshsecret';
const request = require('supertest');
const app = require('../src/app');
const { setupDB, teardownDB, clearDB } = require('./setup');
const User = require('../src/models/User');

beforeAll(async () => await setupDB());
afterAll(async () => await teardownDB());
afterEach(async () => await clearDB());

describe('Auth Controller', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Test User',
        email: 'test@example.com',
        password: 'Password123!',
      });
    
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBeTruthy();
    expect(res.body.data.user.email).toEqual('test@example.com');
  });

  it('should fail to register with existing email', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Test User', email: 'test@example.com', password: 'Password123!',
    });
    
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Another User', email: 'test@example.com', password: 'Password123!',
      });
      
    expect(res.statusCode).toEqual(409);
    expect(res.body.success).toBeFalsy();
  });
  
  it('should login an existing user', async () => {
    await request(app).post('/api/v1/auth/register').send({
      name: 'Test User', email: 'test@example.com', password: 'Password123!',
    });
    
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Password123!' });
      
    expect(res.statusCode).toEqual(200);
    expect(res.body.data.accessToken).toBeDefined();
  });
});
