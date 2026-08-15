import { Request, Response } from 'express';
import { z } from 'zod';
import { schedulerService } from '../services/scheduling/scheduler.service';
import { asyncHandler } from '../utils/asyncHandler';
import { prisma } from '@ai-schedule-optimizer/database';

const generateSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
});

export const generateSchedule = asyncHandler(async (req: Request, res: Response) => {
  let userId = (req as any).user?.id;
  if (!userId) {
    const mockUser = await prisma.user.findFirst();
    if (mockUser) userId = mockUser.id;
    else return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const result = generateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.format() });
  }

  const { courseId } = result.data;
  
  // Verify course ownership
  const course = await prisma.course.findUnique({ where: { id: courseId, user_id: userId } });
  if (!course) {
    return res.status(404).json({ error: 'Course not found' });
  }

  // Generate and save schedule
  const schedule = await schedulerService.generateAndSaveSchedule(userId, courseId);
  res.status(201).json(schedule);
});

export const getLatestSchedule = asyncHandler(async (req: Request, res: Response) => {
  let userId = (req as any).user?.id;
  if (!userId) {
    const mockUser = await prisma.user.findFirst();
    if (mockUser) userId = mockUser.id;
    else return res.status(401).json({ error: 'Unauthorized' });
  }

  const schedule = await prisma.schedule.findFirst({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' },
    include: {
      studyBlocks: {
        orderBy: { start_time: 'asc' },
        include: { task: true, course: true }
      }
    }
  });

  if (!schedule) {
    return res.status(404).json({ error: 'No schedules found' });
  }

  res.json(schedule);
});

export const getSchedule = asyncHandler(async (req: Request, res: Response) => {
  let userId = (req as any).user?.id;
  if (!userId) {
    const mockUser = await prisma.user.findFirst();
    if (mockUser) userId = mockUser.id;
    else return res.status(401).json({ error: 'Unauthorized' });
  }

  const { id } = req.params;
  const schedule = await prisma.schedule.findUnique({
    where: { id, user_id: userId },
    include: {
      studyBlocks: {
        orderBy: { start_time: 'asc' },
        include: { task: true, course: true }
      }
    }
  });

  if (!schedule) {
    return res.status(404).json({ error: 'Schedule not found' });
  }

  res.json(schedule);
});
