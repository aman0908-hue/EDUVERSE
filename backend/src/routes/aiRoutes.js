import express from 'express';
import { askStudyAssistant, checkAiAccess, askGeneralAssistant, getAiStatus } from '../controllers/aiController.js';
import { authMiddleware, isCourseJoinedMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.get('/status', authMiddleware, getAiStatus);
router.post('/ask', authMiddleware, askGeneralAssistant);
router.get('/study-assistant/access/:courseId', authMiddleware, isCourseJoinedMiddleware, checkAiAccess);
router.post('/study-assistant', authMiddleware, isCourseJoinedMiddleware, askStudyAssistant);

export default router;
