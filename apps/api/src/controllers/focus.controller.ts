import { Request, Response } from 'express';
import { prisma } from '@ai-schedule-optimizer/database';
import { startFocusSessionSchema } from '../schemas/focus.schema';
import { asyncHandler } from '../utils/asyncHandler';

export const startFocusSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const result = startFocusSessionSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid input', details: result.error.format() });
    return;
  }

  const { studyBlockId, plannedMinutes } = result.data;
  let { taskId } = result.data;

  // Validate study block ownership if provided
  let block: any = null;
  if (studyBlockId) {
    block = await prisma.studyBlock.findFirst({ where: { id: studyBlockId, user_id: userId } });
    if (!block) {
      res.status(404).json({ error: 'Study block not found or access denied' });
      return;
    }
  }

  // Validate task ownership if provided
  if (taskId) {
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        course: { user_id: userId }
      }
    });
    if (!task) {
      res.status(404).json({ error: 'Task not found or access denied' });
      return;
    }

    // Validate consistency between taskId and study block
    if (block && block.task_id && block.task_id !== taskId) {
      res.status(400).json({ error: 'Supplied taskId is inconsistent with the selected study block' });
      return;
    }
  } else if (block && block.task_id) {
    // Automatically associate block's task if not explicitly passed
    taskId = block.task_id;
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
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const result = await prisma.$transaction(async (tx) => {
    // Acquire exclusive row lock to coordinate with concurrent completion/resume
    const rows = await tx.$queryRaw<any[]>`
      SELECT * FROM focus_sessions WHERE id = ${id} AND user_id = ${userId} FOR UPDATE
    `;
    const session = rows[0];
    if (!session) {
      return { status: 404, data: { error: 'Session not found or access denied' } };
    }

    if (session.status !== 'ACTIVE') {
      return { status: 400, data: { error: `Cannot pause session with status ${session.status}` } };
    }

    const now = new Date();
    await tx.focusSession.update({
      where: { id },
      data: {
        status: 'PAUSED',
        paused_at: now,
      }
    });

    const updated = await tx.focusSession.findUnique({ where: { id } });
    return { status: 200, data: updated };
  });

  res.status(result.status).json(result.data);
});

export const resumeFocusSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const result = await prisma.$transaction(async (tx) => {
    // Acquire exclusive row lock to coordinate with concurrent completion/pause
    const rows = await tx.$queryRaw<any[]>`
      SELECT * FROM focus_sessions WHERE id = ${id} AND user_id = ${userId} FOR UPDATE
    `;
    const session = rows[0];
    if (!session) {
      return { status: 404, data: { error: 'Session not found or access denied' } };
    }

    if (session.status !== 'PAUSED' || !session.paused_at) {
      return { status: 400, data: { error: `Cannot resume session with status ${session.status}` } };
    }

    const now = new Date();
    const pausedAtDate = new Date(session.paused_at);
    const pausedDurationMs = now.getTime() - pausedAtDate.getTime();
    const pausedSeconds = Math.max(0, Math.floor(pausedDurationMs / 1000));
    const newAccumulatedPause = Number(session.accumulated_pause || 0) + pausedSeconds;

    await tx.focusSession.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        paused_at: null,
        accumulated_pause: newAccumulatedPause,
      }
    });

    const updated = await tx.focusSession.findUnique({ where: { id } });
    return { status: 200, data: updated };
  });

  res.status(result.status).json(result.data);
});

export const completeFocusSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const result = await prisma.$transaction(async (tx) => {
    // Acquire exclusive row lock to coordinate with concurrent completion/pause/resume
    const rows = await tx.$queryRaw<any[]>`
      SELECT * FROM focus_sessions WHERE id = ${id} AND user_id = ${userId} FOR UPDATE
    `;
    const session = rows[0];
    if (!session) {
      return { status: 404, data: { error: 'Session not found or access denied' } };
    }

    // Idempotency fast path: if already completed, return existing session directly
    if (session.status === 'COMPLETED') {
      const existing = await tx.focusSession.findUnique({ where: { id } });
      return { status: 200, data: existing };
    }

    if (session.status !== 'ACTIVE' && session.status !== 'PAUSED') {
      return { status: 400, data: { error: `Cannot complete session with status ${session.status}` } };
    }

    const now = new Date();
    let additionalPauseSeconds = 0;
    if (session.status === 'PAUSED' && session.paused_at) {
      const pausedAtDate = new Date(session.paused_at);
      additionalPauseSeconds = Math.floor((now.getTime() - pausedAtDate.getTime()) / 1000);
    }

    const prevPause = Number(session.accumulated_pause || 0);
    const totalAccumulatedPause = prevPause + Math.max(0, additionalPauseSeconds);
    const startTimeDate = new Date(session.start_time);
    const elapsedMs = now.getTime() - startTimeDate.getTime();
    const actualMinutes = Math.max(0, Math.floor((elapsedMs - (totalAccumulatedPause * 1000)) / 60000));

    await tx.focusSession.update({
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
      await tx.studyBlock.update({
        where: { id: session.study_block_id },
        data: { status: 'completed' }
      });
    }

    // Insert FocusMetrics with session_id.
    // The @@unique([session_id, metric_key]) constraint guarantees exactly one set per session!
    await tx.focusMetric.createMany({
      data: [
        { user_id: session.user_id, session_id: id, metric_key: 'planned_minutes', value: Number(session.planned_minutes) },
        { user_id: session.user_id, session_id: id, metric_key: 'actual_minutes', value: actualMinutes },
        { user_id: session.user_id, session_id: id, metric_key: 'completed_sessions', value: 1 },
      ],
      skipDuplicates: true
    });

    const updated = await tx.focusSession.findUnique({ where: { id } });
    return { status: 200, data: updated };
  });

  res.status(result.status).json(result.data);
});

export const getActiveFocusSession = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const session = await prisma.focusSession.findFirst({
    where: {
      user_id: userId,
      status: { in: ['ACTIVE', 'PAUSED'] }
    },
    orderBy: { start_time: 'desc' },
    include: {
      studyBlock: {
        include: { task: true, course: true }
      }
    }
  });

  res.json(session || null);
});

export const getFocusSession = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const session = await prisma.focusSession.findFirst({ where: { id, user_id: userId } });
  
  if (!session) {
    res.status(404).json({ error: 'Session not found or access denied' });
    return;
  }
  
  res.json(session);
});

export const getNextStudyBlock = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const block = await prisma.studyBlock.findFirst({
    where: {
      user_id: userId,
      status: { not: 'completed' }
    },
    orderBy: { start_time: 'asc' },
    include: { task: true, course: true }
  });

  res.json(block || null);
});

export const getStudyBlock = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const block = await prisma.studyBlock.findFirst({
    where: { id: req.params.id, user_id: userId },
    include: { task: true, course: true }
  });

  res.json(block || null);
});
