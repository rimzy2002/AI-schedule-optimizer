import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import { validateDeadline } from '../algorithms/scheduling/dateValidation';
import { serializeTask } from '../utils/taskSerializer';

const createTaskSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  syllabusId: z.string().uuid('Invalid syllabus ID').nullable().optional(),
  title: z.string().min(1, 'Task title is required'),
  name: z.string().min(1).optional(),
  type: z.string().nullable().optional().default('assignment'),
  weight: z.number().min(0).max(100).nullable().optional(),
  deadline: z.string().nullable().optional(),
  isDateOnly: z.boolean().optional(),
  is_date_only: z.boolean().optional(),
  estimatedDuration: z.number().min(0).nullable().optional(),
  estimated_duration: z.number().min(0).nullable().optional(),
  description: z.string().nullable().optional(),
  recurring: z.boolean().optional().default(false),
  needs_review: z.boolean().optional().default(true),
  needsReview: z.boolean().optional(),
}).superRefine((data, ctx) => {
  if (data.deadline !== null && data.deadline !== undefined && data.deadline.trim() !== '') {
    const isDateOnlyFlag = data.is_date_only !== undefined ? data.is_date_only : data.isDateOnly;
    const res = validateDeadline(data.deadline, isDateOnlyFlag);
    if (!res.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error || 'Deadline must be a valid calendar date or ISO 8601 string',
        path: ['deadline'],
      });
    }
  }
});

export const createTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const result = createTaskSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid input', details: result.error.format() });
  }

  const { courseId, syllabusId } = result.data;
  const course = await prisma.course.findFirst({
    where: { id: courseId, user_id: userId }
  });

  if (!course) {
    return res.status(404).json({ error: 'Course not found or access denied' });
  }

  const title = result.data.title || result.data.name!;
  const duration = result.data.estimated_duration ?? result.data.estimatedDuration ?? null;
  const isDateOnlyFlag = result.data.is_date_only ?? result.data.isDateOnly ?? (result.data.deadline ? /^\d{4}-\d{2}-\d{2}$/.test(result.data.deadline) : false);

  let deadlineDate: Date | null = null;
  if (result.data.deadline && result.data.deadline.trim() !== '') {
    deadlineDate = new Date(result.data.deadline);
  }

  const needsReview = result.data.needs_review ?? result.data.needsReview ?? true;

  const newTask = await prisma.task.create({
    data: {
      course_id: courseId,
      syllabus_id: syllabusId || null,
      title,
      type: result.data.type || 'assignment',
      weight: result.data.weight !== undefined ? result.data.weight : null,
      deadline: deadlineDate,
      is_date_only: isDateOnlyFlag,
      estimated_duration: duration,
      description: result.data.description ?? null,
      recurring: result.data.recurring ?? false,
      status: 'pending',
      needs_review: needsReview,
    }
  });

  res.status(201).json(serializeTask(newTask));
});

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  type: z.string().nullable().optional(),
  weight: z.number().min(0).max(100).nullable().optional(),
  deadline: z.string().nullable().optional(),
  isDateOnly: z.boolean().optional(),
  is_date_only: z.boolean().optional(),
  estimatedDuration: z.number().min(0).nullable().optional(),
  estimated_duration: z.number().min(0).nullable().optional(),
  description: z.string().nullable().optional(),
  recurring: z.boolean().optional(),
  needs_review: z.boolean().optional(),
  needsReview: z.boolean().optional(),
  version: z.number().int().optional(),
  expected_version: z.number().int().optional(),
  expected_updated_at: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.deadline !== null && data.deadline !== undefined && data.deadline.trim() !== '') {
    const isDateOnlyFlag = data.is_date_only !== undefined ? data.is_date_only : data.isDateOnly;
    const res = validateDeadline(data.deadline, isDateOnlyFlag);
    if (!res.isValid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: res.error || 'Deadline must be a valid calendar date or ISO 8601 string',
        path: ['deadline'],
      });
    }
  }
});

