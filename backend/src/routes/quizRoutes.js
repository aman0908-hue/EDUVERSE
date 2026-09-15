import express from 'express';
import { 
    createQuiz, 
    getLessonQuizzes, 
    updateQuiz, 
    deleteQuiz, 
    submitQuiz,
    getQuizAttemptStatus
} from '../controllers/quizController.js';
import { authMiddleware, teacherProtectedMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// --- TEACHER ONLY (create/update/delete questions) ---
router.post('/create', authMiddleware, teacherProtectedMiddleware, createQuiz);
router.put('/:id', authMiddleware, teacherProtectedMiddleware, updateQuiz);
router.delete('/:id', authMiddleware, teacherProtectedMiddleware, deleteQuiz);

// --- STUDENT (attempt submit + status) ---
router.post('/submit', authMiddleware, submitQuiz); 
router.get('/status/:lessonId', getQuizAttemptStatus); 

// --- PUBLIC READ ---
router.get('/lesson/:lessonId', getLessonQuizzes);

export default router;