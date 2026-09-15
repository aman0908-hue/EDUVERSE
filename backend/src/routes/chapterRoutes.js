import express from 'express';
import { createChapter, getModuleChapters, getSingleChapter, updateChapter, deleteChapter } from '../controllers/chapterController.js';
import { authMiddleware, teacherProtectedMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// --- TEACHER ONLY ---
router.post('/', authMiddleware, teacherProtectedMiddleware, createChapter);
router.put('/:chapterId', authMiddleware, teacherProtectedMiddleware, updateChapter);
router.delete('/:chapterId', authMiddleware, teacherProtectedMiddleware, deleteChapter);

// --- PUBLIC READS ---
router.get('/:moduleId', getModuleChapters);
router.get('/single/:chapterId', getSingleChapter);

export default router;