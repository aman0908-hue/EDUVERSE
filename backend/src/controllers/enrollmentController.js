import Enrollment from '../models/Enrollment.js';

// ============================================
// 🚀 ENROLLMENT CONTROLLER (Requirement 5)
// POST /enrollement/join + joined-check APIs
// ============================================

// 1. Student ko course mein join karna
export const joinCourse = async (req, res) => {
    try {
        // Pehle logged-in user (auth middleware), warna body se
        const studentId = (req.user && req.user._id) || req.body.studentId;
        const courseId = req.body.courseId;

        if (!studentId || !courseId) {
            return res.status(400).json({ success: false, message: "studentId and courseId are required." });
        }

        const existing = await Enrollment.findOne({ student: studentId, course: courseId });
        if (existing) {
            return res.status(400).json({ success: false, message: "You are already enrolled in this course." });
        }

        const enrollment = await Enrollment.create({ student: studentId, course: courseId });
        res.status(201).json({ success: true, message: "Enrolled successfully!", enrollment });
    } catch (error) {
        res.status(500).json({ success: false, message: "Enrollment failed: " + error.message });
    }
};

// 2. Kya student course join kar chuka hai?
export const checkJoined = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const studentId = (req.user && req.user._id) || req.query.studentId;

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