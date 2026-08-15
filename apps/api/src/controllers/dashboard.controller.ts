import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database';
import { asyncHandler } from '../utils/asyncHandler';

export const getTodayDashboard = asyncHandler(async (req: Request, res: Response) => {
  let userId = (req as any).user?.id;
  if (!userId) {
    const mockUser = await prisma.user.findFirst();
    if (mockUser) userId = mockUser.id;
    else return res.status(401).json({ error: 'Unauthorized' });
  }

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  // Get today's blocks
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

  // Find next action (first uncompleted block for today)
  const nextAction = todayBlocks.find(block => block.status !== 'completed') || null;

  // Get upcoming deadlines (next 7 days)
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  
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

  res.json({
    nextAction,
    todayBlocks,
    upcomingDeadlines,
  });
});
