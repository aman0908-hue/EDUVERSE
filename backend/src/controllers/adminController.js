import bcrypt from 'bcrypt';
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import TeacherRequest from '../models/TeacherRequest.js';
import Progress from '../models/Progress.js';

const cleanEmail = value => String(value || '').trim().toLowerCase();

export const ensureAdminUser = async () => {
    const email = cleanEmail(process.env.ADMIN_EMAIL);
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) return;

    // Agar koi bhi admin already exist karta hai to kuch nahi karna.
    // Isse Mongo me admin rename/delete kiya to wo wapas nahi aayega.
    const adminExists = await User.exists({ role: 'admin' });
    if (adminExists) return;

    const passwordHash = await bcrypt.hash(password, 12);
    await User.findOneAndUpdate(
        { email },
        { name: process.env.ADMIN_NAME || 'ATs Learning Admin', role: 'admin', isActive: true, password: passwordHash },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Admin user bootstrapped: ${email}`);
};

export const getAdminDashboard = async (req, res) => {
    const [users, teachers, students, courses, enrollments, recentUsers] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ role: 'teacher', isActive: true }),
        User.countDocuments({ role: 'student', isActive: true }),
        Course.countDocuments({}),
        Enrollment.countDocuments({}),
        User.find({}).select('-password').sort({ createdAt: -1 }).limit(6)
    ]);
    res.json({ success: true, stats: { users, teachers, students, courses, enrollments }, recentUsers });
};

export const listUsers = async (req, res) => {
    const { role, search } = req.query;
    const query = {};
    if (['student', 'teacher', 'admin'].includes(role)) query.role = role;
    if (search) query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
    ];
    const users = await User.find(query).select('-password').sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, users });
};

export const createTeacher = async (req, res) => {
    const name = String(req.body?.name || '').trim();
    const email = cleanEmail(req.body?.email);
    const password = String(req.body?.password || '');
    if (!name || !email || password.length < 8) {
        return res.status(400).json({ message: 'Name, email and a password of at least 8 characters are required.' });
    }
    if (await User.exists({ email })) return res.status(409).json({ message: 'Email is already registered.' });
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 12), role: 'teacher', isActive: true });
    user.password = undefined;
    res.status(201).json({ success: true, message: 'Teacher account created.', user });
};

export const updateUserAccess = async (req, res) => {
    const isActive = req.body?.isActive === true || req.body?.isActive === 'true';
    if (req.params.userId === req.user._id.toString()) return res.status(400).json({ message: 'You cannot change your own access.' });
    const user = await User.findByIdAndUpdate(req.params.userId, { isActive }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ success: true, message: isActive ? 'User activated.' : 'User deactivated.', user });
};

export const updateUserRole = async (req, res) => {
    const role = req.body?.role;
    if (!['student', 'teacher'].includes(role)) return res.status(400).json({ message: 'Only student or teacher role can be assigned here.' });
    if (req.params.userId === req.user._id.toString()) return res.status(400).json({ message: 'You cannot change your own role.' });
    const user = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json({ success: true, message: 'User role updated.', user });
};

// ---- Teacher approval requests ----

export const getAdminAnalytics = async (req, res) => {
    const [teachers, students, courses, enrollments, progresses, pendingRequests] = await Promise.all([
        User.find({ role: 'teacher' }).select('name email isActive createdAt').lean(),
        User.find({ role: 'student' }).select('name email isActive createdAt').lean(),
        Course.find({}).populate('instructor', 'name email').lean(),
        Enrollment.find({}).populate('student', 'name email').populate('course', 'title price').lean(),
        Progress.find({}).lean(),
        TeacherRequest.countDocuments({ status: 'pending' })
    ]);

    const progressMap = new Map();
    for (const p of progresses) {
        const key = p.studentId.toString();
        if (!progressMap.has(key)) progressMap.set(key, { courses: 0, completed: 0, quizzes: 0, scoreSum: 0, scoreCount: 0 });
        const entry = progressMap.get(key);
        entry.courses += 1;
        entry.completed += (p.completedLessons?.length || 0);
        (p.quizAttempts || []).forEach(a => {
            entry.quizzes += 1;
            entry.scoreSum += a.score || 0;
            entry.scoreCount += 1;
        });
    }

    const teacherReport = teachers.map(t => {
        const own = courses.filter(c => c.instructor?._id?.toString() === t._id.toString());
        const courseIds = new Set(own.map(c => c._id.toString()));
        const mine = enrollments.filter(e => courseIds.has(e.course?._id?.toString()));
        const revenue = mine.reduce((sum, e) => sum + (e.course?.price || 0), 0);
        return {
            _id: t._id,
            name: t.name,
            email: t.email,
            isActive: t.isActive,
            joinedAt: t.createdAt,
            courseCount: own.length,
            studentCount: new Set(mine.map(e => e.student?._id?.toString())).size,
            enrollmentCount: mine.length,
            revenue,
            courses: own.map(c => ({ _id: c._id, title: c.title, category: c.category, price: c.price, enrolled: mine.filter(e => e.course?._id?.toString() === c._id.toString()).length }))
        };
    });

    const studentReport = students.map(s => {
        const mine = enrollments.filter(e => e.student?._id?.toString() === s._id.toString());
        const stat = progressMap.get(s._id.toString()) || { courses: 0, completed: 0, quizzes: 0, scoreSum: 0, scoreCount: 0 };
        return {
            _id: s._id,
            name: s.name,
            email: s.email,
            isActive: s.isActive,
            joinedAt: s.createdAt,
            enrollmentCount: mine.length,
            completedLessons: stat.completed,
            quizAttempts: stat.quizzes,
            avgScore: stat.scoreCount ? Math.round((stat.scoreSum / stat.scoreCount) * 10) / 10 : null,
            courses: mine.map(e => ({ _id: e.course?._id, title: e.course?.title, enrolledAt: e.createdAt }))
        };
    });

    const courseReport = courses.map(c => {
        const mine = enrollments.filter(e => e.course?._id?.toString() === c._id.toString());
        return {
            _id: c._id,
            title: c.title,
            category: c.category,
            level: c.level,
            price: c.price,
            teacher: { name: c.instructor?.name, email: c.instructor?.email },
            enrolledCount: mine.length,
            revenue: mine.length * (c.price || 0),
            createdAt: c.createdAt
        };
    }).sort((a, b) => b.enrolledCount - a.enrolledCount);

    const revenueTotal = enrollments.reduce((sum, e) => sum + (e.course?.price || 0), 0);

    res.json({
        success: true,
        summary: {
            totalUsers: teachers.length + students.length,
            teachers: teachers.length,
            students: students.length,
            courses: courses.length,
            enrollments: enrollments.length,
            activeEnrollments: enrollments.length,
            revenue: revenueTotal,
            pendingRequests
        },
        teacherReport: teacherReport.sort((a, b) => b.enrollmentCount - a.enrollmentCount),
        studentReport: studentReport.sort((a, b) => b.enrollmentCount - a.enrollmentCount),
        courseReport,
        recentEnrollments: enrollments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8).map(e => ({
            _id: e._id,
            student: e.student?.name,
            studentEmail: e.student?.email,
            course: e.course?.title,
            enrolledAt: e.createdAt
        }))
    });
};

export const listTeacherRequests = async (req, res) => {
    const { status } = req.query;
    const query = {};
    if (['pending', 'approved', 'rejected'].includes(status)) query.status = status;
    const requests = await TeacherRequest.find(query).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, requests });
};

export const reviewTeacherRequest = async (req, res) => {
    const { requestId } = req.params;
    const action = req.body?.action;
    const note = String(req.body?.note || '').trim();

    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ message: 'action must be approve or reject.' });
    }

    const request = await TeacherRequest.findById(requestId);
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    if (request.status !== 'pending') {
        return res.status(400).json({ message: `Request already ${request.status}.` });
    }

    if (action === 'approve') {
        // Role tabhi teacher banega jab admin approve kare.
        await User.findByIdAndUpdate(request.user, { role: 'teacher', isActive: true });
        request.status = 'approved';
    } else {
        request.status = 'rejected';
    }

    request.reviewNote = note;
    request.reviewedBy = req.user._id;
    await request.save();

    res.json({
        success: true,
        message: action === 'approve' ? 'Request approved. User is now a teacher.' : 'Request rejected.',
        request
    });
};
