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
router.use('/syllabi', syllabusRoutes);
router.use('/tasks', taskRoutes);
router.use('/schedule', scheduleRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/focus', focusRoutes);
router.use('/courses', coursesRoutes);

export default router;
