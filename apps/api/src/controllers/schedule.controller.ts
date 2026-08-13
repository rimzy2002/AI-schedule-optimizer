import { Request, Response } from 'express';
import { z } from 'zod';
import { schedulerService } from '../services/scheduling/scheduler.service';
import { asyncHandler } from '../utils/asyncHandler';

const generatePreviewSchema = z.object({
  syllabusId: z.string().uuid('Invalid syllabus ID'),
});

const acceptScheduleSchema = z.object({
  blocks: z.array(z.object({
    taskId: z.string().uuid(),
    taskTitle: z.string(),
    start: z.string().datetime(),
    end: z.string().datetime(),
  })).min(1, 'At least one block is required'),
});

export const generatePreview = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore - mock user authentication for now
  const userId = req.user?.id || 'mock-user-id'; // assuming user is authenticated
  
  const result = generatePreviewSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', details: result.error.format() });
    return;
  }

  const preview = await schedulerService.generatePreview(userId, result.data.syllabusId);
  res.json(preview);
});

export const acceptSchedule = asyncHandler(async (req: Request, res: Response) => {
  // @ts-ignore - mock user authentication for now
  const userId = req.user?.id || 'mock-user-id';
  
  const result = acceptScheduleSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', details: result.error.format() });
    return;
  }

  // Convert string dates back to Date objects
  const blocks = result.data.blocks.map(b => ({
    ...b,
    start: new Date(b.start),
    end: new Date(b.end),
  }));

  const count = await schedulerService.acceptSchedule(userId, blocks);
  res.status(201).json({ message: 'Schedule accepted', count });
});
