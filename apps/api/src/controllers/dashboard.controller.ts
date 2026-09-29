import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database';
import { asyncHandler } from '../utils/asyncHandler';
import { getZonedDateParts, zonedTimeToUtc } from '../algorithms/scheduling/timezone';
import { serializeTasks } from '../utils/taskSerializer';
import { settingsService } from '../services/settings.service';

export const getTodayDashboard = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized: Authentication required' });
  }

  const userPrefs = await settingsService.getPreferences(userId);
  const timeZone = (req.query.timezone as string) || userPrefs.timezone || 'Asia/Colombo';
  const nowParts = getZonedDateParts(new Date(), timeZone);
  const todayStart = zonedTimeToUtc(nowParts.year, nowParts.month, nowParts.day, 0, 0, 0, timeZone);
  const todayEnd = zonedTimeToUtc(nowParts.year, nowParts.month, nowParts.day, 23, 59, 59, timeZone);

  // Get today's blocks in user's local day
  const todayBlocks = await prisma.studyBlock.findMany({
    where: {
      user_id: userId,
      start_time: {
        gte: todayStart,
        lte: todayEnd,
      },
    },
    include: {
      task: true,
      course: true,
    },
    orderBy: {
      start_time: 'asc',
    },
  });

  // Find next action for today (first uncompleted block)
  const nextAction = todayBlocks.find(block => block.status !== 'completed') || null;

  // If no action today, check for the next future scheduled block
  let nextUpcomingBlock: any = null;
  if (!nextAction) {
    nextUpcomingBlock = await prisma.studyBlock.findFirst({
      where: {
        user_id: userId,
        status: 'pending',
        start_time: { gt: todayEnd },
      },
      include: {
        task: true,
        course: true,
      },
      orderBy: {
        start_time: 'asc',
      }
    });
  }

  // Get upcoming deadlines (next 7 days)
  const nextWeek = new Date(todayEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const upcomingDeadlines = await prisma.task.findMany({
    where: {
      course: {
        user_id: userId,
      },
      deadline: {
        gte: todayStart,
        lte: nextWeek,
      },
      status: {
        not: 'completed'
      }
    },
    include: {
      course: true,
    },
    orderBy: {
      deadline: 'asc',
    },
    take: 5,
  });

  const totalCoursesCount = await prisma.course.count({
    where: { user_id: userId }
  });

  const totalStudyBlocksCount = await prisma.studyBlock.count({
    where: { user_id: userId, status: 'pending' }
  });

  res.json({
    nextAction,
    nextUpcomingBlock,
    todayBlocks,
    upcomingDeadlines: serializeTasks(upcomingDeadlines),
    totalCoursesCount,
    totalStudyBlocksCount,
    timezone: timeZone,
  });
});
