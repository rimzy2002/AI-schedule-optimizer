import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database';
import { asyncHandler } from '../utils/asyncHandler';
import { serializeCourseWithTasks, serializeTasks } from '../utils/taskSerializer';

export class CoursesController {
  getCourses = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const courses = await prisma.course.findMany({
      where: { user_id: userId },
      include: {
        tasks: {
          orderBy: { deadline: 'asc' }
        },
        syllabi: {
          select: { id: true, analysis_status: true, created_at: true },
          orderBy: { created_at: 'desc' },
        },
        schedules: {
          select: { id: true, status: true, created_at: true },
          orderBy: { created_at: 'desc' },
        },
      },
      orderBy: { created_at: 'desc' }
    });

    const enriched = courses.map(course => {
      const serialized = serializeCourseWithTasks(course);
      const tasks = serialized.tasks || [];
      const pendingReviewCount = tasks.filter((t: any) => t.needs_review).length;
      const confirmedCount = tasks.filter((t: any) => !t.needs_review).length;
      const latestSchedule = course.schedules && course.schedules.length > 0 ? course.schedules[0] : null;
      const latestSyllabus = course.syllabi && course.syllabi.length > 0 ? course.syllabi[0] : null;

      return {
        ...serialized,
        taskCount: tasks.length,
        pendingReviewCount,
        confirmedCount,
        latestSchedule,
        latestSyllabus,
      };
    });

    res.json(enriched);
  });

  getCourseDetails = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id, user_id: userId },
      include: {
        tasks: {
          orderBy: { deadline: 'asc' }
        },
        syllabi: {
          orderBy: { created_at: 'desc' }
        },
        schedules: {
          orderBy: { created_at: 'desc' }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const serialized = serializeCourseWithTasks(course);
    const tasks = serialized.tasks || [];
    const pendingReviewCount = tasks.filter((t: any) => t.needs_review).length;
    const confirmedCount = tasks.filter((t: any) => !t.needs_review).length;
    const latestSchedule = course.schedules && course.schedules.length > 0 ? course.schedules[0] : null;
    const latestSyllabus = course.syllabi && course.syllabi.length > 0 ? course.syllabi[0] : null;

    res.json({
      ...serialized,
      taskCount: tasks.length,
      pendingReviewCount,
      confirmedCount,
      latestSchedule,
      latestSyllabus,
    });
  });

  getCourseTasks = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required' });
    }

    const { id } = req.params;
    // Verify course belongs to user
    const course = await prisma.course.findUnique({
      where: { id, user_id: userId }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found or access denied' });
    }

    const tasks = await prisma.task.findMany({
      where: { course_id: id },
      orderBy: { created_at: 'asc' }
    });

    res.json(serializeTasks(tasks));
  });
}

export const coursesController = new CoursesController();
