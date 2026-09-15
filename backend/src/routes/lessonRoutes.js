import express from 'express';
import { 
    addLesson, 
    getCourseLessons, 
    streamVideo,
    getChapterLectures,
    getSingleLecture,
    updateLesson,
    deleteLesson,
    addMaterials
} from '../controllers/lessonController.js';
import { authMiddleware, teacherProtectedMiddleware, isCourseJoinedMiddleware } from '../middlewares/authMiddleware.js';
import { lessonUpload, materialUpload } from '../utils/upload.js';

const router = express.Router();

// --- TEACHER ONLY (upload + manage) ---
router.post('/add', authMiddleware, teacherProtectedMiddleware, lessonUpload, addLesson);
router.post('/materials', authMiddleware, teacherProtectedMiddleware, materialUpload, addMaterials);
router.put('/:lectureId', authMiddleware, teacherProtectedMiddleware, lessonUpload, updateLesson);
router.delete('/:lectureId', authMiddleware, teacherProtectedMiddleware, deleteLesson);

// --- 🚀 CHUNKED VIDEO STREAMING (Range/206) — sirf enrolled students / teacher ke liye ---
router.get('/video/stream/:lectureId', authMiddleware, isCourseJoinedMiddleware, streamVideo);

// --- PUBLIC READS ---
router.get('/all/:chapterId', getChapterLectures);
router.get('/single/:lectureId', getSingleLecture);
router.get('/:courseId', getCourseLessons);

export default router;