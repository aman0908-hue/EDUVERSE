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

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// 🎓 Valid grades (5 se 12 + UG + 'All' = sabko dikhega)
const GRADES = ['5', '6', '7', '8', '9', '10', '11', '12', 'UG', 'All'];

// 🌍 Language courses ke liye allowed languages
const COURSE_LANGUAGES = [
    'English', 'Hindi', 'Sanskrit', 'Marathi', 'Bengali',
    'Tamil', 'Telugu', 'Gujarati', 'Kannada', 'Malayalam',
    'Punjabi', 'Urdu', 'Spanish', 'French', 'German', 'Japanese'
];

// Grade ko hamesha string me normalize karta hai.
// (JSON body me number 10 aa sakta hai, FormData me "10" — dono handle karo,
//  warna GRADES.includes(10) false hone se grade galti se 'All' ban jata tha.)
const resolveGrade = (value) => {
    const g = String(value ?? '').trim();
    return GRADES.includes(g) ? g : 'All';
};

// 🔒 Teacher sirf unhi classes ke liye course bana sakta hai jinke liye admin ne
//    approve kiya hai (User.teachesGrades). List khali hai ya role admin hai
//    to koi restriction nahi.
const teacherCanTeachGrade = (user, grade) => {
    if (!user) return true;
    if (user.role === 'admin') return true;
    const approved = Array.isArray(user.teachesGrades) ? user.teachesGrades.map(String) : [];
    if (!approved.length) return true;          // koi restriction nahi lagi
    return approved.includes(grade);
};

// Schedule entries ko clean + validate karta hai (time HH:MM, valid day)
// Multipart form se JSON string aati hai, JSON body se array — dono handle karta hai
const normalizeSchedule = (value) => {
    let list = value;
    if (typeof list === 'string') {
        const raw = list.trim();
        if (!raw) return [];
        try { list = JSON.parse(raw); }
        catch { return []; }   // invalid JSON → koi schedule nahi
    }
    if (!Array.isArray(list)) return [];

    return list
        .filter(item => item && typeof item === 'object' && (item.day || item.startTime || item.date || item.label))
        .slice(0, 30)
        .map(item => {
            const time = t => {
                const raw = String(t || '').trim();
                return /^([01]?\d|2[0-3]):[0-5]\d$/.test(raw) ? raw.padStart(5, '0') : '';
            };
            const start = time(item.startTime);
            const end = time(item.endTime);
            return {
                label: String(item.label || '').trim().slice(0, 120),
                day: DAYS.includes(item.day) ? item.day : 'Monday',
                startTime: start || '10:00',
                endTime: end || start || '11:00',
                date: /^\d{4}-\d{2}-\d{2}$/.test(String(item.date || '').trim()) ? String(item.date).trim() : '',
                isLive: item.isLive !== false && item.isLive !== 'false',
                meetingLink: String(item.meetingLink || '').trim().slice(0, 300)
            };
        });
};

