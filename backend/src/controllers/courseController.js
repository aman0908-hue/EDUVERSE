import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Module from '../models/Module.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';
import Progress from '../models/Progress.js';

// Helper: string ko newline-separated array mein convert karna
const toList = (value) => {
    if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
    if (typeof value === 'string') return value.split('\n').map(s => s.trim()).filter(Boolean);
    return [];
};

// Naya Course banane ka logic (Thumbnail + Trailer upload support ke sath)
export const createCourse = async (req, res) => {
    try {
        const { title, description, category, price, instructor, language, level, requirements, learningOutcomes } = req.body;

        if (!title || !description || !category) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        const newCourse = await Course.create({
            title,
            description,
            category,
            price: price || 0,
            instructor: instructor || (req.user && req.user._id),
            language: language || 'English',
            level: level || 'Beginner',
            requirements: toList(requirements),
            learningOutcomes: toList(learningOutcomes),
            // Multer se aayi files (courseUpload middleware)
            thumbnail: (req.files && req.files.thumbnail && req.files.thumbnail[0]) ? req.files.thumbnail[0].filename : '',
            trailerVideo: (req.files && req.files.trailerVideo && req.files.trailerVideo[0]) ? req.files.trailerVideo[0].filename : ''
        });

        res.status(201).json({
            success: true,
            message: "Course created successfully!",
            course: newCourse
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error creating course: " + error.message });
    }
};

// 🚀 NAYA: Course update karna (PUT /course/update) — files optional
export const updateCourse = async (req, res) => {
    try {
        const courseId = req.body.courseId || req.params.courseId || req.params.id;
        if (!courseId) {
            return res.status(400).json({ success: false, message: "courseId is required" });
        }

        const updateFields = {};
        const allowedFields = ['title', 'description', 'category', 'price', 'language', 'level'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== '') updateFields[field] = req.body[field];
        });

        // Textarea lists handle karna
        if (req.body.requirements !== undefined) updateFields.requirements = toList(req.body.requirements);
        if (req.body.learningOutcomes !== undefined) updateFields.learningOutcomes = toList(req.body.learningOutcomes);

        // Agar nayi files aayi hain toh replace karo
        if (req.files && req.files.thumbnail && req.files.thumbnail[0]) updateFields.thumbnail = req.files.thumbnail[0].filename;
        if (req.files && req.files.trailerVideo && req.files.trailerVideo[0]) updateFields.trailerVideo = req.files.trailerVideo[0].filename;

        // Publish toggle bhi support karo
        if (req.body.isPublished !== undefined) updateFields.isPublished = req.body.isPublished === 'true' || req.body.isPublished === true;

        const updatedCourse = await Course.findByIdAndUpdate(courseId, updateFields, { new: true, runValidators: true });
        if (!updatedCourse) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        res.status(200).json({ success: true, message: "Course updated successfully!", course: updatedCourse });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error updating course: " + error.message });
    }
};

// Teacher ke banaye hue saare courses nikalna
export const getTeacherCourses = async (req, res) => {
    try {
        const instructorId = req.params.instructorId;
        const courses = await Course.find({ instructor: instructorId }).sort({ createdAt: -1 });
        
        res.status(200).json({ success: true, courses });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching courses: " + error.message });
    }
};

// --- YAHAN UPDATE KIYA HAI: Filters aur Pagination ke sath getAllCourses ---
export const getAllCourses = async (req, res) => {
    try {
        // 1. Query parameters nikalna
        const { category, language, level, search, page = 1, limit = 6 } = req.query;

        // 2. Filter object banana
        let query = {};
        
        if (category) query.category = category;
        if (language) query.language = language;
        if (level) query.level = level;
        if (search) {
            query.title = { $regex: search, $options: 'i' }; 
        }

        // 3. Pagination ka calculation
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // 4. Database se data nikalna
        const courses = await Course.find(query)
            .populate('instructor', 'name')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 }); 

        // 5. Total pages count karna
        const totalCourses = await Course.countDocuments(query);
        const totalPages = Math.ceil(totalCourses / parseInt(limit));

        res.status(200).json({ 
            success: true, 
            courses, 
            currentPage: parseInt(page), 
            totalPages,
            totalCourses
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching courses: " + error.message });
    }
};

