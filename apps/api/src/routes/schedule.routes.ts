import { Router } from 'express';
import { generatePreview, acceptSchedule } from '../controllers/schedule.controller';

const router = Router();

router.post('/preview', generatePreview);
router.post('/accept', acceptSchedule);

export default router;