export const updateTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
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

  // Optimistic concurrency protection by updated_at timestamp if provided
  if (result.data.expected_updated_at && task.updated_at) {
    const expectedTime = new Date(result.data.expected_updated_at).getTime();
    const actualTime = new Date(task.updated_at).getTime();
    if (actualTime > expectedTime) {
      return res.status(409).json({
        error: 'Conflict: This task has been modified by another session. Please reload to see the latest version.',
        serverTask: serializeTask(task)
      });
    }
  }

  const expectedVersion = result.data.version ?? result.data.expected_version ?? task.version;

  const dataToUpdate: Record<string, unknown> = {};

  if (result.data.needs_review !== undefined) {
    dataToUpdate.needs_review = result.data.needs_review;
  } else if (result.data.needsReview !== undefined) {
    dataToUpdate.needs_review = result.data.needsReview;
  }

  const titleVal = result.data.title || result.data.name;
  if (titleVal !== undefined) dataToUpdate.title = titleVal;
  if (result.data.type !== undefined) dataToUpdate.type = result.data.type;
  if (result.data.weight !== undefined) dataToUpdate.weight = result.data.weight;
  
  if (result.data.deadline !== undefined) {
    dataToUpdate.deadline = (result.data.deadline && result.data.deadline.trim() !== '') ? new Date(result.data.deadline) : null;
    if (result.data.is_date_only !== undefined) {
      dataToUpdate.is_date_only = result.data.is_date_only;
    } else if (result.data.isDateOnly !== undefined) {
      dataToUpdate.is_date_only = result.data.isDateOnly;
    } else if (result.data.deadline && /^\d{4}-\d{2}-\d{2}$/.test(result.data.deadline)) {
      dataToUpdate.is_date_only = true;
    } else {
      dataToUpdate.is_date_only = false;
    }
  }
  
  const durationVal = result.data.estimated_duration ?? result.data.estimatedDuration;
  if (durationVal !== undefined) {
    dataToUpdate.estimated_duration = durationVal;
  }
  if (result.data.description !== undefined) {
    dataToUpdate.description = result.data.description;
  }
  if (result.data.recurring !== undefined) {
    dataToUpdate.recurring = result.data.recurring;
  }

  // Atomic conditional update on version
  const updateResult = await prisma.task.updateMany({
    where: {
      id,
      version: expectedVersion,
      course: { user_id: userId },
    },
    data: {
      ...dataToUpdate,
      version: { increment: 1 },
    }
  });

  if (updateResult.count === 0) {
    // Row was modified concurrently or does not match version
    const currentTask = await prisma.task.findUnique({
      where: { id },
      include: { course: true }
    });

    if (!currentTask || currentTask.course?.user_id !== userId) {
      return res.status(404).json({ error: 'Task not found or access denied' });
    }

    return res.status(409).json({
      error: 'Conflict: This task has been modified by another session. Please reload to see the latest version.',
      serverTask: serializeTask(currentTask)
    });
  }

  const updatedTask = await prisma.task.findUnique({
    where: { id },
  });

  res.json(serializeTask(updatedTask!));
});

export const deleteTask = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const { id } = req.params;
  const task = await prisma.task.findUnique({
    where: { id },
    include: { course: true }
  });

  if (!task || task.course?.user_id !== userId) {
    return res.status(404).json({ error: 'Task not found or access denied' });
  }

  await prisma.task.delete({
    where: { id }
  });

  res.json({ success: true, message: 'Task deleted successfully', id });
});

const confirmTasksSchema = z.object({
  courseId: z.string().uuid('Invalid course ID'),
  deletedTaskIds: z.array(z.string()).optional(),
  tasks: z.array(z.object({
    id: z.string().optional(),
    version: z.number().int().optional(),
    expected_version: z.number().int().optional(),
    expected_updated_at: z.string().optional(),
    name: z.string().min(1, 'Task title is required').optional(),
    title: z.string().min(1).optional(),
    type: z.string().nullable().optional().default('assignment'),
    weight: z.number().min(0).max(100).nullable().optional(),
    deadline: z.string().nullable().optional(),
    isDateOnly: z.boolean().optional(),
    is_date_only: z.boolean().optional(),
    estimatedDuration: z.number().min(0).nullable().optional(),
    estimated_duration: z.number().min(0).nullable().optional(),
    description: z.string().nullable().optional(),
    recurring: z.boolean().default(false),
    syllabusId: z.string().optional().nullable(),
    syllabus_id: z.string().optional().nullable(),
  }).superRefine((task, ctx) => {
    if (task.deadline !== null && task.deadline !== undefined) {
      const isDateOnlyFlag = task.is_date_only !== undefined ? task.is_date_only : task.isDateOnly;
      const res = validateDeadline(task.deadline, isDateOnlyFlag);
      if (!res.isValid) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: res.error || 'Deadline must be a valid calendar date or ISO 8601 string',
          path: ['deadline'],
        });
      }
    }
  })).min(1, 'At least one task is required'),
});

