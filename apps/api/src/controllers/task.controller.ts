import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database/src/client';
import { confirmTasksSchema } from '../schemas/task.schema';
import { asyncHandler } from '../utils/asyncHandler';

export const confirmTasks = asyncHandler(async (req: Request, res: Response) => {
  const result = confirmTasksSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', details: result.error.format() });
    return;
  }

  const { syllabusId, tasks } = result.data;

  // Ensure syllabus exists
  const syllabus = await prisma.syllabus.findUnique({ where: { id: syllabusId } });
  if (!syllabus) {
    res.status(404).json({ error: 'Syllabus not found' });
    return;
  }

  // Check if tasks already exist for this syllabus to prevent duplicates if they click twice
  await prisma.task.deleteMany({ where: { syllabus_id: syllabusId } });

  // Bulk insert tasks
  const createdTasks = await prisma.$transaction(
    tasks.map(t => 
      prisma.task.create({
        data: {
          syllabus_id: syllabusId,
          title: t.name,
          deadline: t.deadline ? new Date(t.deadline) : null,
          weight: t.weight,
          status: 'pending',
        }
      })
    )
  );

  res.status(201).json({ message: 'Tasks confirmed successfully', count: createdTasks.length });
});