// Course ko hamesha ke liye Delete karna (Cascade: modules, chapters, lessons, enrollments, progress bhi)
export const deleteCourse = async (req, res) => {
    try {
        const courseId = req.params.courseId;

        const course = await Course.findById(courseId);
        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }

        // Pehle related content delete karo (Clean database)
        const chapters = await Chapter.find({ courseId });
        const chapterIds = chapters.map(c => c._id);
        await Promise.all([
            Lesson.deleteMany({ courseId }),
            Chapter.deleteMany({ courseId }),
            Module.deleteMany({ courseId }),
            Enrollment.deleteMany({ course: courseId }),
            Progress.deleteMany({ courseId })
        ]);
        await Course.findByIdAndDelete(courseId);

        res.status(200).json({ success: true, message: "Course deleted permanently from database!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting course" });
    }
};


// ========================================================
// --- STUDENT ENROLLMENT KE FUNCTIONS ---
// ========================================================

// 1. Student ko course mein Enroll karna
export const enrollCourse = async (req, res) => {
    try {
        const { studentId, courseId } = req.body;
        
        const existingEnrollment = await Enrollment.findOne({ student: studentId, course: courseId });
        if (existingEnrollment) {
            return res.status(400).json({ success: false, message: "You are already enrolled in this course." });
        }

        await Enrollment.create({ student: studentId, course: courseId });
        
        res.status(200).json({ success: true, message: "Enrolled successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Enrollment failed: " + error.message });
    }
};

// 2. Sirf usi student ke 'Enrolled Courses' nikalna
export const getMyCourses = async (req, res) => {
    try {
        const { studentId } = req.params;
        
        const enrollments = await Enrollment.find({ student: studentId }).populate('course');
        const myCourses = enrollments.map(e => e.course).filter(course => course !== null);
        
        res.status(200).json({ success: true, courses: myCourses });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching enrolled courses: " + error.message });
    }
};

// ========================================================
// --- NAYA FUNCTION: Ek single course ki details nikalna ---
// ========================================================
export const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id || req.params.courseId).populate('instructor', 'name email profileImage');
        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found" });
        }
        res.status(200).json({ success: true, course });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching course details" });
    }
};

// ========================================================
// 🚀 NAYA: Teacher Dashboard Stats (Requirement: GET /course/teacher-dashboard/:teacherId)
// ========================================================
export const getTeacherDashboard = async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        // Teacher ke saare courses
        const courses = await Course.find({ instructor: teacherId });
        const courseIds = courses.map(c => c._id);

        // In courses mein kitne students enrolled hain
        const enrollments = await Enrollment.find({ course: { $in: courseIds } });

        // Unique students count
        const uniqueStudents = [...new Set(enrollments.map(e => e.student.toString()))];

        // Revenue: har enrollment us course ke price jitna
        let totalRevenue = 0;
        enrollments.forEach(enrollment => {
            const course = courses.find(c => c._id.toString() === enrollment.course.toString());
            totalRevenue += course ? (course.price || 0) : 0;
        });

        res.status(200).json({
            success: true,
            stats: {
                totalCourses: courses.length,
                totalStudents: uniqueStudents.length,
                totalEnrollments: enrollments.length,
                totalRevenue
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching teacher dashboard: " + error.message });
    }
};

// ========================================================
// 🚀 NAYA: Kya student yeh course join kar chuka hai? (Requirement: GET /course/is-student-joined/:courseId)
// ========================================================
export const isStudentJoined = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        const studentId = (req.user && req.user._id) || req.query.studentId;

        const enrollment = await Enrollment.findOne({ student: studentId, course: courseId });
        res.status(200).json({ success: true, joined: !!enrollment });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error checking enrollment: " + error.message });
    }
};