export const confirmTasks = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
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

  try {
    const confirmedCount = await prisma.$transaction(async (tx) => {
      const existingTasks = await tx.task.findMany({
        where: { course_id: courseId },
      });
      const existingTaskMap = new Map(existingTasks.map(t => [t.id, t]));

      // 1. Concurrency protection & task update/create
      for (const t of tasks) {
        if (t.id) {
          const saved = existingTaskMap.get(t.id);
          if (!saved) {
            const err: any = new Error(`Task "${t.name || t.title || t.id}" no longer exists on the server.`);
            err.statusCode = 404;
            throw err;
          }

          const expectedVersion = t.version ?? t.expected_version;
          if (expectedVersion !== undefined && saved.version !== expectedVersion) {
            const err: any = new Error(`Conflict: Task "${saved.title}" was modified in another session. Please reload to review the latest changes before confirming.`);
            err.statusCode = 409;
            err.serverTask = serializeTask(saved);
            throw err;
          }

          if (t.expected_updated_at && saved.updated_at) {
            const expectedTime = new Date(t.expected_updated_at).getTime();
            const actualTime = new Date(saved.updated_at).getTime();
            if (actualTime > expectedTime) {
              const err: any = new Error(`Conflict: Task "${saved.title}" was modified in another session. Please reload to review the latest changes before confirming.`);
              err.statusCode = 409;
              err.serverTask = serializeTask(saved);
              throw err;
            }
          }

          // Resolve deadline and date-only flag
          let finalDeadline = saved.deadline;
          let isDateOnly = saved.is_date_only;

          if (t.is_date_only !== undefined) {
            isDateOnly = t.is_date_only;
          } else if (t.isDateOnly !== undefined) {
            isDateOnly = t.isDateOnly;
          } else if (t.deadline && /^\d{4}-\d{2}-\d{2}$/.test(t.deadline)) {
            isDateOnly = true;
          }

          if (t.deadline !== undefined) {
            if (t.deadline === null) {
              finalDeadline = null;
            } else if (saved.deadline && saved.deadline.toISOString() === t.deadline) {
              finalDeadline = saved.deadline;
              if (t.is_date_only === undefined && t.isDateOnly === undefined) {
                isDateOnly = saved.is_date_only;
              }
            } else {
              finalDeadline = new Date(t.deadline);
              if (t.is_date_only === undefined && t.isDateOnly === undefined) {
                isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(t.deadline);
              }
            }
          }

          const title = t.name || t.title || saved.title;
          const duration = t.estimated_duration !== undefined ? t.estimated_duration : (t.estimatedDuration !== undefined ? t.estimatedDuration : saved.estimated_duration);
          const weight = t.weight !== undefined ? t.weight : saved.weight;
          const type = t.type !== undefined ? t.type : saved.type;
          const description = t.description !== undefined ? t.description : saved.description;
          const recurring = t.recurring !== undefined ? t.recurring : saved.recurring;

          await tx.task.update({
            where: { id: t.id },
            data: {
              title,
              type,
              weight,
              deadline: finalDeadline,
              is_date_only: isDateOnly,
              estimated_duration: duration,
              description,
              recurring,
              needs_review: false,
              status: 'confirmed',
              version: { increment: 1 },
            }
          });
        } else {
          // Create new unpersisted client draft task
          const title = t.name || t.title || 'Untitled Task';
          const duration = t.estimated_duration ?? t.estimatedDuration ?? null;
          const sylId = t.syllabus_id ?? t.syllabusId ?? existingTasks[0]?.syllabus_id ?? null;
          const isDateOnly = t.is_date_only ?? t.isDateOnly ?? (t.deadline ? /^\d{4}-\d{2}-\d{2}$/.test(t.deadline) : false);
          const finalDeadline = t.deadline ? new Date(t.deadline) : null;

          await tx.task.create({
            data: {
              course_id: courseId,
              syllabus_id: sylId,
              title,
              type: t.type || 'assignment',
              weight: t.weight !== undefined ? t.weight : null,
              deadline: finalDeadline,
              is_date_only: isDateOnly,
              estimated_duration: duration,
              description: t.description ?? null,
              recurring: t.recurring || false,
              status: 'pending',
              needs_review: false,
            }
          });
        }
      }

      // 2. Process explicit deletions
      if (result.data.deletedTaskIds && result.data.deletedTaskIds.length > 0) {
        await tx.task.deleteMany({
          where: {
            id: { in: result.data.deletedTaskIds },
            course_id: courseId,
          }
        });
      }

      // 3. Validate scheduling eligibility against the authoritative saved database records
      const finalSavedTasks = await tx.task.findMany({
        where: { course_id: courseId },
      });

      if (finalSavedTasks.length === 0) {
        const err: any = new Error('No tasks found for this course. Please add at least one task before generating a schedule.');
        err.statusCode = 400;
        throw err;
      }

      for (const savedTask of finalSavedTasks) {
        if (!savedTask.title || savedTask.title.trim() === '') {
          const err: any = new Error(`Task "${savedTask.id}" is missing a title.`);
          err.statusCode = 400;
          throw err;
        }
        if (!savedTask.deadline) {
          const err: any = new Error(`Task "${savedTask.title}" is missing a required deadline. Every task must have a deadline to be scheduled.`);
          err.statusCode = 400;
          throw err;
        }
      }

      return finalSavedTasks.length;
    });

    res.status(200).json({ success: true, message: 'Tasks confirmed successfully', count: confirmedCount });
  } catch (err: any) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: err.message,
        serverTask: err.serverTask,
      });
    }
    throw err;
  }
});

