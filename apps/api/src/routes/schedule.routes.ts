import { Router } from 'express';
import { generateSchedule, getSchedule, getLatestSchedule, listSchedules } from '../controllers/schedule.controller';

const router = Router();

router.post('/generate', generateSchedule);
router.get('/', listSchedules);
router.get('/list', listSchedules);
router.get('/latest', getLatestSchedule);
router.get('/:id', getSchedule);

export default router;
