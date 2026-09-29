import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '@ai-schedule-optimizer/database';
import { assertTestDatabaseIsolation, TestTracker } from '../testHelper';
import jwt from 'jsonwebtoken';
import { env } from '../../src/config/env';

describe('Settings API Integration', () => {
  const tracker = new TestTracker();
  let testUserId: string;
  let authToken: string;

  beforeAll(async () => {
    await assertTestDatabaseIsolation();

    const user = await prisma.user.create({
      data: {
        email: `settings_api_${Date.now()}@example.com`,
        password_hash: 'hashedpassword',
      },
    });
    testUserId = user.id;
    tracker.trackUserId(testUserId);

    authToken = jwt.sign({ id: user.id, email: user.email }, env.jwtSecret, { expiresIn: '1h' });
  });

  afterAll(async () => {
    await tracker.cleanup();
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
  });

  it('returns default settings for new user', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe('Asia/Colombo');
    expect(res.body.startHour).toBe(8);
    expect(res.body.endHour).toBe(22);
    expect(res.body.maxSessionDuration).toBe(90);
  });

  it('saves updated settings durably and returns 200', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        timezone: 'America/New_York',
        startHour: 10,
        endHour: 18,
        maxSessionDuration: 60,
      });

    expect(res.status).toBe(200);
    expect(res.body.settings.timezone).toBe('America/New_York');
    expect(res.body.settings.startHour).toBe(10);
    expect(res.body.settings.endHour).toBe(18);
    expect(res.body.settings.maxSessionDuration).toBe(60);

    // Verify directly in MySQL test database
    const dbRecord = await prisma.userSettings.findUnique({
      where: { user_id: testUserId },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.timezone).toBe('America/New_York');
    expect(dbRecord?.start_hour).toBe(10);
    expect(dbRecord?.end_hour).toBe(18);
    expect(dbRecord?.max_session_duration).toBe(60);
  });

  it('rejects invalid study hours where start >= end with 400', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        startHour: 20,
        endHour: 8,
      });

    expect(res.status).toBe(400);
  });

  it('rejects invalid timezone identifier with 400', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        timezone: 'Invalid/NonExistent_Zone',
      });

    expect(res.status).toBe(400);
  });

  it('persists changes across subsequent GET calls', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.timezone).toBe('America/New_York');
    expect(res.body.startHour).toBe(10);
    expect(res.body.endHour).toBe(18);
    expect(res.body.maxSessionDuration).toBe(60);
  });
});
