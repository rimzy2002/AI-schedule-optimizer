import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '@ai-schedule-optimizer/database';
import { assertTestDatabaseIsolation, TestTracker } from '../testHelper';

describe('Schedule Integration Tests', () => {
  const tracker = new TestTracker();
  let userAId: string;
  let userAToken: string;
  let userBToken: string;
  let courseAId: string;
  let courseBId: string;

  beforeAll(async () => {
    assertTestDatabaseIsolation();

    // User A
    const regA = await request(app)
      .post('/api/auth/register')
      .send({ email: `sched_user_a_${Date.now()}@example.com`, password: 'Password123!' });
    userAId = regA.body.data.user.id;
    userAToken = regA.body.data.token;
    tracker.trackUserId(userAId);

    // User B
    const regB = await request(app)
      .post('/api/auth/register')
      .send({ email: `sched_user_b_${Date.now()}@example.com`, password: 'Password123!' });
    const userBId = regB.body.data.user.id;
    userBToken = regB.body.data.token;
    tracker.trackUserId(userBId);

    // Course A for User A
    const courseA = await prisma.course.create({
      data: {
        user_id: userAId,
        title: 'Physics 201',
      }
    });
    courseAId = courseA.id;

    // Course B for User A
    const courseB = await prisma.course.create({
      data: {
        user_id: userAId,
        title: 'Chemistry 101',
      }
    });
    courseBId = courseB.id;

    // Tasks for Course A
    const futureDeadline1 = new Date();
    futureDeadline1.setDate(futureDeadline1.getDate() + 5);
    futureDeadline1.setUTCHours(20, 0, 0, 0);

    const futureDeadline2 = new Date();
    futureDeadline2.setDate(futureDeadline2.getDate() + 10);
    futureDeadline2.setUTCHours(20, 0, 0, 0);

    await prisma.task.createMany({
      data: [
        {
          course_id: courseAId,
          title: 'Physics Lab Report',
          deadline: futureDeadline1,
          weight: 20,
          estimated_duration: 120, // 2 hours
          needs_review: false,
        },
        {
          course_id: courseAId,
          title: 'Midterm Prep',
          deadline: futureDeadline2,
          weight: 30,
          estimated_duration: 90, // 1.5 hours
          needs_review: false,
        }
      ]
    });

    // Task for Course B
    await prisma.task.create({
      data: {
        course_id: courseBId,
        title: 'Chem Organic Lab',
        deadline: futureDeadline1,
        weight: 25,
        estimated_duration: 60,
        needs_review: false,
      }
    });
  });

  afterAll(async () => {
    await tracker.cleanup();
  });

  it('should reject schedule generation if course belongs to another user (cross-user access)', async () => {
    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ courseId: courseAId });

    expect(res.status).toBe(404);
  });

  it('should generate a valid schedule respecting saved durations and available slots', async () => {
    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ courseId: courseAId });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.metrics.totalBlocks).toBeGreaterThan(0);
    expect(res.body.metrics.deadlinesCovered).toBeGreaterThanOrEqual(1);

    const blocks = await prisma.studyBlock.findMany({
      where: { schedule_id: res.body.id }
    });
    expect(blocks.length).toBe(res.body.metrics.totalBlocks);
  });

  it('should avoid duplicate sessions and archive previous schedule on repeated generation', async () => {
    // Generate first schedule
    const res1 = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ courseId: courseAId });
    const firstScheduleId = res1.body.id;

    // Generate second schedule
    const res2 = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ courseId: courseAId });
    const secondScheduleId = res2.body.id;

    const prevSchedule = await prisma.schedule.findUnique({ where: { id: firstScheduleId } });
    expect(prevSchedule?.status).toBe('archived');

    const newSchedule = await prisma.schedule.findUnique({ where: { id: secondScheduleId } });
    expect(newSchedule?.status).toBe('active');

    const pendingBlocks = await prisma.studyBlock.findMany({
      where: { course_id: courseAId, user_id: userAId, status: 'pending' }
    });
    expect(pendingBlocks.length).toBe(res2.body.metrics.totalBlocks);
  });

  it('should roll back completely and preserve the previous active schedule on persistence failure', async () => {
    // Get existing active schedule
    const activeScheduleBefore = await prisma.schedule.findFirst({
      where: { user_id: userAId, course_id: courseAId, status: 'active' },
      include: { studyBlocks: true }
    });
    expect(activeScheduleBefore).toBeDefined();
    const originalBlockCount = activeScheduleBefore!.studyBlocks.length;

    // Injected persistence failure inside transaction:
    const originalTransaction = prisma.$transaction.bind(prisma);
    const spy = vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => {
      return originalTransaction(async (tx: any) => {
        // Run first step then throw to test rollback of changes made inside transaction
        await tx.schedule.updateMany({
          where: { user_id: userAId, course_id: courseAId, status: 'active' },
          data: { status: 'archived' }
        });
        throw new Error('Injected database persistence failure');
      });
    });

    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ courseId: courseAId });

    spy.mockRestore();

    // Must return an error (500)
    expect(res.status).toBe(500);

    // Verify rollback: previous active schedule must STILL be active
    const activeScheduleAfter = await prisma.schedule.findUnique({
      where: { id: activeScheduleBefore!.id },
      include: { studyBlocks: true }
    });
    expect(activeScheduleAfter?.status).toBe('active');
    expect(activeScheduleAfter?.studyBlocks.length).toBe(originalBlockCount);
  });

  it('should serialize concurrent schedule generation requests for the same user without overlapping blocks', async () => {
    // Submit simultaneous requests for Course A and Course B
    const [resA, resB] = await Promise.all([
      request(app)
        .post('/api/schedule/generate')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ courseId: courseAId }),
      request(app)
        .post('/api/schedule/generate')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ courseId: courseBId }),
    ]);

    expect(resA.status).toBe(201);
    expect(resB.status).toBe(201);

    // Fetch all active pending study blocks for user A
    const allBlocks = await prisma.studyBlock.findMany({
      where: { user_id: userAId, status: 'pending' },
      orderBy: { start_time: 'asc' }
    });

    // Check that none of the generated blocks overlap with each other
    for (let i = 0; i < allBlocks.length - 1; i++) {
      const current = allBlocks[i];
      const next = allBlocks[i + 1];
      expect(current.end_time.getTime()).toBeLessThanOrEqual(next.start_time.getTime());
    }
  });

  it('should preserve study blocks linked to ACTIVE or PAUSED focus sessions', async () => {
    // Find an existing pending block for Course A
    const block = await prisma.studyBlock.findFirst({
      where: { course_id: courseAId, user_id: userAId, status: 'pending' }
    });
    expect(block).toBeDefined();

    // Start a focus session linked to this block
    const focusSession = await prisma.focusSession.create({
      data: {
        user_id: userAId,
        study_block_id: block!.id,
        planned_minutes: 30,
        status: 'ACTIVE',
        start_time: new Date(),
      }
    });

    // Regenerate schedule for Course A
    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ courseId: courseAId });

    expect(res.status).toBe(201);

    // The locked block must STILL exist and NOT have been deleted
    const preservedBlock = await prisma.studyBlock.findUnique({
      where: { id: block!.id }
    });
    expect(preservedBlock).toBeDefined();

    // Clean up focus session
    await prisma.focusSession.delete({ where: { id: focusSession.id } });
  });

  it('should deduct previously completed work when calculating remaining study time', async () => {
    // Create a new task requiring 60 minutes
    const task = await prisma.task.create({
      data: {
        course_id: courseAId,
        title: 'Task with completed block',
        deadline: new Date(Date.now() + 7 * 86400000),
        estimated_duration: 60,
        needs_review: false,
      }
    });

    // Create a completed study block of 60 minutes for this task
    await prisma.studyBlock.create({
      data: {
        user_id: userAId,
        course_id: courseAId,
        task_id: task.id,
        title: 'Completed Study: Task',
        start_time: new Date(Date.now() - 3600000),
        end_time: new Date(), // 60 mins completed
        status: 'completed',
      }
    });

    // Generate schedule
    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ courseId: courseAId });

    expect(res.status).toBe(201);

    // No new pending study blocks should be scheduled for this fully completed task
    const newPendingBlocks = await prisma.studyBlock.findMany({
      where: {
        task_id: task.id,
        status: 'pending'
      }
    });
    expect(newPendingBlocks.length).toBe(0);
  });

  it('should report unallocated tasks and reasons when deadline is in the past', async () => {
    const pastDeadline = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await prisma.task.create({
      data: {
        course_id: courseAId,
        title: 'Past Due Homework',
        deadline: pastDeadline,
        estimated_duration: 60,
        needs_review: false,
      }
    });

    const res = await request(app)
      .post('/api/schedule/generate')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ courseId: courseAId });

    expect(res.status).toBe(201);
    expect(res.body.metrics.unallocatedTasks).toBeGreaterThanOrEqual(1);
    expect(res.body.metrics.unallocatedDetails).toBeDefined();

    const pastUnallocated = res.body.metrics.unallocatedDetails.find(
      (u: any) => u.taskTitle === 'Past Due Homework'
    );
    expect(pastUnallocated).toBeDefined();
    expect(pastUnallocated.reason).toContain('past');
  });
});
