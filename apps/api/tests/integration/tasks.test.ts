import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '@ai-schedule-optimizer/database';
import { assertTestDatabaseIsolation, TestTracker } from '../testHelper';

describe('Tasks Integration Tests', () => {
  const tracker = new TestTracker();
  let userAId: string;
  let userAToken: string;
  let userBToken: string;
  let courseAId: string;
  let task1Id: string;

  beforeAll(async () => {
    assertTestDatabaseIsolation();

    // Create User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({ email: `task_user_a_${Date.now()}@example.com`, password: 'Password123!' });
    userAId = regA.body.data.user.id;
    userAToken = regA.body.data.token;
    tracker.trackUserId(userAId);

    // Create User B
    const regB = await request(app)
      .post('/api/auth/register')
      .send({ email: `task_user_b_${Date.now()}@example.com`, password: 'Password123!' });
    const userBId = regB.body.data.user.id;
    userBToken = regB.body.data.token;
    tracker.trackUserId(userBId);

    // Create Course for User A
    const courseA = await prisma.course.create({
      data: {
        user_id: userAId,
        title: 'Computer Science 101',
      }
    });
    courseAId = courseA.id;

    // Create initial task for Course A
    const task = await prisma.task.create({
      data: {
        course_id: courseAId,
        title: 'Initial Assignment',
        deadline: new Date('2026-11-01T23:59:59.000Z'),
        weight: 10,
        estimated_duration: 60,
        needs_review: true,
      }
    });
    task1Id = task.id;
  });

  afterAll(async () => {
    await tracker.cleanup();
  });

  it('should reject confirming tasks if course belongs to another user (cross-user check)', async () => {
    const res = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        courseId: courseAId,
        tasks: [
          { name: 'Hacked Task', deadline: new Date().toISOString() }
        ]
      });

    expect(res.status).toBe(404);
  });

  it('should atomically confirm tasks, preserve stable IDs, and keep valid 0 weight and duration', async () => {
    const res = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        courseId: courseAId,
        tasks: [
          {
            id: task1Id, // Existing task ID must be preserved
            name: 'Updated Assignment 1',
            type: 'assignment',
            weight: 0, // Valid 0 weight (ungraded)
            estimated_duration: 90, // Explicit duration
            deadline: new Date('2026-11-02T23:59:59.000Z').toISOString(),
            description: 'Read chapter 3 before writing code',
            recurring: false,
          },
          {
            name: 'New Quiz 1',
            type: 'quiz',
            weight: 15,
            estimated_duration: 45,
            deadline: new Date('2026-11-05T23:59:59.000Z').toISOString(),
          }
        ]
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.count).toBe(2);

    // Verify task1Id was preserved and updated in-place
    const updatedTask = await prisma.task.findUnique({ where: { id: task1Id } });
    expect(updatedTask).toBeDefined();
    expect(updatedTask?.title).toBe('Updated Assignment 1');
    expect(updatedTask?.weight).toBe(0); // Preserved 0 weight, not null!
    expect(updatedTask?.estimated_duration).toBe(90);
    expect(updatedTask?.description).toBe('Read chapter 3 before writing code');
    expect(updatedTask?.needs_review).toBe(false);
  });

  it('should distinguish date-only input from explicit timestamp deadlines during confirmation', async () => {
    const res = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        courseId: courseAId,
        tasks: [
          {
            id: task1Id,
            name: 'Updated Assignment 1',
            deadline: '2026-11-15', // Date-only input (YYYY-MM-DD)
            weight: 10,
          },
          {
            name: 'Project with Exact Timestamp',
            deadline: '2026-11-20T14:30:00.000Z', // Explicit timestamp deadline
            weight: 20,
          }
        ]
      });

    expect(res.status).toBe(200);

    const dateOnlyTask = await prisma.task.findUnique({ where: { id: task1Id } });
    expect(dateOnlyTask?.is_date_only).toBe(true);

    const explicitTask = await prisma.task.findFirst({
      where: { course_id: courseAId, title: 'Project with Exact Timestamp' }
    });
    expect(explicitTask?.is_date_only).toBe(false);
    expect(explicitTask?.deadline?.toISOString()).toBe('2026-11-20T14:30:00.000Z');
  });

  it('should preserve deadline when performing partial updates (e.g. updating title)', async () => {
    const originalTask = await prisma.task.findUnique({ where: { id: task1Id } });
    const originalDeadline = originalTask?.deadline;

    // Update only the title
    const res = await request(app)
      .patch(`/api/tasks/${task1Id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Assignment 1 Renamed'
      });

    expect(res.status).toBe(200);

    const reloaded = await prisma.task.findUnique({ where: { id: task1Id } });
    expect(reloaded?.title).toBe('Assignment 1 Renamed');
    // Deadline must NOT be cleared by partial update
    expect(reloaded?.deadline?.toISOString()).toBe(originalDeadline?.toISOString());
  });

  it('should reject updating tasks owned by another user', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${task1Id}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .send({
        title: 'Unauthorized Rename'
      });

    expect(res.status).toBe(404);
  });

  it('should preserve exact timestamp and is_date_only flag when editing only a title during confirmation', async () => {
    // 1. Create a task with an explicit timed deadline
    const timedTask = await prisma.task.create({
      data: {
        course_id: courseAId,
        title: 'Midterm Exam Timed',
        deadline: new Date('2026-11-12T15:45:00.000Z'),
        is_date_only: false,
        weight: 25,
        needs_review: true,
      }
    });

    // 2. Confirm tasks where student only edited the task title, keeping deadline ISO string identical
    const res = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        courseId: courseAId,
        tasks: [
          {
            id: timedTask.id,
            name: 'Midterm Exam - Final Room 101', // title edited
            type: 'exam',
            weight: 25,
            deadline: timedTask.deadline?.toISOString(), // unchanged deadline string passed from frontend
          }
        ]
      });

    expect(res.status).toBe(200);

    const reloaded = await prisma.task.findUnique({ where: { id: timedTask.id } });
    expect(reloaded?.title).toBe('Midterm Exam - Final Room 101');
    expect(reloaded?.deadline?.toISOString()).toBe('2026-11-12T15:45:00.000Z');
    expect(reloaded?.is_date_only).toBe(false); // must NOT be changed to date-only!
  });

  it('should ensure an imported date-only deadline stays date-only through worker persistence', async () => {
    // Create syllabus record
    const syllabus = await prisma.syllabus.create({
      data: {
        user_id: userAId,
        course_id: courseAId,
        course_name: 'Software Engineering',
        extracted_text: 'Syllabus text here',
      }
    });

    const mockParser = {
      parse: async () => ({
        course: 'Software Engineering',
        tasks: [
          {
            name: 'Design Document',
            type: 'assignment' as const,
            weight: 20,
            deadline: '2026-11-18', // Date-only string (no invented time!)
            isDateOnly: true,
            estimatedDuration: 120,
            recurring: false,
          }
        ]
      })
    };

    const { processSyllabusJob } = await import('../../src/workers/syllabus.worker');
    await processSyllabusJob(
      {
        rawText: 'text',
        userId: userAId,
        courseId: courseAId,
        syllabusId: syllabus.id,
      },
      prisma,
      mockParser as any
    );

    const task = await prisma.task.findFirst({
      where: { course_id: courseAId, title: 'Design Document' }
    });
    expect(task).toBeDefined();
    expect(task?.is_date_only).toBe(true);
    // Preserves calendar date without invented hour
    expect(task?.deadline?.toISOString().split('T')[0]).toBe('2026-11-18');
  });

  it('should ensure an imported timed deadline retains its intended instant and timezone meaning', async () => {
    const syllabus = await prisma.syllabus.create({
      data: {
        user_id: userAId,
        course_id: courseAId,
        course_name: 'Database Architecture',
        extracted_text: 'Syllabus text here',
      }
    });

    // Timed deadline with timezone offset: 2026-11-20 20:00:00 +05:30 (Asia/Colombo) = 14:30:00 UTC
    const mockParser = {
      parse: async () => ({
        course: 'Database Architecture',
        tasks: [
          {
            name: 'Final Project Submission',
            type: 'project' as const,
            weight: 35,
            deadline: '2026-11-20T20:00:00+05:30',
            isDateOnly: false,
            estimatedDuration: 180,
            recurring: false,
          }
        ]
      })
    };

    const { processSyllabusJob } = await import('../../src/workers/syllabus.worker');
    await processSyllabusJob(
      {
        rawText: 'text',
        userId: userAId,
        courseId: courseAId,
        syllabusId: syllabus.id,
      },
      prisma,
      mockParser as any
    );

    const task = await prisma.task.findFirst({
      where: { course_id: courseAId, title: 'Final Project Submission' }
    });
    expect(task).toBeDefined();
    expect(task?.is_date_only).toBe(false);
    // Instant in UTC must exactly match the converted offset: 20:00 +05:30 -> 14:30 UTC
    expect(task?.deadline?.toISOString()).toBe('2026-11-20T14:30:00.000Z');
  });

  it('should reject confirming tasks with impossible calendar dates (e.g. February 30)', async () => {
    const res = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        courseId: courseAId,
        tasks: [
          {
            name: 'Impossible Date Task',
            deadline: '2026-02-30',
          }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid input');
  });

  it('should reject confirming tasks with invalid timezone offsets (e.g. +25:00)', async () => {
    const res = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        courseId: courseAId,
        tasks: [
          {
            name: 'Bad Offset Task',
            deadline: '2026-10-15T12:00:00+25:00',
          }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid input');
  });

  it('should reject updating a task with contradiction between deadline format and isDateOnly', async () => {
    const res = await request(app)
      .patch(`/api/tasks/${task1Id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        deadline: '2026-10-15',
        is_date_only: false, // Contradiction
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Invalid input');
  });

  it('should complete full date-only round-trip: worker persistence -> GET course -> unchanged confirmation -> schedule generation', async () => {
    // 1. Create a dedicated course and syllabus
    const rtCourse = await prisma.course.create({
      data: {
        user_id: userAId,
        title: 'Algorithms 301',
      }
    });
    const rtSyllabus = await prisma.syllabus.create({
      data: {
        user_id: userAId,
        course_id: rtCourse.id,
        course_name: 'Algorithms 301',
        extracted_text: 'Syllabus with date-only task',
      }
    });

    // 2. Worker persistence with date-only task
    const mockParser = {
      parse: async () => ({
        course: 'Algorithms 301',
        tasks: [
          {
            name: 'Algorithm Analysis Report',
            type: 'assignment' as const,
            weight: 25,
            deadline: '2026-11-25', // Date-only YYYY-MM-DD
            isDateOnly: true,
            estimatedDuration: 120,
            recurring: false,
          }
        ]
      })
    };

    const { processSyllabusJob } = await import('../../src/workers/syllabus.worker');
    await processSyllabusJob(
      {
        rawText: 'text',
        userId: userAId,
        courseId: rtCourse.id,
        syllabusId: rtSyllabus.id,
      },
      prisma,
      mockParser as any
    );

    // 3. GET course via API
    const getRes = await request(app)
      .get(`/api/courses/${rtCourse.id}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.tasks).toHaveLength(1);
    const fetchedTask = getRes.body.tasks[0];

    // Public API contract assertion: date-only tasks MUST be serialized as YYYY-MM-DD string
    expect(fetchedTask.deadline).toBe('2026-11-25');
    expect(fetchedTask.is_date_only).toBe(true);

    // 4. Frontend ReviewTasksPage payload forwarding unchanged
    const confirmPayload = {
      courseId: rtCourse.id,
      tasks: [
        {
          id: fetchedTask.id,
          name: fetchedTask.title,
          type: fetchedTask.type,
          weight: fetchedTask.weight,
          estimated_duration: fetchedTask.estimated_duration,
          description: fetchedTask.description,
          recurring: fetchedTask.recurring,
          syllabus_id: fetchedTask.syllabus_id,
          deadline: fetchedTask.deadline, // '2026-11-25' unchanged
          is_date_only: fetchedTask.is_date_only, // true unchanged
        }
      ]
    };

    // 5. Successful confirmation (no 400 contradiction failure!)
    const confirmRes = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userAToken}`)
      .send(confirmPayload);

    expect(confirmRes.status).toBe(200);
    expect(confirmRes.body.success).toBe(true);

    // 6. Schedule generation
    const schedRes = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ courseId: rtCourse.id, timezone: 'Asia/Colombo' });

    expect(schedRes.status).toBe(201);
    expect(schedRes.body.id).toBeDefined();
    expect(schedRes.body.metrics.totalBlocks).toBeGreaterThan(0);

    // Verify study blocks were created in database for this schedule
    const blocks = await prisma.studyBlock.findMany({
      where: { schedule_id: schedRes.body.id }
    });
    expect(blocks.length).toBeGreaterThan(0);
  });

  it('should support refreshing review page and editing only the title of a date-only task', async () => {
    // 1. Create a course with an existing date-only task
    const course = await prisma.course.create({
      data: {
        user_id: userAId,
        title: 'Operating Systems 202',
      }
    });
    const task = await prisma.task.create({
      data: {
        course_id: course.id,
        title: 'Original OS Lab 1',
        deadline: new Date('2026-12-01T00:00:00.000Z'),
        is_date_only: true,
        weight: 15,
        estimated_duration: 90,
        needs_review: true,
      }
    });

    // 2. Simulate page refresh / initial load via GET course
    const getRes = await request(app)
      .get(`/api/courses/${course.id}`)
      .set('Authorization', `Bearer ${userAToken}`);

    expect(getRes.status).toBe(200);
    const loadedTask = getRes.body.tasks[0];
    expect(loadedTask.deadline).toBe('2026-12-01');
    expect(loadedTask.is_date_only).toBe(true);

    // 3. User edits ONLY the title in TaskReviewForm
    const confirmRes = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        courseId: course.id,
        tasks: [
          {
            id: loadedTask.id,
            name: 'Renamed OS Lab 1 - Memory Management', // Only title modified
            type: loadedTask.type,
            weight: loadedTask.weight,
            estimated_duration: loadedTask.estimated_duration,
            deadline: loadedTask.deadline, // '2026-12-01' preserved
            is_date_only: loadedTask.is_date_only, // true preserved
          }
        ]
      });

    expect(confirmRes.status).toBe(200);

    // 4. Verify database state
    const reloaded = await prisma.task.findUnique({ where: { id: task.id } });
    expect(reloaded?.title).toBe('Renamed OS Lab 1 - Memory Management');
    expect(reloaded?.is_date_only).toBe(true);
    expect(reloaded?.deadline?.toISOString().split('T')[0]).toBe('2026-12-01');

    // 5. Also verify partial update via PATCH /api/tasks/:id
    const patchRes = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Patched Title Only' });

    expect(patchRes.status).toBe(200);
    // Serialized response preserves public API representation
    expect(patchRes.body.title).toBe('Patched Title Only');
    expect(patchRes.body.deadline).toBe('2026-12-01');
    expect(patchRes.body.is_date_only).toBe(true);
  });

  it('rejects concurrent task update when version is stale with 409 Conflict', async () => {
    const course = await prisma.course.create({
      data: {
        title: 'Concurrency Course',
        user_id: userAId,
      }
    });

    const task = await prisma.task.create({
      data: {
        course_id: course.id,
        title: 'Task Version 1',
        deadline: new Date('2026-11-20T12:00:00Z'),
        is_date_only: false,
        version: 1,
      }
    });

    // First update with version 1 -> succeeds, increments to version 2
    const update1 = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Task Version 2 by Session A',
        version: 1,
      });

    expect(update1.status).toBe(200);
    expect(update1.body.title).toBe('Task Version 2 by Session A');
    expect(update1.body.version).toBe(2);

    // Stale update from Session B still expecting version 1 -> rejected with 409
    const update2 = await request(app)
      .patch(`/api/tasks/${task.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Stale Edit from Session B',
        version: 1,
      });

    expect(update2.status).toBe(409);
    expect(update2.body.error).toContain('Conflict');
    expect(update2.body.serverTask).toBeDefined();
    expect(update2.body.serverTask.version).toBe(2);
    expect(update2.body.serverTask.title).toBe('Task Version 2 by Session A');

    // Database record retains Session A's title
    const inDb = await prisma.task.findUnique({ where: { id: task.id } });
    expect(inDb?.title).toBe('Task Version 2 by Session A');
    expect(inDb?.version).toBe(2);
  });

  it('rejects simultaneous edits atomically so only one succeeds', async () => {
    const course = await prisma.course.create({
      data: {
        title: 'Simultaneous Course',
        user_id: userAId,
      }
    });

    const task = await prisma.task.create({
      data: {
        course_id: course.id,
        title: 'Simultaneous Base Task',
        deadline: new Date('2026-11-20T12:00:00Z'),
        is_date_only: false,
        version: 1,
      }
    });

    // Fire two simultaneous requests both targeting version 1
    const [res1, res2] = await Promise.all([
      request(app)
        .patch(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'Simultaneous Winner A', version: 1 }),
      request(app)
        .patch(`/api/tasks/${task.id}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ title: 'Simultaneous Winner B', version: 1 }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 409]);

    const inDb = await prisma.task.findUnique({ where: { id: task.id } });
    expect(inDb?.version).toBe(2);
  });

  it('rejects confirmation with 409 Conflict when a task was modified in another session', async () => {
    const course = await prisma.course.create({
      data: {
        title: 'Stale Confirm Course',
        user_id: userAId,
      }
    });

    const task1 = await prisma.task.create({
      data: {
        course_id: course.id,
        title: 'Homework 1',
        deadline: new Date('2026-11-15T12:00:00Z'),
        is_date_only: false,
        version: 1,
      }
    });

    // Session B edits Homework 1 to version 2
    const editRes = await request(app)
      .patch(`/api/tasks/${task1.id}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Homework 1 - Updated by Tab 2', version: 1 });
    expect(editRes.status).toBe(200);

    // Session A tries to confirm using stale version 1
    const staleConfirmRes = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        courseId: course.id,
        tasks: [
          {
            id: task1.id,
            name: 'Homework 1 - Stale Tab 1 Name',
            deadline: '2026-11-15T12:00:00.000Z',
            is_date_only: false,
            version: 1, // Stale version!
          }
        ]
      });

    expect(staleConfirmRes.status).toBe(409);
    expect(staleConfirmRes.body.error).toContain('Conflict');

    // Confirm that Session B's edit was NOT overwritten
    const checkTask = await prisma.task.findUnique({ where: { id: task1.id } });
    expect(checkTask?.title).toBe('Homework 1 - Updated by Tab 2');
    expect(checkTask?.version).toBe(2);

    // Refreshing and sending with current version 2 succeeds
    const refreshedConfirmRes = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        courseId: course.id,
        tasks: [
          {
            id: task1.id,
            name: 'Homework 1 - Updated by Tab 2',
            deadline: '2026-11-15T12:00:00.000Z',
            is_date_only: false,
            version: 2,
          }
        ]
      });

    expect(refreshedConfirmRes.status).toBe(200);
  });

  it('rejects confirmation when a saved task is missing a required deadline', async () => {
    const course = await prisma.course.create({
      data: {
        title: 'Missing Deadline Course',
        user_id: userAId,
      }
    });

    const taskNoDate = await prisma.task.create({
      data: {
        course_id: course.id,
        title: 'Task Without Deadline',
        deadline: null,
        is_date_only: false,
        version: 1,
      }
    });

    const res = await request(app)
      .post('/api/tasks/confirm')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        courseId: course.id,
        tasks: [
          {
            id: taskNoDate.id,
            name: 'Task Without Deadline',
            deadline: null,
            version: 1,
          }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('missing a required deadline');
  });
});


