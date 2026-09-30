import express from 'express';
import { listUsers, createTeacher, updateUserAccess, updateUserRole, getAdminDashboard, listTeacherRequests, reviewTeacherRequest, getAdminAnalytics } from '../controllers/adminController.js';
import { getPlatformOverview, listTeacherReports, listStudentReports, listCourseReports, listEnrollments, getActivityFeed, getUserReport, getCleanupReport, deleteDraftCourse, purgeOrphanData } from '../controllers/adminReportsController.js';
import { getAiSettings, saveAiSettings, testAiSettings } from '../controllers/aiSettingsController.js';
import { getMyTeacherRequest } from '../controllers/teacherRequestController.js';
import { authMiddleware, adminProtectedMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Student apna request status dekh sakta hai
router.get('/teacher-request/me', authMiddleware, getMyTeacherRequest);

router.use(authMiddleware, adminProtectedMiddleware);
router.get('/dashboard', getAdminDashboard);
router.get('/analytics', getAdminAnalytics);

// 🚀 Full-detail reports (admin ke liye poora data)
router.get('/overview', getPlatformOverview);
router.get('/reports/teachers', listTeacherReports);
router.get('/reports/students', listStudentReports);
router.get('/reports/courses', listCourseReports);
router.get('/reports/enrollments', listEnrollments);
router.get('/reports/activity', getActivityFeed);
router.get('/reports/users/:userId', getUserReport);

// AI provider settings (API key set / test / clear from the Admin Console)
router.get('/ai-settings', getAiSettings);
router.put('/ai-settings', saveAiSettings);
router.post('/ai-settings/test', testAiSettings);

// Cleanup: draft courses + orphan (deleted) records
router.get('/reports/cleanup', getCleanupReport);
router.post('/reports/cleanup/purge', purgeOrphanData);
router.delete('/reports/cleanup/draft/:courseId', deleteDraftCourse);

router.get('/users', listUsers);
router.post('/teachers', createTeacher);
router.patch('/users/:userId/access', updateUserAccess);
router.patch('/users/:userId/role', updateUserRole);
router.get('/teacher-requests', listTeacherRequests);
router.patch('/teacher-requests/:requestId', reviewTeacherRequest);

export default router;
