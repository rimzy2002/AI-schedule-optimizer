import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '@ai-schedule-optimizer/database';
import { assertTestDatabaseIsolation, TestTracker } from '../testHelper';

// Mock Gemini to prevent test jobs or calls from reaching the paid provider
vi.mock('../../src/services/ai/gemini.service', () => ({
  geminiService: {
    generateText: vi.fn().mockResolvedValue(
      JSON.stringify({
        course: 'Intro to CS',
        tasks: [{ name: 'Assignment 1', type: 'assignment', weight: 10, deadline: '2026-11-15T23:59:00Z' }]
      })
    ),
  },
}));

describe('Syllabus Integration Tests', () => {
  const tracker = new TestTracker();
  let userAToken: string;
  let userBToken: string;
  let userAJobId: string;

  beforeAll(async () => {
    assertTestDatabaseIsolation();

    // User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({ email: `syl_user_a_${Date.now()}@example.com`, password: 'Password123!' });
    const userAId = regA.body.data.user.id;
    userAToken = regA.body.data.token;
    tracker.trackUserId(userAId);

    // User B
    const regB = await request(app)
      .post('/api/auth/register')
      .send({ email: `syl_user_b_${Date.now()}@example.com`, password: 'Password123!' });
    const userBId = regB.body.data.user.id;
    userBToken = regB.body.data.token;
    tracker.trackUserId(userBId);
  });

  afterAll(async () => {
    await tracker.cleanup();
  });

  it('should reject syllabus extraction without authentication', async () => {
    const res = await request(app)
      .post('/api/syllabi/extract')
      .send({ rawText: 'Syllabus content' });

    expect(res.status).toBe(401);
  });

  it('should reject syllabus extraction with empty rawText', async () => {
    const res = await request(app)
      .post('/api/syllabi/extract')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ rawText: '   ' });

    expect(res.status).toBe(400);
  });

  it('should create syllabus and enqueue job successfully with valid input', async () => {
    const res = await request(app)
      .post('/api/syllabi/extract')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        rawText: 'CS 101 Intro to Computer Science\nAssignment 1 due Nov 15 2026, weight 10%'
      });

    expect(res.status).toBe(202);
    expect(res.body.jobId).toBeDefined();
    expect(res.body.syllabusId).toBeDefined();
    expect(res.body.courseId).toBeDefined();
    userAJobId = res.body.jobId;

    // Verify syllabus record created
    const syllabus = await prisma.syllabus.findUnique({ where: { id: res.body.syllabusId } });
    expect(syllabus).toBeDefined();
    expect(['pending', 'processing']).toContain(syllabus?.analysis_status);
  });

  it('should reject query for job status if job belongs to another user (cross-user access)', async () => {
    const res = await request(app)
      .get(`/api/syllabi/jobs/${userAJobId}`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(403);
  });

  it('should allow job status query by the job owner', async () => {
    const res = await request(app)
      .get(`/api/syllabi/jobs/${userAJobId}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(['queued', 'processing', 'completed', 'failed']).toContain(res.body.status);
  });
});
