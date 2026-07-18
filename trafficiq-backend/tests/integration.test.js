const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');

// Mock external services to prevent network calls during testing
jest.mock('../src/config/redis', () => ({
  redisClient: {
    get: jest.fn(),
    set: jest.fn(),
    setex: jest.fn(),
  },
  isRedisConnected: () => true
}));

jest.mock('../src/config/mqtt', () => ({
  publishAction: jest.fn(),
  isMQTTConnected: () => true
}));

// Mock ML Service API calls
jest.mock('axios', () => ({
  post: jest.fn((url) => {
    if (url.includes('/predict')) {
      return Promise.resolve({ data: { recommended_phase: 2, green_duration: 45, confidence: 0.95 } });
    }
    return Promise.resolve({ data: {} });
  }),
  create: jest.fn(function () {
    return this;
  }),
}));

let mongoServer;
let adminToken;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  await mongoose.connect(mongoUri);

  // Seed an admin user
  const adminUser = new User({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    password: 'password123', // Will be hashed by pre-save hook
    role: 'admin',
    department: 'Traffic Control',
  });
  await adminUser.save();
  
  // Seed an operator user
  const operatorUser = new User({
    firstName: 'Operator',
    lastName: 'User',
    email: 'operator@test.com',
    password: 'password123',
    role: 'operator',
    department: 'Traffic Control',
  });
  await operatorUser.save();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Integration Tests', () => {
  
  describe('Auth: Login', () => {
    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'wrong' });
      expect(res.statusCode).toBe(401);
    });

    it('should return auth token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });
      
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe('admin');
      
      adminToken = res.body.data.accessToken; // Save for later tests
    });
  });

  describe('Signal: Predict', () => {
    it('should successfully call predict phase for an intersection', async () => {
      const res = await request(app)
        .post('/api/v1/signals/test-intersection/predict')
        .set('Authorization', `Bearer ${adminToken}`);
      
      // We expect the mocked ML response to be processed and returned
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.recommended_phase).toBe(2);
      expect(res.body.data.green_duration).toBe(45);
    });

    it('should prevent unauthorized access to predict', async () => {
      const res = await request(app)
        .post('/api/v1/signals/test-intersection/predict');
      
      expect(res.statusCode).toBe(401); // No token provided
    });
  });

  describe('Admin: Updates', () => {
    it('should update user role if admin', async () => {
      // Find operator user
      const operator = await User.findOne({ email: 'operator@test.com' });
      
      const res = await request(app)
        .put(`/api/v1/admin/users/${operator._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'admin' });
        
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.role).toBe('admin');
    });

    it('should deny role update if not admin', async () => {
      // Login as the (now admin) operator, but wait, let's create a viewer
      const viewer = new User({
        firstName: 'Viewer',
        lastName: 'User',
        email: 'viewer@test.com',
        password: 'password123',
        role: 'viewer',
        department: 'Public',
      });
      await viewer.save();

      // Get viewer token
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'viewer@test.com', password: 'password123' });
      const viewerToken = loginRes.body.data.accessToken;

      const operator = await User.findOne({ email: 'operator@test.com' });

      const res = await request(app)
        .put(`/api/v1/admin/users/${operator._id}/role`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ role: 'admin' });
        
      expect(res.statusCode).toBe(403); // Forbidden
    });
  });

});
