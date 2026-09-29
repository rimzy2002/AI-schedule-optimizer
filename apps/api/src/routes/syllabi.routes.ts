import { Router } from 'express';
import { syllabiController } from '../controllers/syllabi.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/extract', asyncHandler(syllabiController.extractSyllabus));
router.get('/active', asyncHandler(syllabiController.getActiveImport));
router.get('/jobs/:jobId', asyncHandler(syllabiController.getJobStatus));
router.get('/status/:id', asyncHandler(syllabiController.getSyllabusStatus));
router.get('/:id', asyncHandler(syllabiController.getSyllabusStatus));

export default router;
