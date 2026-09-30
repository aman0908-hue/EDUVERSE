import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';

// ============================================
// 🚀 ENROLLMENT CONTROLLER (Requirement 5)
// POST /enrollement/join + joined-check APIs
// ============================================

// 1. Student ko course mein join karna
export const joinCourse = async (req, res) => {
    try {
        // Always use the logged-in user. Falling back to req.body.studentId allowed
        // any authenticated user to enroll somebody else's account (IDOR).
        const studentId = req.user && req.user._id;
        const courseId = req.body.courseId;

        if (!studentId) {
            return res.status(401).json({ success: false, message: "Please log in to enroll in a course." });
        }
        if (!courseId) {
            return res.status(400).json({ success: false, message: "courseId is required." });
        }

        // Verify the course exists — returns a clean 404 instead of a 500
        // when the ID is invalid or the course was deleted
        const course = await Course.findById(courseId).select('_id').lean();
        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found." });
        }

        const existing = await Enrollment.findOne({ student: studentId, course: courseId });
        if (existing) {
            // Already enrolled IS a success. This used to return 400, which made
            // the frontend show a "failed" toast even though the user was enrolled.
            return res.status(200).json({ success: true, message: "You are already enrolled in this course." });
        }

        let enrollment;
        try {
            enrollment = await Enrollment.create({ student: studentId, course: courseId });
        } catch (err) {
            // Unique index (student+course) race — triggered by a double click
            if (err && err.code === 11000) {
                return res.status(200).json({ success: true, message: "You are already enrolled in this course." });
            }
            throw err;
        }
        res.status(201).json({ success: true, message: "Enrolled successfully!", enrollment });
    } catch (error) {
        res.status(500).json({ success: false, message: "Enrollment failed: " + error.message });
    }
};

// 2. Kya student course join kar chuka hai?
export const checkJoined = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        // Never trust a query-string studentId — it would let anyone probe whether
        // an arbitrary student is enrolled in a course. Use the session only.
        const studentId = req.user && req.user._id;

        if (!studentId) {
            return res.status(401).json({ success: false, message: "Please log in to check enrollment." });
        }

        const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
        res.status(200).json({ success: true, joined: !!enrollment });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error checking enrollment: " + error.message });
    }
};

// 3. Student ke saare joined courses (course details ke sath)
export const getStudentJoinedCourses = async (req, res) => {
    try {
        const studentId = req.params.studentId || (req.user && req.user._id);
        const enrollments = await Enrollment.find({ student: studentId }).populate('course');
        const courses = enrollments.map(e => e.course).filter(Boolean);
        res.status(200).json({ success: true, courses });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching joined courses: " + error.message });
    }
};