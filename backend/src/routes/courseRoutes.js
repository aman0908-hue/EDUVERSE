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
    isStudentJoined,
    getSlotJoinLink
} from '../controllers/courseController.js';
import { authMiddleware, teacherProtectedMiddleware, optionalAuth } from '../middlewares/authMiddleware.js';
import { courseUpload } from '../utils/upload.js';

const router = express.Router();

// --- TEACHER ONLY ROUTES (Auth + Role middleware ke sath) ---
router.post('/create', authMiddleware, teacherProtectedMiddleware, courseUpload, createCourse);
router.put('/update', authMiddleware, teacherProtectedMiddleware, courseUpload, updateCourse);
router.delete('/:courseId', authMiddleware, teacherProtectedMiddleware, deleteCourse);

// --- PUBLIC BROWSING (Requirement: GET /course/all with filter + paginate) ---
// optionalAuth: login ho to req.user milega (grade filter), na ho sab dikhega
router.get('/all', optionalAuth, getAllCourses);
router.get('/', optionalAuth, getAllCourses);

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

// --- 🔒 PROTECTED JOIN LINK (enrollment verified server-side) ---
// Must be registered BEFORE '/:id' below, otherwise "schedule" would be
// swallowed as a course id and the request would 404.
router.get('/schedule/join-link/:courseId/:slotIndex', authMiddleware, getSlotJoinLink);

// --- SINGLE COURSE (sabse niche) ---
// optionalAuth: enrolled students / the owner teacher / admins keep their
// meeting links; everyone else gets them blanked by getCourseById.
router.get('/:id', optionalAuth, getCourseById); 

export default router;