import express from 'express';
import { createModule, getCourseModules, getSingleModule, updateModule, deleteModule } from '../controllers/moduleController.js';
import { authMiddleware, teacherProtectedMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// --- TEACHER ONLY ---
router.post('/', authMiddleware, teacherProtectedMiddleware, createModule);
router.put('/:moduleId', authMiddleware, teacherProtectedMiddleware, updateModule);
router.delete('/:moduleId', authMiddleware, teacherProtectedMiddleware, deleteModule);

// --- PUBLIC READS ---
router.get('/:courseId', getCourseModules);
router.get('/single-module/:moduleId', getSingleModule);

export default router;