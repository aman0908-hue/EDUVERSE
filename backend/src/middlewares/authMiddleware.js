import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js'; // 🚀 NAYA: Enrollment model import kiya
import Lesson from '../models/Lesson.js'; // 🚀 NAYA: Video stream route ke liye lesson lookup

// 1. Check karna ki user logged-in hai ya nahi (JWT token verify karna)
export const authMiddleware = async (req, res, next) => {
    try {
        // Cookie, headers ya query param se token nikalna (query video streaming ke liye)
        const token = req.cookies.token || req.headers.authorization?.split(" ")[1] || req.query.token;

        if (!token) {
            return res.status(401).json({ message: "Access Denied! Token nahi mila. Kripya login karein." });
        }

        // Token verify karna
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");
        
        if (!req.user) {
            return res.status(404).json({ message: "User nahi mila." });
        }

        next(); // Agle middleware ya controller par bhejna
    } catch (error) {
        res.status(401).json({ message: "Invalid Token", error: error.message });
    }
};

// 2. Check karna ki user Teacher hai ya nahi (Role-based access)
export const teacherProtectedMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'teacher') {
        next();
    } else {
        res.status(403).json({ message: "Access denied! Ye action sirf teachers ke liye hai." });
    }
};

// 3. 🚀 NAYA: Check karna ki kya student ne course join kiya hai (Video streaming protection ke liye)
export const isCourseJoinedMiddleware = async (req, res, next) => {
    try {
        // URL ya body se courseId nikalna (GET requests mein req.body undefined ho sakta hai — optional chaining zaroori)
        let courseId = req.params.courseId || req.body?.courseId || req.params.id || req.query.courseId;

        // 🚀 Agar sirf lectureId mila hai (video stream route), toh Lesson se courseId nikalo
        const lectureId = req.params.lectureId || req.body?.lectureId;
        if (!courseId && lectureId) {
            const lesson = await Lesson.findById(lectureId).select('courseId');
            courseId = lesson ? lesson.courseId : null;
        }
        
        if (!courseId) {
            return res.status(400).json({ success: false, message: "Course ID nahi mila." });
        }

        // Agar teacher khud dekh raha hai toh usko rokna nahi hai
        if (req.user && req.user.role === 'teacher') {
            return next();
        }

        // Check karo ki database mein student ne ye course kharida/join kiya hai ya nahi
        const enrollment = await Enrollment.findOne({ student: req.user._id, course: courseId });

        if (!enrollment) {
            return res.status(403).json({ success: false, message: "Aapko yeh content dekhne ke liye course join karna hoga!" });
        }
        
        next();
    } catch (error) {
        console.error("isCourseJoinedMiddleware error:", error.message, "\n", error);
        res.status(500).json({ success: false, message: "Enrollment check karne mein error aayi.", error: error.message });
    }
};