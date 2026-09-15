import express from 'express';
import { 
    createCourse, 
    updateCourse,
    getTeacherCourses, 
    getAllCourses, 
    deleteCourse,
    enrollCourse, 
    getMyCourses,
    getCourseById,
    getTeacherDashboard,
    isStudentJoined
} from '../controllers/courseController.js';
import { authMiddleware, teacherProtectedMiddleware } from '../middlewares/authMiddleware.js';
import { courseUpload } from '../utils/upload.js';

const router = express.Router();

// --- TEACHER ONLY ROUTES (Auth + Role middleware ke sath) ---
router.post('/create', authMiddleware, teacherProtectedMiddleware, courseUpload, createCourse);
router.put('/update', authMiddleware, teacherProtectedMiddleware, courseUpload, updateCourse);
router.delete('/:courseId', authMiddleware, teacherProtectedMiddleware, deleteCourse);

// --- PUBLIC BROWSING (Requirement: GET /course/all with filter + paginate) ---
router.get('/all', getAllCourses);
router.get('/', getAllCourses);

// --- TEACHER & STUDENT SPECIFIC ---
router.get('/teacher-courses/:teacherId', getTeacherCourses);
router.get('/instructor/:instructorId', getTeacherCourses);
router.get('/teacher-dashboard/:teacherId', getTeacherDashboard);
router.get('/student-join-courses/:studentId', getMyCourses);
router.get('/my-courses/:studentId', getMyCourses);

// --- ENROLLMENT CHECK (Requirement: GET /course/is-student-joined/:courseId) ---
router.get('/is-student-joined/:courseId', authMiddleware, isStudentJoined);

// --- ENROLLMENT (requirement: POST /enrollement/join ka equivalent) ---
router.post('/enroll', authMiddleware, enrollCourse);

// --- SINGLE COURSE (sabse niche) ---
router.get('/:id', getCourseById); 

export default router;