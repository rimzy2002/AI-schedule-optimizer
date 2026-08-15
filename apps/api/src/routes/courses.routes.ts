import { Router } from 'express';
import { coursesController } from '../controllers/courses.controller';

const router = Router();

router.get('/', coursesController.getCourses);
router.get('/:id', coursesController.getCourseDetails);
router.get('/:id/tasks', coursesController.getCourseTasks);

export default router;
