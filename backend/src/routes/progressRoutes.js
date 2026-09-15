import express from 'express';
import { markComplete, markIncomplete, getProgress, getQuizProgress, submitQuizAttempt, getCourseAnalytics, getStudentDashboard } from '../controllers/progressController.js';
import { authMiddleware, teacherProtectedMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Specific routes hamesha pehle aane chahiye
router.post('/mark-complete', authMiddleware, markComplete);
router.post('/mark-incomplete', authMiddleware, markIncomplete); // 🚀 NAYA
router.post('/submit-quiz', authMiddleware, submitQuizAttempt);

// 🚀 NAYA: Quiz progress (requirement: GET /progress/quiz-progress/:studentId/:courseId)
router.get('/quiz-progress/:studentId/:courseId', getQuizProgress);

// Teacher analytics (sirf teacher)
router.get('/analytics/:courseId', authMiddleware, teacherProtectedMiddleware, getCourseAnalytics); 

// Student dashboard
router.get('/dashboard/student/:studentId', authMiddleware, getStudentDashboard);

// Dynamic routes hamesha sabse aakhiri mein hone chahiye
router.get('/:studentId/:courseId', getProgress);

export default router;