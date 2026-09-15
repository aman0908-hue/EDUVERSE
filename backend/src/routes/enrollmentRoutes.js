import express from 'express';
import { joinCourse, checkJoined, getStudentJoinedCourses } from '../controllers/enrollmentController.js';
import { authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Join karna (sirf logged-in user)
router.post('/join', authMiddleware, joinCourse);

// Join-status check
router.get('/is-joined/:courseId', authMiddleware, checkJoined);

// Student ke joined courses
router.get('/student-join-courses/:studentId', getStudentJoinedCourses);

export default router;