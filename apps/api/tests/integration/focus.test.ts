import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '@ai-schedule-optimizer/database';
import { assertTestDatabaseIsolation, TestTracker } from '../testHelper';

describe('Focus Integration Tests', () => {
  const tracker = new TestTracker();
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;
  let courseAId: string;
  let taskAId: string;
  let taskA2Id: string;
  let taskBId: string;
  let studyBlockId: string;
  let focusSessionId: string;

  beforeAll(async () => {
    assertTestDatabaseIsolation();

    // User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({ email: `focus_user_a_${Date.now()}@example.com`, password: 'Password123!' });
    userAId = regA.body.data.user.id;
    userAToken = regA.body.data.token;
    tracker.trackUserId(userAId);

    // User B
    const regB = await request(app)
      .post('/api/auth/register')
      .send({ email: `focus_user_b_${Date.now()}@example.com`, password: 'Password123!' });
    userBId = regB.body.data.user.id;
    userBToken = regB.body.data.token;
    tracker.trackUserId(userBId);

    // Course & Tasks for User A
    const courseA = await prisma.course.create({
      data: { user_id: userAId, title: 'Calculus III' }
    });
    courseAId = courseA.id;

    const taskA = await prisma.task.create({
      data: { course_id: courseAId, title: 'Derivatives Problem Set', needs_review: false }
    });
    taskAId = taskA.id;

    const taskA2 = await prisma.task.create({
      data: { course_id: courseAId, title: 'Integrals Problem Set', needs_review: false }
    });
    taskA2Id = taskA2.id;

    // Course & Task for User B
    const courseB = await prisma.course.create({
      data: { user_id: userBId, title: 'History 101' }
    });
    const taskB = await prisma.task.create({
      data: { course_id: courseB.id, title: 'Essay 1', needs_review: false }
    });
    taskBId = taskB.id;

    // StudyBlock for User A linked to taskA
    const block = await prisma.studyBlock.create({
      data: {
        user_id: userAId,
        course_id: courseA.id,
        task_id: taskAId,
        title: 'Study: Derivatives',
        start_time: new Date(),
        end_time: new Date(Date.now() + 45 * 60 * 1000),
        status: 'pending',
      }
    });
    studyBlockId = block.id;
  });

  afterAll(async () => {
    await tracker.cleanup();
  });

  it('should validate that supplied taskId belongs to authenticated user', async () => {
    // Attempt to start session with taskBId (belongs to User B) using User A's token
    const res = await request(app)
      .post('/api/focus/start')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        taskId: taskBId,
        plannedMinutes: 30
      });

    expect(res.status).toBe(404);
  });

  it('should validate that supplied taskId is consistent with the selected study block', async () => {
    // studyBlockId is linked to taskAId, but we supply taskA2Id
    const res = await request(app)
      .post('/api/focus/start')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        studyBlockId,
        taskId: taskA2Id,
        plannedMinutes: 30
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('inconsistent');
  });

  it('should start a focus session with ACTIVE status when inputs are valid', async () => {
    const res = await request(app)
      .post('/api/focus/start')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        studyBlockId,
        taskId: taskAId,
        plannedMinutes: 45
      });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.planned_minutes).toBe(45);
    focusSessionId = res.body.id;
  });

  it('should retrieve the active focus session via /api/focus/active for recovery on refresh', async () => {
    const res = await request(app)
      .get('/api/focus/active')
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
    expect(res.body.id).toBe(focusSessionId);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('should pause an active focus session', async () => {
    const res = await request(app)
      .patch(`/api/focus/${focusSessionId}/pause`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('PAUSED');
    expect(res.body.paused_at).toBeDefined();
  });

  it('should resume a paused focus session and accumulate pause time', async () => {
    await new Promise((r) => setTimeout(r, 100));

    const res = await request(app)
      .patch(`/api/focus/${focusSessionId}/resume`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.paused_at).toBeNull();
  });

  it('should reject pausing or modifying session if owned by another user', async () => {
    const res = await request(app)
      .patch(`/api/focus/${focusSessionId}/pause`)
      .set('Authorization', `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
  });

  it('should complete focus session, update study block status, and record metrics', async () => {
    const res = await request(app)
      .patch(`/api/focus/${focusSessionId}/complete`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.end_time).toBeDefined();
    expect(res.body.actual_minutes).toBeGreaterThanOrEqual(0);

    const block = await prisma.studyBlock.findUnique({ where: { id: studyBlockId } });
    expect(block?.status).toBe('completed');

    const metrics = await prisma.focusMetric.findMany({ where: { session_id: focusSessionId } });
    expect(metrics.length).toBe(3);
  });

  it('should prevent duplicate completion metrics under two simultaneous completion requests', async () => {
    // Create another active focus session
    const sessionRes = await request(app)
      .post('/api/focus/start')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ taskId: taskAId, plannedMinutes: 25 });
    const secondSessionId = sessionRes.body.id;

    // Fire two simultaneous completion requests
    const [res1, res2] = await Promise.all([
      request(app)
        .patch(`/api/focus/${secondSessionId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`),
      request(app)
        .patch(`/api/focus/${secondSessionId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.status).toBe('COMPLETED');
    expect(res2.body.status).toBe('COMPLETED');

    // Exactly one set of 3 metrics must exist for secondSessionId
    const sessionMetrics = await prisma.focusMetric.findMany({
      where: { session_id: secondSessionId }
    });
    expect(sessionMetrics.length).toBe(3);
  });

  it('should roll back completely on failure between updates and recover on retry', async () => {
    // Create third active session
    const sessionRes = await request(app)
      .post('/api/focus/start')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ taskId: taskAId, plannedMinutes: 20 });
    const thirdSessionId = sessionRes.body.id;

    // Inject failure inside transaction
    const originalTransaction = prisma.$transaction.bind(prisma);
    const spy = vi.spyOn(prisma, '$transaction').mockImplementationOnce(async () => {
      throw new Error('Injected database error during completion');
    });

    const failRes = await request(app)
      .patch(`/api/focus/${thirdSessionId}/complete`)
      .set('Authorization', `Bearer ${userAToken}`);

    spy.mockRestore();

    expect(failRes.status).toBe(500);

    // Verify session remained ACTIVE (not partially completed)
    const sessionInDb = await prisma.focusSession.findUnique({ where: { id: thirdSessionId } });
    expect(sessionInDb?.status).toBe('ACTIVE');

    // No metrics created
    const metricsBeforeRetry = await prisma.focusMetric.findMany({ where: { session_id: thirdSessionId } });
    expect(metricsBeforeRetry.length).toBe(0);

    // Retry should recover and complete cleanly
    const retryRes = await request(app)
      .patch(`/api/focus/${thirdSessionId}/complete`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.status).toBe('COMPLETED');

    const metricsAfterRetry = await prisma.focusMetric.findMany({ where: { session_id: thirdSessionId } });
    expect(metricsAfterRetry.length).toBe(3);
  });

  it('should handle concurrent pause and complete requests safely and prevent status regression', async () => {
    // 1. Start active session
    const startRes = await request(app)
      .post('/api/focus/start')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ taskId: taskAId, plannedMinutes: 30 });
    const sessionId = startRes.body.id;

    // 2. Fire simultaneous pause and complete requests
    const [pauseRes, completeRes] = await Promise.all([
      request(app)
        .patch(`/api/focus/${sessionId}/pause`)
        .set('Authorization', `Bearer ${userAToken}`),
      request(app)
        .patch(`/api/focus/${sessionId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`),
    ]);

    // One of them must succeed; the final status in DB must always end up COMPLETED
    const dbSession = await prisma.focusSession.findUnique({ where: { id: sessionId } });
    expect(dbSession?.status).toBe('COMPLETED');

    // Metrics must be inserted exactly once
    const metrics = await prisma.focusMetric.findMany({ where: { session_id: sessionId } });
    expect(metrics.length).toBe(3);

    // 3. A delayed pause request must NEVER revert the completed session to PAUSED
    const delayedPause = await request(app)
      .patch(`/api/focus/${sessionId}/pause`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(delayedPause.status).toBe(400);

    const checkAfterDelayed = await prisma.focusSession.findUnique({ where: { id: sessionId } });
    expect(checkAfterDelayed?.status).toBe('COMPLETED');
  });

  it('should handle concurrent resume and complete requests safely and prevent status regression', async () => {
    // 1. Start session and pause it
    const startRes = await request(app)
      .post('/api/focus/start')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ taskId: taskAId, plannedMinutes: 45 });
    const sessionId = startRes.body.id;

    await request(app)
      .patch(`/api/focus/${sessionId}/pause`)
      .set('Authorization', `Bearer ${userAToken}`);

    const pausedDb = await prisma.focusSession.findUnique({ where: { id: sessionId } });
    expect(pausedDb?.status).toBe('PAUSED');

    // 2. Fire simultaneous resume and complete requests
    const [resumeRes, completeRes] = await Promise.all([
      request(app)
        .patch(`/api/focus/${sessionId}/resume`)
        .set('Authorization', `Bearer ${userAToken}`),
      request(app)
        .patch(`/api/focus/${sessionId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`),
    ]);

    // Final state in DB must be COMPLETED
    const finalDb = await prisma.focusSession.findUnique({ where: { id: sessionId } });
    expect(finalDb?.status).toBe('COMPLETED');

    // Metrics must exist and have exactly 1 set of 3 metrics
    const metrics = await prisma.focusMetric.findMany({ where: { session_id: sessionId } });
    expect(metrics.length).toBe(3);

    // 3. A delayed resume request must NEVER revert the completed session to ACTIVE
    const delayedResume = await request(app)
      .patch(`/api/focus/${sessionId}/resume`)
      .set('Authorization', `Bearer ${userAToken}`);
    expect(delayedResume.status).toBe(400);

    const checkAfterDelayed = await prisma.focusSession.findUnique({ where: { id: sessionId } });
    expect(checkAfterDelayed?.status).toBe('COMPLETED');
  });
});
