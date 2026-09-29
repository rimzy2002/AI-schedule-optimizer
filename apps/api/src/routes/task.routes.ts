import { Router } from 'express';
import { createTask, updateTask, deleteTask, confirmTasks } from '../controllers/task.controller';

const router = Router();

router.post('/', createTask);
router.patch('/:id', updateTask);
router.delete('/:id', deleteTask);
router.post('/confirm', confirmTasks);

export default router;
