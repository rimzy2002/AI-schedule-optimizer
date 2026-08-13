import { Router } from 'express';
import { 
  startFocusSession, 
  pauseFocusSession, 
  resumeFocusSession, 
  completeFocusSession,
  getFocusSession 
} from '../controllers/focus.controller';

const router = Router();

router.post('/start', startFocusSession);
router.patch('/:id/pause', pauseFocusSession);
router.patch('/:id/resume', resumeFocusSession);
router.patch('/:id/complete', completeFocusSession);
router.get('/:id', getFocusSession);

export default router;
