import { Request, Response } from 'express';
import { z } from 'zod';
import { schedulerService } from '../services/scheduling/scheduler.service';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '@ai-schedule-optimizer/database';
import { serializeTask } from '../utils/taskSerializer';

const generateSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  timezone: z.string().optional().default('Asia/Colombo'),
});

export const generateSchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const result = generateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.format() });
  }

  const { courseId, timezone } = result.data;
  
  // Verify course ownership
  const course = await prisma.course.findFirst({ where: { id: courseId, user_id: userId } });
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  // Generate and save schedule atomically and concurrency-safely
  const schedule = await schedulerService.generateAndSaveSchedule(userId, courseId, timezone);
  res.status(201).json(schedule);
});

export const getLatestSchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const schedule = await prisma.schedule.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      studyBlocks: {
        orderBy: { start_time: 'asc' },
        include: { task: true, course: true }
      },
      course: true
    }
  });

  if (!schedule) {
    return res.status(404).json({ error: 'No schedules found' });
  }

  if (schedule.studyBlocks) {
    schedule.studyBlocks.forEach((sb: any) => {
      if (sb.task) sb.task = serializeTask(sb.task);
    });
  }

  res.json(schedule);
});

export const getSchedule = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const schedule = await prisma.schedule.findFirst({
    where: { id, user_id: userId },
    include: {
      studyBlocks: {
        orderBy: { start_time: 'asc' },
        include: { task: true, course: true }
      },
      course: true
    }
  });

  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  if (schedule.studyBlocks) {
    schedule.studyBlocks.forEach((sb: any) => {
      if (sb.task) sb.task = serializeTask(sb.task);
    });
  }

  res.json(schedule);
});

export const listSchedules = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const courseId = req.query.courseId as string | undefined;

  const schedules = await prisma.schedule.findMany({
    where: {
      user_id: userId,
      ...(courseId ? { course_id: courseId } : {})
    },
    orderBy: { created_at: 'desc' },
    include: {
      course: true,
      _count: {
        select: { studyBlocks: true }
      }
    }
  });

  res.json(schedules.map(s => ({
    id: s.id,
    course_id: s.course_id,
    courseTitle: s.course?.title || 'Unknown Course',
    status: s.status,
    totalBlocks: s._count.studyBlocks,
    created_at: s.created_at,
    updated_at: s.updated_at,
  })));
});
