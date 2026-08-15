import { Router } from 'express';
import { generateSchedule, getSchedule, getLatestSchedule } from '../controllers/schedule.controller';

const router = Router();

router.post('/generate', generateSchedule);
router.get('/latest', getLatestSchedule);
router.get('/:id', getSchedule);

export default router;
