import express from 'express';
import { createChapter, getModuleChapters, getSingleChapter, updateChapter, deleteChapter, uploadChapterPdf, deleteChapterPdf, chapterPdfUpload } from '../controllers/chapterController.js';
import { authMiddleware, teacherProtectedMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// --- TEACHER ONLY ---
router.post('/', authMiddleware, teacherProtectedMiddleware, createChapter);
router.put('/:chapterId', authMiddleware, teacherProtectedMiddleware, updateChapter);
router.delete('/:chapterId', authMiddleware, teacherProtectedMiddleware, deleteChapter);

// 📄 Chapter PDF upload/delete
router.post('/:chapterId/pdf', authMiddleware, teacherProtectedMiddleware, chapterPdfUpload, uploadChapterPdf);
router.delete('/:chapterId/pdf/:pdfId', authMiddleware, teacherProtectedMiddleware, deleteChapterPdf);

// --- PUBLIC READS ---
router.get('/:moduleId', getModuleChapters);
router.get('/single/:chapterId', getSingleChapter);

export default router;