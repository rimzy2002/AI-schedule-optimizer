import { Router } from 'express';
import { confirmTasks } from '../controllers/task.controller';

const router = Router();

router.post('/confirm', confirmTasks);

export default router;
