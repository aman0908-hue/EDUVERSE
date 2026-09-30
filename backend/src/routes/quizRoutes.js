import express from 'express';
import { 
    createQuiz, 
    getLessonQuizzes, 
    updateQuiz, 
    deleteQuiz, 
    submitQuiz,
    getQuizAttemptStatus,
    generateQuiz,
    getCourseQuizzes
} from '../controllers/quizController.js';
import { authMiddleware, teacherProtectedMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// --- TEACHER ONLY (create/update/delete questions) ---
router.post('/create', authMiddleware, teacherProtectedMiddleware, createQuiz);
// 🤖 AI se quiz generate (lesson topic ya poore course ka final quiz)
router.post('/generate', authMiddleware, teacherProtectedMiddleware, generateQuiz);
router.put('/:id', authMiddleware, teacherProtectedMiddleware, updateQuiz);
router.delete('/:id', authMiddleware, teacherProtectedMiddleware, deleteQuiz);

// 🏆 Final course quiz questions (student ke liye)
router.get('/course/:courseId', authMiddleware, getCourseQuizzes);

// --- STUDENT (attempt submit + status) ---
router.post('/submit', authMiddleware, submitQuiz); 
router.get('/status/:lessonId', getQuizAttemptStatus); 

// --- PUBLIC READ ---
router.get('/lesson/:lessonId', getLessonQuizzes);

export default router;