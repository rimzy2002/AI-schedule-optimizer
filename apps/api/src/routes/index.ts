import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import authRoutes from './auth.routes';
import syllabusRoutes from './syllabi.routes';
import taskRoutes from './task.routes';
import scheduleRoutes from './schedule.routes';
import dashboardRoutes from './dashboard.routes';
import focusRoutes from './focus.routes';
import coursesRoutes from './courses.routes';
import settingsRoutes from './settings.routes';

import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Basic health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

// Database health check
router.get('/health/database', asyncHandler(async (req: Request, res: Response) => {
  const isDbConnected = await checkDatabaseConnection();
  
  if (isDbConnected) {
    res.json({ status: 'ok', database: 'connected' });
  } else {
    res.status(500).json({ status: 'error', database: 'disconnected' });
  }
}));

// API Routes
router.use('/auth', authRoutes);
router.use('/syllabi', requireAuth, syllabusRoutes);
router.use('/tasks', requireAuth, taskRoutes);
router.use('/schedule', requireAuth, scheduleRoutes);
router.use('/dashboard', requireAuth, dashboardRoutes);
router.use('/focus', requireAuth, focusRoutes);
router.use('/courses', requireAuth, coursesRoutes);
router.use('/settings', requireAuth, settingsRoutes);

export default router;
