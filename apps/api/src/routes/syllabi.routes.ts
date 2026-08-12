import { Router } from 'express';
import { syllabiController } from '../controllers/syllabi.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

router.post('/extract', asyncHandler(syllabiController.extractSyllabus));
router.get('/jobs/:jobId', asyncHandler(syllabiController.getJobStatus));

export default router;
