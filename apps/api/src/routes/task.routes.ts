import { Router } from 'express';
import { confirmTasks, updateTask } from '../controllers/task.controller';

const router = Router();

router.patch('/:id', updateTask);
router.post('/confirm', confirmTasks);

export default router;
