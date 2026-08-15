import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database';
import { asyncHandler } from '../utils/asyncHandler';

export class CoursesController {
  getCourses = asyncHandler(async (req: Request, res: Response) => {
    let userId = (req as any).user?.id;
    if (!userId) {
      const mockUser = await prisma.user.findFirst();
      if (mockUser) userId = mockUser.id;
      else return res.status(401).json({ error: 'Unauthorized' });
    }

    const courses = await prisma.course.findMany({
      where: { user_id: userId },
      include: {
        tasks: true,
      },
      orderBy: { created_at: 'desc' }
    });

    res.json(courses);
  });

  getCourseDetails = asyncHandler(async (req: Request, res: Response) => {
    let userId = (req as any).user?.id;
    if (!userId) {
      const mockUser = await prisma.user.findFirst();
      if (mockUser) userId = mockUser.id;
      else return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { id, user_id: userId },
      include: {
        tasks: {
          orderBy: { deadline: 'asc' }
        },
        syllabi: true
      }
    });

    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    res.json(course);
  });

  getCourseTasks = asyncHandler(async (req: Request, res: Response) => {
    let userId = (req as any).user?.id;
    if (!userId) {
      const mockUser = await prisma.user.findFirst();
      if (mockUser) userId = mockUser.id;
      else return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id } = req.params;
    
    // verify course belongs to user
    const course = await prisma.course.findUnique({ where: { id, user_id: userId }});
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    const tasks = await prisma.task.findMany({
      where: { course_id: id },
      orderBy: { created_at: 'asc' }
    });

    res.json(tasks);
  });
}

export const coursesController = new CoursesController();
