import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';

const updateTaskSchema = z.object({
  title: z.string().optional(),
  type: z.string().optional(),
  weight: z.number().optional(),
  deadline: z.string().nullable().optional(),
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  let userId = (req as any).user?.id;
  if (!userId) {
    const mockUser = await prisma.user.findFirst();
    if (mockUser) userId = mockUser.id;
    else return res.status(401).json({ error: 'Unauthorized: No user found' });
  }

  const { id } = req.params;
  const result = updateTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.format() });
  }

  // Ensure task exists and belongs to a course owned by the user
  const task = await prisma.task.findUnique({
    where: { id },
    include: { course: true }
  });

  if (!task || task.course?.user_id !== userId) {
    return res.status(404).json({ error: 'Task not found or access denied' });
  }

  const updatedTask = await prisma.task.update({
    where: { id },
    data: {
      title: result.data.title,
      type: result.data.type,
      weight: result.data.weight,
      deadline: result.data.deadline ? new Date(result.data.deadline) : null,
      needs_review: false,
    }
  });

  res.json(updatedTask);
});

const confirmTasksSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  tasks: z.array(z.object({
    name: z.string(),
    type: z.string(),
    weight: z.number().nullable().optional(),
    deadline: z.string().nullable().optional(),
  })).min(1, 'At least one task is required'),
});

export const confirmTasks = asyncHandler(async (req: Request, res: Response) => {
  let userId = (req as any).user?.id;
  if (!userId) {
    const mockUser = await prisma.user.findFirst();
    if (mockUser) userId = mockUser.id;
    else return res.status(401).json({ error: 'Unauthorized: No user found' });
  }

  const result = confirmTasksSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.format() });
  }

  const { courseId, tasks } = result.data;

  const course = await prisma.course.findUnique({ 
    where: { id: courseId, user_id: userId } 
  });
  
  if (!course) {
    return res.status(404).json({ error: 'Course not found or access denied' });
  }

  await prisma.task.deleteMany({ where: { course_id: courseId } });

  const createdTasks = await prisma.$transaction(
    tasks.map(t => 
      prisma.task.create({
        data: {
          course_id: courseId,
          title: t.name,
          deadline: t.deadline ? new Date(t.deadline) : null,
          weight: t.weight || null,
          status: 'pending',
          needs_review: false,
        }
      })
    )
  );

  res.status(200).json({ message: 'Tasks confirmed successfully', count: createdTasks.length });
});
