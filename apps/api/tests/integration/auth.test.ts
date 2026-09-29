import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { assertTestDatabaseIsolation, TestTracker } from '../testHelper';

describe('Auth Integration Tests', () => {
  assertTestDatabaseIsolation();
  const tracker = new TestTracker();

  const testEmail = `test_auth_${Date.now()}@example.com`;
  const testPassword = 'Password123!';
  let userToken: string;

  afterAll(async () => {
    await tracker.cleanup();
  });

  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.token).toBeDefined();

    tracker.trackUserId(res.body.data.user.id);
  });

  it('should reject registering with a duplicate email', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(400);
    expect(res.body.status).toBe('error');
  });

  it('should login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: testPassword });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.token).toBeDefined();
    userToken = res.body.data.token;
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: testEmail, password: 'WrongPassword!' });

    expect(res.status).toBe(401);
  });

  it('should restore session via /api/auth/me with valid Bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.user.email).toBe(testEmail);
  });

  it('should reject unauthenticated access to protected routes', async () => {
    const res = await request(app)
      .get('/api/dashboard/today');

    expect(res.status).toBe(401);
  });

  it('should reject requests with malformed tokens', async () => {
    const res = await request(app)
      .get('/api/dashboard/today')
      .set('Authorization', 'Bearer invalid-token-xyz');

    expect(res.status).toBe(401);
  });
});
