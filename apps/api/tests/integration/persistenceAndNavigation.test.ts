import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '@ai-schedule-optimizer/database';
import { assertTestDatabaseIsolation, TestTracker } from '../testHelper';

describe('Persistence, Recovery, and Navigation Integration Tests', () => {
  const tracker = new TestTracker();
  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;
  let courseId: string;

  beforeAll(async () => {
    assertTestDatabaseIsolation();

    // Register User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({ email: `persist_a_${Date.now()}@example.com`, password: 'Password123!' });
    userAToken = regA.body.data.token;
    userAId = regA.body.data.user.id;
    tracker.trackUserId(userAId);

    // Register User B
    const regB = await request(app)
      .post('/api/auth/register')
      .send({ email: `persist_b_${Date.now()}@example.com`, password: 'Password123!' });
    userBToken = regB.body.data.token;
    userBId = regB.body.data.user.id;
    tracker.trackUserId(userBId);

    // Create course for User A
    const course = await prisma.course.create({
      data: {
        user_id: userAId,
        title: 'Distributed Systems 501',
      }
    });
    courseId = course.id;
  });

  afterAll(async () => {
    await tracker.cleanup();
  });

  describe('Server-Backed Draft Task CRUD', () => {
    let createdTaskId: string;
    let initialUpdatedAt: string;

    it('should create an incomplete draft task without deadline and keep it needs_review=true', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          courseId,
          title: 'Draft Project Proposal',
          type: 'assignment',
          weight: 15,
          estimatedDuration: 90,
          deadline: null, // Incomplete draft without deadline
          needsReview: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.title).toBe('Draft Project Proposal');
      expect(res.body.deadline).toBeNull();
      expect(res.body.needs_review).toBe(true);

      createdTaskId = res.body.id;
      initialUpdatedAt = res.body.updated_at;

      // Verify in DB
      const dbTask = await prisma.task.findUnique({ where: { id: createdTaskId } });
      expect(dbTask).toBeDefined();
      expect(dbTask?.needs_review).toBe(true);
      expect(dbTask?.deadline).toBeNull();
    });

    it('should update draft task and preserve draft status while saving changes to server', async () => {
      const res = await request(app)
        .patch(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Draft Project Proposal - Revised',
          deadline: '2026-11-20',
          is_date_only: true,
          estimated_duration: 120,
          needs_review: true, // Keep as draft
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Draft Project Proposal - Revised');
      expect(res.body.deadline).toBe('2026-11-20');
      expect(res.body.is_date_only).toBe(true);
      expect(res.body.estimated_duration).toBe(120);
      expect(res.body.needs_review).toBe(true);

      // Verify DB persistence
      const dbTask = await prisma.task.findUnique({ where: { id: createdTaskId } });
      expect(dbTask?.title).toBe('Draft Project Proposal - Revised');
      expect(dbTask?.is_date_only).toBe(true);
      expect(dbTask?.needs_review).toBe(true);
    });

    it('should detect concurrent edits and reject stale updates with 409 Conflict', async () => {
      // Pass a stale expected_updated_at from before the previous update
      const res = await request(app)
        .patch(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Stale Edit',
          expected_updated_at: new Date(new Date(initialUpdatedAt).getTime() - 10000).toISOString(),
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('Conflict');
      expect(res.body.serverTask).toBeDefined();
    });

    it('should explicitly delete a task via DELETE /api/tasks/:id', async () => {
      // Create a temporary task to delete
      const tempRes = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          courseId,
          title: 'Temporary Task to Delete',
          needsReview: true,
        });

      expect(tempRes.status).toBe(201);
      const tempId = tempRes.body.id;

      // Delete it
      const delRes = await request(app)
        .delete(`/api/tasks/${tempId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delRes.status).toBe(200);
      expect(delRes.body.success).toBe(true);

      // Verify removed from DB
      const checkDb = await prisma.task.findUnique({ where: { id: tempId } });
      expect(checkDb).toBeNull();
    });

    it('should reject deleting a task owned by another user', async () => {
      const delRes = await request(app)
        .delete(`/api/tasks/${createdTaskId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(delRes.status).toBe(404);

      // Task should still exist
      const checkDb = await prisma.task.findUnique({ where: { id: createdTaskId } });
      expect(checkDb).toBeDefined();
    });
  });

  describe('Server-Backed Settings Preferences', () => {
    it('should get default user settings', async () => {
      const res = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.timezone).toBeDefined();
      expect(res.body.startHour).toBeDefined();
      expect(res.body.endHour).toBeDefined();
    });

    it('should reject invalid timezone with 400', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          timezone: 'Not/A/Valid/Timezone_123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should reject invalid study hours where start >= end with 400', async () => {
      const res = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          startHour: 20,
          endHour: 10,
        });

      expect(res.status).toBe(400);
    });

    it('should successfully save valid settings and persist across requests', async () => {
      const updateRes = await request(app)
        .put('/api/settings')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          timezone: 'America/New_York',
          startHour: 9,
          endHour: 21,
          maxSessionDuration: 60,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.settings.timezone).toBe('America/New_York');
      expect(updateRes.body.settings.startHour).toBe(9);
      expect(updateRes.body.settings.endHour).toBe(21);
      expect(updateRes.body.settings.maxSessionDuration).toBe(60);

      // Read back via GET
      const getRes = await request(app)
        .get('/api/settings')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.timezone).toBe('America/New_York');
      expect(getRes.body.startHour).toBe(9);
      expect(getRes.body.endHour).toBe(21);
    });
  });

  describe('Courses Listing and Details Navigation', () => {
    it('should return courses with task metrics, syllabi, and schedules', async () => {
      const res = await request(app)
        .get('/api/courses')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      const found = res.body.find((c: any) => c.id === courseId);
      expect(found).toBeDefined();
      expect(found.title).toBe('Distributed Systems 501');
      expect(typeof found.taskCount).toBe('number');
      expect(typeof found.pendingReviewCount).toBe('number');
      expect(typeof found.confirmedCount).toBe('number');
    });

    it('should return course details with enriched metrics via direct link ID', async () => {
      const res = await request(app)
        .get(`/api/courses/${courseId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(courseId);
      expect(res.body.title).toBe('Distributed Systems 501');
      expect(res.body.tasks).toBeDefined();
    });
  });

  describe('Schedule Listing & Recovery', () => {
    it('should list schedules for user via /api/schedule/list', async () => {
      const res = await request(app)
        .get('/api/schedule/list')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('Dashboard Scope & Upcoming Blocks', () => {
    it('should include nextUpcomingBlock and summary metrics in today dashboard', async () => {
      const res = await request(app)
        .get('/api/dashboard/today')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.todayBlocks).toBeDefined();
      expect(res.body.upcomingDeadlines).toBeDefined();
      expect(res.body.totalCoursesCount).toBeGreaterThanOrEqual(1);
      expect(typeof res.body.totalStudyBlocksCount).toBe('number');
    });
  });
});
