import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database/src/client';
import { startFocusSessionSchema } from '../schemas/focus.schema';
import { asyncHandler } from '../utils/asyncHandler';

const getUserId = () => 'user-1'; // Mock user

export const startFocusSession = asyncHandler(async (req: Request, res: Response) => {
  const result = startFocusSessionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', details: result.error.format() });
    return;
  }

  const { studyBlockId, taskId, plannedMinutes } = result.data;
  const userId = getUserId();

  if (studyBlockId) {
    const block = await prisma.studyBlock.findUnique({ where: { id: studyBlockId, user_id: userId } });
    if (!block) {
      res.status(404).json({ error: 'Study block not found or access denied' });
      return;
    }
  }

  const session = await prisma.focusSession.create({
    data: {
      user_id: userId,
      study_block_id: studyBlockId,
      task_id: taskId,
      start_time: new Date(),
      planned_minutes: plannedMinutes,
      status: 'ACTIVE',
    }
  });

  res.status(201).json(session);
});

export const pauseFocusSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = getUserId();
  
  const session = await prisma.focusSession.findUnique({ where: { id, user_id: userId } });
  if (!session) {
    res.status(404).json({ error: 'Session not found or access denied' });
    return;
  }

  const updatedSession = await prisma.focusSession.update({
    where: { id },
    data: {
      status: 'PAUSED',
      paused_at: new Date(),
    }
  });

  res.json(updatedSession);
});

export const resumeFocusSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = getUserId();
  
  const session = await prisma.focusSession.findUnique({ where: { id, user_id: userId } });
  if (!session || !session.paused_at) {
    res.status(400).json({ error: 'Session not found, not owned, or not paused' });
    return;
  }

  const pausedDurationMs = new Date().getTime() - session.paused_at.getTime();
  const pausedSeconds = Math.floor(pausedDurationMs / 1000);

  const updated = await prisma.focusSession.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      paused_at: null,
      accumulated_pause: session.accumulated_pause + pausedSeconds,
    }
  });

  res.json(updated);
});

export const completeFocusSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = getUserId();
  
  const session = await prisma.focusSession.findUnique({ where: { id, user_id: userId } });
  if (!session) {
    res.status(404).json({ error: 'Session not found or access denied' });
    return;
  }

  const now = new Date();
  
  // Calculate total time elapsed minus paused time
  let additionalPauseSeconds = 0;
  if (session.status === 'PAUSED' && session.paused_at) {
    additionalPauseSeconds = Math.floor((now.getTime() - session.paused_at.getTime()) / 1000);
  }
  
  const totalAccumulatedPause = session.accumulated_pause + additionalPauseSeconds;
  
  const elapsedMs = now.getTime() - session.start_time.getTime();
  const actualMinutes = Math.floor((elapsedMs - (totalAccumulatedPause * 1000)) / 60000);

  const updatedSession = await prisma.focusSession.update({
    where: { id },
    data: {
      status: 'COMPLETED',
      end_time: now,
      actual_minutes: actualMinutes,
      paused_at: null,
      accumulated_pause: totalAccumulatedPause,
    }
  });

  // Mark study block as complete if linked
  if (session.study_block_id) {
    await prisma.studyBlock.update({
      where: { id: session.study_block_id },
      data: { status: 'completed' }
    });
  }

  // Update FocusMetric
  await prisma.focusMetric.createMany({
    data: [
      { user_id: session.user_id, metric_key: 'planned_minutes', value: session.planned_minutes },
      { user_id: session.user_id, metric_key: 'actual_minutes', value: actualMinutes },
      { user_id: session.user_id, metric_key: 'completed_sessions', value: 1 },
    ]
  });

  res.json(updatedSession);
});

export const getFocusSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = getUserId();

  const session = await prisma.focusSession.findUnique({ where: { id, user_id: userId } });
  
  if (!session) {
    res.status(404).json({ error: 'Session not found or access denied' });
    return;
  }
  
  res.json(session);
});
