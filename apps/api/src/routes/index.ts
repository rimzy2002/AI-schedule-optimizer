import { Router, Request, Response } from 'express';
import { checkDatabaseConnection } from '../config/database';
import { asyncHandler } from '../utils/asyncHandler';
import authRoutes from './auth.routes';

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

export default router;