// Naya Course banane ka logic (Thumbnail + Trailer upload support ke sath)
export const createCourse = async (req, res) => {
    try {
        const { title, description, category, grade, courseLanguage, price, instructor, language, level, requirements, learningOutcomes, schedule, scheduleNote } = req.body;

        if (!title || !description || !category) {
            return res.status(400).json({ success: false, message: "Please provide all required fields" });
        }

        const finalGrade = resolveGrade(grade);

        // 🔒 Teacher apni approved classes ke bahar course nahi bana sakta
        if (!teacherCanTeachGrade(req.user, finalGrade)) {
            return res.status(403).json({
                success: false,
                message: `Aap sirf apni approved classes (${req.user.teachesGrades.join(', ')}) ke liye course bana sakte hain.`
            });
        }

        const newCourse = await Course.create({
            title,
            description,
            category,
            // 🎓 Kis class ke liye hai — students ko filter karta hai
            grade: finalGrade,
            // 🌍 Language course me kaunsi language padhayi ja rahi hai
            courseLanguage: COURSE_LANGUAGES.includes(courseLanguage) ? courseLanguage : '',
            price: price || 0,
            instructor: req.user._id,
            language: language || 'English',
            level: level || 'Beginner',
            requirements: toList(requirements),
            learningOutcomes: toList(learningOutcomes),
            schedule: normalizeSchedule(schedule),
            scheduleNote: String(scheduleNote || '').trim().slice(0, 300),
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

        const existingCourse = await Course.findById(courseId);
        if (!existingCourse) {
            return res.status(404).json({ success: false, message: 'Course not found' });
        }
        if (existingCourse.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'You can only update your own courses.' });
        }

        const updateFields = {};
        const allowedFields = ['title', 'description', 'category', 'price', 'language', 'level'];
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== '') updateFields[field] = req.body[field];
        });

        // Textarea lists handle karna
        if (req.body.requirements !== undefined) updateFields.requirements = toList(req.body.requirements);
        if (req.body.learningOutcomes !== undefined) updateFields.learningOutcomes = toList(req.body.learningOutcomes);

        // Class schedule (day + time) — AI isse "kab hai class" ka jawab deta hai
        if (req.body.schedule !== undefined) updateFields.schedule = normalizeSchedule(req.body.schedule);
        if (req.body.scheduleNote !== undefined) updateFields.scheduleNote = String(req.body.scheduleNote).trim().slice(0, 300);
        // 🎓 Grade update — normalize + teacher ki approved classes ka check
        if (req.body.grade !== undefined) {
            const finalGrade = resolveGrade(req.body.grade);
            if (!teacherCanTeachGrade(req.user, finalGrade)) {
                return res.status(403).json({
                    success: false,
                    message: `Aap sirf apni approved classes (${(req.user.teachesGrades || []).join(', ')}) ke liye course update kar sakte hain.`
                });
            }
            updateFields.grade = finalGrade;
        }
        if (req.body.courseLanguage !== undefined) {
            updateFields.courseLanguage = COURSE_LANGUAGES.includes(req.body.courseLanguage) ? req.body.courseLanguage : '';
        }

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

        // 🎓 GRADE FILTER
        // Student ko sirf apne grade ('10') aur 'All' courses dikhenge.
        // Teacher/admin ko ?grade=10 se filter karne ka option milta hai.
        const { grade } = req.query;
        if (grade) {
            query.grade = grade;
        } else if (req.user?.role === 'student' && req.user.grade && req.user.grade !== 'All') {
            query.grade = { $in: [req.user.grade, 'All'] };
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
        if (course.instructor.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: "You can only delete your own courses." });
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
        const { courseId } = req.body;
        // 🔒 Always derive the student from the logged-in user. Reading it from the
        //    body caused two bugs:
        //    (a) IDOR — any user could enroll somebody else's account,
        //    (b) when studentId was undefined, Mongoose stripped it from the
        //        query, turning it into findOne({ course }) which matched ANY
        //        student's enrollment and wrongly replied "already enrolled".
        //        That is exactly why even FREE courses appeared to fail to join.
        const studentId = req.user && req.user._id;
        if (!studentId) {
            return res.status(401).json({ success: false, message: "Please log in to enroll in a course." });
        }
        if (!courseId) {
            return res.status(400).json({ success: false, message: "courseId is required." });
        }

        // Verify the course exists — without this an invalid ObjectId throws a 500
        const course = await Course.findById(courseId).select('_id').lean();
        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found." });
        }

        const existingEnrollment = await Enrollment.findOne({ student: studentId, course: courseId });
        if (existingEnrollment) {
            // Already enrolled IS a success for the user — avoid a red error toast
            // on double-click or duplicate fetches
            return res.status(200).json({ success: true, message: "You are already enrolled in this course." });
        }

        try {
            await Enrollment.create({ student: studentId, course: courseId });
        } catch (err) {
            // Unique index (student+course) race — the user double-clicked
            if (err && err.code === 11000) {
                return res.status(200).json({ success: true, message: "You are already enrolled in this course." });
            }
            throw err;
        }

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

        // 🔒 Do not hand out live meeting URLs to just anyone. The caller must
        //    prove enrollment; see getSlotJoinLink for how the URL is released.
        //    Signed-out visitors therefore never receive a join link at all.
        const studentId = req.user && req.user._id;
        const isPrivileged = studentId && (
            req.user.role === 'admin' ||
            (course.instructor && course.instructor._id &&
             course.instructor._id.toString() === studentId.toString())
        );

        let allowed = !!isPrivileged;
        if (!allowed && studentId) {
            const enrollment = await Enrollment.findOne({ student: studentId, course: course._id }).lean();
            allowed = !!enrollment;
        }

        if (!allowed && Array.isArray(course.schedule)) {
            course.schedule = course.schedule.map(slot => ({ ...slot, meetingLink: '' }));
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
// 🔒 PROTECTED: Live class join link (enrollment required)
// GET /course/schedule/join-link/:courseId/:slotIndex
//
// The meeting URLs live on the Course document, so hiding them in React is only
// cosmetic — anyone can read them from GET /course/:id. This endpoint is the
// real gate: it returns a URL ONLY for a logged-in user who is enrolled.
// ========================================================
export const getSlotJoinLink = async (req, res) => {
    try {
        const { courseId, slotIndex } = req.params;
        const studentId = req.user && req.user._id;

        if (!studentId) {
            return res.status(401).json({ success: false, message: "Please log in to join the class." });
        }

        const course = await Course.findById(courseId).select('schedule instructor').lean();
        if (!course) {
            return res.status(404).json({ success: false, message: "Course not found." });
        }

        // The course's own teacher (and any admin) may always join their class.
        const isOwner = course.instructor && course.instructor.toString() === studentId.toString();
        const isAdmin = req.user.role === 'admin';

        if (!isOwner && !isAdmin) {
            const enrollment = await Enrollment.findOne({ student: studentId, course: courseId }).lean();
            if (!enrollment) {
                return res.status(403).json({
                    success: false,
                    message: "Enroll in this course to join the live class."
                });
            }
        }

        const index = Number(slotIndex);
        if (!Number.isInteger(index) || index < 0 || index >= (course.schedule || []).length) {
            return res.status(404).json({ success: false, message: "Class slot not found." });
        }

        const link = course.schedule[index].meetingLink;
        if (!link) {
            return res.status(404).json({ success: false, message: "No meeting link for this class." });
        }

        res.status(200).json({ success: true, meetingLink: link });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching join link: " + error.message });
    }
};

// ========================================================
// 🚀 NAYA: Kya student yeh course join kar chuka hai? (Requirement: GET /course/is-student-joined/:courseId)
// ========================================================
export const isStudentJoined = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        // Never trust a query-string studentId — it would let any logged-in user
        // probe whether an arbitrary student is enrolled in a course. Session only.
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