import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import TeacherRequest from '../models/TeacherRequest.js';
import Progress from '../models/Progress.js';
import Module from '../models/Module.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';

// ==========================================
// FULL-DETAIL ADMIN REPORTS CONTROLLER
// Admin ko poora data chahiye — teachers kya kar rahe hain, students ka kya update hai,
// kitne log aaye, kaunsa naam, kis course me enrolled — sab kuch ek jagah.
// ==========================================

// Search term ko regex-safe banana (special characters se crash na ho)
export const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const searchFields = (search, fields) => (search
    ? { $or: fields.map(field => ({ [field]: { $regex: escapeRegex(search), $options: 'i' } })) }
    : {});

export const percent = (done, total) => (total ? Math.round((done / total) * 100) : 0);

const idKey = value => String(value);

// Documents array se { courseId: count } jaisa map banana
const countBy = (docs, key) => {
    const map = new Map();
    docs.forEach(doc => {
        const bucket = idKey(doc[key]);
        map.set(bucket, (map.get(bucket) || 0) + 1);
    });
    return map;
};

export const EMPTY_PROGRESS = { courses: 0, completed: 0, quizzes: 0, scoreSum: 0, scoreCount: 0, lastActivity: null };
export const avgScoreOf = stat => (stat.scoreCount ? Math.round((stat.scoreSum / stat.scoreCount) * 10) / 10 : null);
export const latestDate = dates => dates.filter(Boolean).reduce((latest, d) => (!latest || new Date(d) > new Date(latest) ? d : latest), null);

// ---------------------------------------------------------------------------
// CLEAN DATA RULES
// Admin reports me sirf "clean" record dikhte hain:
//  1. Draft courses (isPublished: false) hidden
//  2. Orphan records hidden — jinka student ya course record hi nahi raha (deleted)
// ---------------------------------------------------------------------------
export const isValidEnrollment = enrollment => Boolean(
    enrollment?.student?._id
    && enrollment?.course?._id
    && enrollment.course.isPublished !== false
);

export const cleanEnrollments = list => (list || []).filter(isValidEnrollment);
export const publishedOnly = list => (list || []).filter(course => course.isPublished !== false);


// Kisi bhi course set ka content (modules/chapters/lessons/quizzes) ek saath nikalna
export const fetchContentStats = async (courseIds) => {
    const ids = (courseIds || []).filter(Boolean);
    const empty = { modules: new Map(), chapters: new Map(), lessons: [], lessonsByCourse: new Map(), quizzesByLesson: new Map() };
    if (!ids.length) return empty;

    const [modules, chapters, lessons] = await Promise.all([
        Module.find({ courseId: { $in: ids } }).select('courseId').lean(),
        Chapter.find({ courseId: { $in: ids } }).select('courseId').lean(),
        Lesson.find({ courseId: { $in: ids } }).select('_id courseId title createdAt').lean()
    ]);

    const quizzes = lessons.length
        ? await Quiz.find({ lessonId: { $in: lessons.map(l => l._id) } }).select('lessonId').lean()
        : [];

    return {
        modules: countBy(modules, 'courseId'),
        chapters: countBy(chapters, 'courseId'),
        lessons,
        lessonsByCourse: countBy(lessons, 'courseId'),
        quizzesByLesson: countBy(quizzes, 'lessonId')
    };
};

// Progress docs se per-student summary (completed lessons, quiz attempts, last activity)
export const buildProgressMap = progresses => {
    const map = new Map();
    (progresses || []).forEach(progress => {
        const key = idKey(progress.studentId);
        if (!map.has(key)) {
            map.set(key, { ...EMPTY_PROGRESS, lastActivity: progress.updatedAt || null });
        }
        const entry = map.get(key);
        entry.courses += 1;
        entry.completed += progress.completedLessons?.length || 0;
        (progress.quizAttempts || []).forEach(attempt => {
            entry.quizzes += 1;
            entry.scoreSum += attempt.score || 0;
            entry.scoreCount += 1;
        });
        if (progress.updatedAt && (!entry.lastActivity || new Date(progress.updatedAt) > new Date(entry.lastActivity))) {
            entry.lastActivity = progress.updatedAt;
        }
    });
    return map;
};

// 1. Platform overview — counts, revenue, top courses, category split
export const getPlatformOverview = async (req, res) => {
    const [
        totalUsers, activeUsers, inactiveUsers,
        teachers, activeTeachers, students, activeStudents, admins,
        totalCourses, publishedCourses,
        moduleCount, chapterCount, lessonCount, quizCount,
        courseDocs, pendingRequests, approvedRequests, rejectedRequests
    ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ isActive: false }),
        User.countDocuments({ role: 'teacher' }),
        User.countDocuments({ role: 'teacher', isActive: true }),
        User.countDocuments({ role: 'student' }),
        User.countDocuments({ role: 'student', isActive: true }),
        User.countDocuments({ role: 'admin' }),
        Course.countDocuments({ isPublished: true }),
        Course.countDocuments({ isPublished: true }),
        Module.countDocuments({}),
        Chapter.countDocuments({}),
        Lesson.countDocuments({}),
        Quiz.countDocuments({}),
        Course.find({ isPublished: true }).select('_id title category price isPublished').lean(),
        TeacherRequest.countDocuments({ status: 'pending' }),
        TeacherRequest.countDocuments({ status: 'approved' }),
        TeacherRequest.countDocuments({ status: 'rejected' })
    ]);

    // Draft courses + orphan enrollments (deleted student/course) se clean data
    const allEnrollments = await Enrollment.find({})
        .populate('student', 'name email')
        .populate('course', 'title price category isPublished')
        .sort({ createdAt: -1 })
        .lean();
    const enrollments = cleanEnrollments(allEnrollments);
    const draftCount = await Course.countDocuments({ isPublished: false });
    // Hidden = draft courses + unke enrollments + orphan (deleted) enrollments
    const orphanCount = allEnrollments.filter(e => !e.student?._id || !e.course?._id).length;
    const hiddenRecords = allEnrollments.length - enrollments.length - orphanCount;

    const revenue = enrollments.reduce((sum, e) => sum + (e.course?.price || 0), 0);

    // Category-wise course + enrollment split
    const categoryMap = new Map();
    const categoryEntry = key => {
        if (!categoryMap.has(key)) categoryMap.set(key, { category: key, courses: 0, published: 0, enrollments: 0, revenue: 0 });
        return categoryMap.get(key);
    };
    courseDocs.forEach(course => {
        const entry = categoryEntry(course.category || 'Uncategorised');
        entry.courses += 1;
        if (course.isPublished) entry.published += 1;
    });
    enrollments.forEach(enrollment => {
        const entry = categoryEntry(enrollment.course?.category || 'Uncategorised');
        entry.enrollments += 1;
        entry.revenue += enrollment.course?.price || 0;
    });

    // Top courses by enrollment
    const enrollmentByCourse = new Map();
    enrollments.forEach(enrollment => {
        const key = idKey(enrollment.course?._id);
        if (!enrollmentByCourse.has(key)) enrollmentByCourse.set(key, { enrollments: 0, students: new Set() });
        const entry = enrollmentByCourse.get(key);
        entry.enrollments += 1;
        if (enrollment.student?._id) entry.students.add(idKey(enrollment.student._id));
    });

    const topCourses = courseDocs
        .map(course => {
            const stat = enrollmentByCourse.get(idKey(course._id)) || { enrollments: 0, students: new Set() };
            return {
                _id: course._id,
                title: course.title,
                category: course.category,
                price: course.price,
                isPublished: course.isPublished,
                enrolled: stat.enrollments,
                uniqueStudents: stat.students.size,
                revenue: stat.enrollments * (course.price || 0)
            };
        })
        .sort((a, b) => b.enrolled - a.enrolled)
        .slice(0, 8);

    res.json({
        success: true,
        stats: {
            users: { total: totalUsers, active: activeUsers, inactive: inactiveUsers },
            teachers: { total: teachers, active: activeTeachers },
            students: { total: students, active: activeStudents },
            admins,
            courses: { total: totalCourses, published: publishedCourses, draft: draftCount },
            content: { modules: moduleCount, chapters: chapterCount, lessons: lessonCount, quizzes: quizCount },
            enrollments: enrollments.length,
            revenue,
            requests: { pending: pendingRequests, approved: approvedRequests, rejected: rejectedRequests },
            hidden: { draftCourses: draftCount, draftEnrollments: hiddenRecords, orphanEnrollments: orphanCount }
        },
        categories: [...categoryMap.values()].sort((a, b) => b.enrollments - a.enrollments),
        topCourses,
        recentEnrollments: enrollments.slice(0, 10).map(enrollment => ({
            _id: enrollment._id,
            student: enrollment.student?.name,
            studentEmail: enrollment.student?.email,
            course: enrollment.course?.title,
            enrolledAt: enrollment.createdAt
        }))
    });
};

// 2. Teacher report — har teacher ka poora record (courses, content, students, revenue, activity)
export const listTeacherReports = async (req, res) => {
    const search = String(req.query.search || '').trim();
    const teachers = await User.find({ role: 'teacher', ...searchFields(search, ['name', 'email']) })
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();

    const courses = teachers.length
        ? publishedOnly(await Course.find({ instructor: { $in: teachers.map(t => t._id) } }).lean())
        : [];
    const courseIds = courses.map(c => c._id);

    const [enrollmentsRaw, content, progresses] = await Promise.all([
        Enrollment.find({ course: { $in: courseIds } }).populate('student', 'name email').lean(),
        fetchContentStats(courseIds),
        Progress.find({}).lean()
    ]);
    // Orphan enrollments (deleted student) filter out
    const enrollments = enrollmentsRaw.filter(e => e.student?._id);
    const progressMap = buildProgressMap(progresses);

    const reports = teachers.map(teacher => {
        const own = courses.filter(c => idKey(c.instructor) === idKey(teacher._id));
        const ownIds = new Set(own.map(c => idKey(c._id)));
        const ownEnrollments = enrollments.filter(e => ownIds.has(idKey(e.course)));
        const ownLessons = content.lessons.filter(l => ownIds.has(idKey(l.courseId)));
        const priceOf = courseId => own.find(c => idKey(c._id) === idKey(courseId))?.price || 0;

        // Har enrolled student ka learning activity — teacher dekh sake kaun kitna padh raha hai
        const students = ownEnrollments.map(enrollment => {
            const stat = progressMap.get(idKey(enrollment.student?._id)) || EMPTY_PROGRESS;
            return {
                _id: enrollment.student?._id,
                name: enrollment.student?.name,
                email: enrollment.student?.email,
                course: own.find(c => idKey(c._id) === idKey(enrollment.course))?.title,
                completedLessons: stat.completed,
                quizAttempts: stat.quizzes,
                enrolledAt: enrollment.createdAt,
                lastActivity: stat.lastActivity
            };
        });

        return {
            _id: teacher._id,
            name: teacher.name,
            email: teacher.email,
            profileImage: teacher.profileImage,
            isActive: teacher.isActive,
            joinedAt: teacher.createdAt,
            lastActivity: latestDate([...own.map(c => c.updatedAt), ...ownLessons.map(l => l.createdAt)]),
            courseCount: own.length,
            publishedCount: own.filter(c => c.isPublished).length,
            lessonCount: ownLessons.length,
            quizCount: ownLessons.reduce((sum, l) => sum + (content.quizzesByLesson.get(idKey(l._id)) || 0), 0),
            studentCount: new Set(ownEnrollments.map(e => idKey(e.student?._id))).size,
            enrollmentCount: ownEnrollments.length,
            revenue: ownEnrollments.reduce((sum, e) => sum + priceOf(e.course), 0),
            courses: own.map(course => {
                const courseEnrollments = ownEnrollments.filter(e => idKey(e.course) === idKey(course._id));
                const courseLessons = ownLessons.filter(l => idKey(l.courseId) === idKey(course._id));
                return {
                    _id: course._id,
                    title: course.title,
                    category: course.category,
                    level: course.level,
                    price: course.price,
                    isPublished: course.isPublished,
                    createdAt: course.createdAt,
                    modules: content.modules.get(idKey(course._id)) || 0,
                    chapters: content.chapters.get(idKey(course._id)) || 0,
                    lessons: courseLessons.length,
                    quizzes: courseLessons.reduce((sum, l) => sum + (content.quizzesByLesson.get(idKey(l._id)) || 0), 0),
                    enrolled: courseEnrollments.length,
                    revenue: courseEnrollments.length * (course.price || 0),
                    students: courseEnrollments.map(e => ({ _id: e.student?._id, name: e.student?.name, email: e.student?.email, enrolledAt: e.createdAt }))
                };
            }),
            students
        };
    });

    res.json({ success: true, teachers: reports });
};

// 3. Student report — har student ka enrollment + progress + quiz detail
export const listStudentReports = async (req, res) => {
    const search = String(req.query.search || '').trim();
    const students = await User.find({ role: 'student', ...searchFields(search, ['name', 'email']) })
        .select('-password')
        .sort({ createdAt: -1 })
        .lean();
    const studentIds = students.map(s => s._id);

    const [enrollmentsRaw, coursesRaw, progresses] = await Promise.all([
        Enrollment.find({ student: { $in: studentIds } })
            .populate('course', 'title price category instructor isPublished')
            .sort({ createdAt: -1 })
            .lean(),
        Course.find({ isPublished: true }).select('_id title').lean(),
        Progress.find({ studentId: { $in: studentIds } }).populate('quizAttempts.lessonId', 'title').lean()
    ]);

    // Draft / deleted course ke enrollments hata do
    const enrollments = cleanEnrollments(enrollmentsRaw);
    const publishedCourseIds = new Set(coursesRaw.map(c => idKey(c._id)));
    const courses = coursesRaw;

    const courseTitle = new Map(courses.map(c => [idKey(c._id), c.title]));
    const content = await fetchContentStats(courses.map(c => c._id));

    const reports = students.map(student => {
        const mine = enrollments.filter(e => idKey(e.student) === idKey(student._id));
        // Draft/deleted course ka progress bhi hide karo
        const myProgress = progresses.filter(p => idKey(p.studentId) === idKey(student._id) && publishedCourseIds.has(idKey(p.courseId)));

        // Course-wise progress: kitne lecture complete, kitne quiz attempt
        const courseProgress = myProgress.map(progress => {
            const key = idKey(progress.courseId);
            const totalLessons = content.lessonsByCourse.get(key) || 0;
            const completed = progress.completedLessons?.length || 0;
            return {
                courseId: progress.courseId,
                courseTitle: courseTitle.get(key) || 'Unknown course',
                completedLessons: completed,
                totalLessons,
                percent: percent(completed, totalLessons),
                lastActivity: progress.updatedAt,
                quizAttempts: (progress.quizAttempts || []).map(attempt => ({
                    lessonId: attempt.lessonId?._id || attempt.lessonId,
                    lessonTitle: attempt.lessonId?.title || 'Unknown lecture',
                    score: attempt.score,
                    totalMarks: attempt.totalMarks,
                    percent: percent(attempt.score, attempt.totalMarks)
                }))
            };
        });

        const enrolledIds = new Set(mine.map(e => idKey(e.course?._id)));
        const stat = buildProgressMap(myProgress).get(idKey(student._id)) || EMPTY_PROGRESS;
        const totalEnrolledLessons = courseProgress.reduce((sum, c) => sum + c.totalLessons, 0);

        return {
            _id: student._id,
            name: student.name,
            email: student.email,
            profileImage: student.profileImage,
            isActive: student.isActive,
            joinedAt: student.createdAt,
            lastActivity: stat.lastActivity,
            enrollmentCount: mine.length,
            completedLessons: stat.completed,
            totalEnrolledLessons,
            overallPercent: percent(stat.completed, totalEnrolledLessons),
            quizAttempts: stat.quizzes,
            avgScore: avgScoreOf(stat),
            completedCourses: courseProgress.filter(c => c.percent === 100).length,
            inProgressCourses: courseProgress.filter(c => c.percent > 0 && c.percent < 100).length,
            courses: mine.map(enrollment => {
                const detail = courseProgress.find(c => idKey(c.courseId) === idKey(enrollment.course?._id));
                return {
                    _id: enrollment.course?._id,
                    title: enrollment.course?.title || 'Deleted course',
                    category: enrollment.course?.category,
                    price: enrollment.course?.price,
                    teacher: enrollment.course?.instructor?.name,
                    enrolledAt: enrollment.createdAt,
                    completedLessons: detail?.completedLessons || 0,
                    totalLessons: detail?.totalLessons || 0,
                    percent: detail?.percent || 0,
                    quizAttempts: detail?.quizAttempts || [],
                    lastActivity: detail?.lastActivity || null
                };
            }),
            availableCourses: courses.length - enrolledIds.size
        };
    });

    res.json({ success: true, students: reports });
};

// 4. Course report — har course ka content + enrolled students ki list
export const listCourseReports = async (req, res) => {
    const search = String(req.query.search || '').trim();
    // Sirf published courses dikhate hain — draft hidden
    const courses = await Course.find({ isPublished: true, ...searchFields(search, ['title', 'category', 'level']) })
        .populate('instructor', 'name email isActive')
        .sort({ createdAt: -1 })
        .lean();
    const courseIds = courses.map(c => c._id);

    const [enrollmentsRaw, content] = await Promise.all([
        Enrollment.find({ course: { $in: courseIds } }).populate('student', 'name email isActive').sort({ createdAt: -1 }).lean(),
        fetchContentStats(courseIds)
    ]);
    // Orphan enrollments (deleted student) filter out
    const enrollments = enrollmentsRaw.filter(e => e.student?._id);

    const reports = courses.map(course => {
        const mine = enrollments.filter(e => idKey(e.course) === idKey(course._id));
        const lessons = content.lessons.filter(l => idKey(l.courseId) === idKey(course._id));
        const newLesson = lessons.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0] || null;
        return {
            _id: course._id,
            title: course.title,
            category: course.category,
            level: course.level,
            language: course.language,
            price: course.price,
            isPublished: course.isPublished,
            createdAt: course.createdAt,
            updatedAt: course.updatedAt,
            teacher: course.instructor
                ? { _id: course.instructor._id, name: course.instructor.name, email: course.instructor.email, isActive: course.instructor.isActive }
                : null,
            modules: content.modules.get(idKey(course._id)) || 0,
            chapters: content.chapters.get(idKey(course._id)) || 0,
            lessons: lessons.length,
            quizzes: lessons.reduce((sum, l) => sum + (content.quizzesByLesson.get(idKey(l._id)) || 0), 0),
            enrolled: mine.length,
            revenue: mine.length * (course.price || 0),
            students: mine.map(e => ({
                _id: e.student?._id,
                name: e.student?.name,
                email: e.student?.email,
                isActive: e.student?.isActive,
                enrolledAt: e.createdAt
            })),
            lastLesson: newLesson ? { _id: newLesson._id, title: newLesson.title, createdAt: newLesson.createdAt } : null
        };
    });

    res.json({ success: true, courses: reports });
};

// 5. Enrollment list — kaun, kis course me, kab join kiya (search + filter)
export const listEnrollments = async (req, res) => {
    const { courseId, studentId } = req.query;
    const search = String(req.query.search || '');
    const filter = {};
    if (courseId) filter.course = courseId;
    if (studentId) filter.student = studentId;
    // NOTE: Enrollment me student/course sirf ObjectId store hote hain, isliye
    // populated fields (student.name) pe regex Mongo level pe nahi chalta —
    // search populate ke BAAD, memory me lagana padta hai.
    const allEnrollments = await Enrollment.find(filter)
        .populate('student', 'name email isActive')
        .populate('course', 'title price category instructor isPublished')
        .sort({ createdAt: -1 })
        .limit(500)
        .lean();

    const needle = search.trim().toLowerCase();
    // Draft courses + orphan records (deleted student/course) hata do
    const cleaned = cleanEnrollments(allEnrollments);
    const enrollments = needle
        ? cleaned.filter(enrollment =>
            enrollment.student?.name?.toLowerCase().includes(needle)
            || enrollment.student?.email?.toLowerCase().includes(needle)
            || enrollment.course?.title?.toLowerCase().includes(needle))
        : cleaned;

    res.json({
        success: true,
        enrollments: enrollments.map(enrollment => ({
            _id: enrollment._id,
            student: enrollment.student
                ? { _id: enrollment.student._id, name: enrollment.student.name, email: enrollment.student.email, isActive: enrollment.student.isActive }
                : null,
            course: enrollment.course
                ? {
                    _id: enrollment.course._id,
                    title: enrollment.course.title,
                    price: enrollment.course.price,
                    category: enrollment.course.category,
                    teacher: enrollment.course.instructor?.name || null
                }
                : null,
            enrolledAt: enrollment.createdAt
        }))
    });
};

// 6. Activity feed — latest events (signup, enrollment, course, lecture) — English + clean data
export const getActivityFeed = async (req, res) => {
    const [users, enrollmentsRaw, courses, lessonsRaw] = await Promise.all([
        User.find({}).select('name role createdAt').sort({ createdAt: -1 }).limit(8).lean(),
        Enrollment.find({}).populate('student', 'name').populate('course', 'title isPublished').sort({ createdAt: -1 }).limit(8).lean(),
        Course.find({ isPublished: true }).populate('instructor', 'name').sort({ createdAt: -1 }).limit(8).lean(),
        Lesson.find({}).populate('courseId', 'title isPublished').sort({ createdAt: -1 }).limit(8).lean()
    ]);

    const enrollments = cleanEnrollments(enrollmentsRaw);
    // Lectures of draft/deleted courses hide
    const lessons = lessonsRaw.filter(l => l.courseId?.isPublished !== false);

    const feed = [
        ...users.map(u => ({ id: `u-${u._id}`, type: 'user', text: `${u.name} created an account`, meta: u.role, at: u.createdAt })),
        ...enrollments.map(e => ({ id: `e-${e._id}`, type: 'enrollment', text: `${e.student?.name || 'Student'} enrolled in "${e.course?.title || 'course'}"`, meta: 'enrollment', at: e.createdAt })),
        ...courses.map(c => ({ id: `c-${c._id}`, type: 'course', text: `${c.instructor?.name || 'Teacher'} created course "${c.title}"`, meta: c.category, at: c.createdAt })),
        ...lessons.map(l => ({ id: `l-${l._id}`, type: 'lesson', text: `New lecture added: "${l.title}"`, meta: l.courseId?.title, at: l.createdAt }))
    ]
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, 20);

    res.json({ success: true, activity: feed });
};

// 7. Single user ka poora record — detail view ke liye
export const getUserReport = async (req, res) => {
    const user = await User.findById(req.params.userId).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found.' });

    if (user.role === 'teacher') {
        const courses = await Course.find({ instructor: user._id, isPublished: true })
            .select('title category price isPublished createdAt')
            .sort({ createdAt: -1 })
            .lean();
        const enrollmentsRaw = await Enrollment.find({ course: { $in: courses.map(c => c._id) } })
            .populate('student', 'name email isActive')
            .populate('course', 'title price category isPublished')
            .sort({ createdAt: -1 })
            .lean();
        return res.json({ success: true, user, kind: 'teacher', courses, enrollments: cleanEnrollments(enrollmentsRaw) });
    }

    const [enrollmentsRaw, progresses] = await Promise.all([
        Enrollment.find({ student: user._id }).populate('course', 'title price category isPublished').sort({ createdAt: -1 }).lean(),
        Progress.find({ studentId: user._id }).lean()
    ]);

    res.json({ success: true, user, kind: 'student', enrollments: cleanEnrollments(enrollmentsRaw), progresses });
};

// ---------------------------------------------------------------------------
// 8. CLEANUP — draft courses aur orphan (deleted) records list + delete
// ---------------------------------------------------------------------------

// Orphan = jiska student ya course record database me exist nahi karta
const findOrphanRecords = async () => {
    const enrollments = await Enrollment.find({})
        .populate('student', 'name email')
        .populate('course', 'title isPublished')
        .lean();
    const orphanEnrollments = enrollments.filter(e => !e.student?._id || !e.course?._id);

    const courses = await Course.find({})
        .select('_id title category isPublished instructor createdAt')
        .populate('instructor', 'name email')
        .lean();
    const draftCourses = courses.filter(course => course.isPublished !== true);
    const courseIds = new Set(courses.map(c => idKey(c._id)));

    // Content records jinka course hi nahi raha
    const [progresses, lessons, modules, chapters, quizzes] = await Promise.all([
        Progress.find({}).select('_id studentId courseId').lean(),
        Lesson.find({}).select('_id title courseId').lean(),
        Module.find({}).select('_id title courseId').lean(),
        Chapter.find({}).select('_id title courseId').lean(),
        Quiz.find({}).select('_id lessonId').lean()
    ]);
    const lessonIds = new Set(lessons.map(l => idKey(l._id)));

    return {
        orphanEnrollments,
        draftCourses,
        orphanProgress: progresses.filter(p => !courseIds.has(idKey(p.courseId))),
        orphanLessons: lessons.filter(l => !courseIds.has(idKey(l.courseId))),
        orphanModules: modules.filter(m => !courseIds.has(idKey(m.courseId))),
        orphanChapters: chapters.filter(c => !courseIds.has(idKey(c.courseId))),
        orphanQuizzes: quizzes.filter(q => !lessonIds.has(idKey(q.lessonId)))
    };
};

// GET /admin/reports/cleanup — kitna hidden (draft/deleted) data hai
export const getCleanupReport = async (req, res) => {
    const data = await findOrphanRecords();
    const orphanContent = data.orphanProgress.length + data.orphanLessons.length
        + data.orphanModules.length + data.orphanChapters.length + data.orphanQuizzes.length;

    res.json({
        success: true,
        draftCourses: data.draftCourses.map(course => ({
            _id: course._id,
            title: course.title,
            category: course.category,
            teacher: course.instructor?.name || 'Deleted teacher',
            createdAt: course.createdAt
        })),
        orphanEnrollments: data.orphanEnrollments.map(enrollment => ({
            _id: enrollment._id,
            reason: !enrollment.student?._id ? 'Student deleted' : 'Course deleted',
            enrolledAt: enrollment.createdAt
        })),
        orphanContent: {
            progress: data.orphanProgress.length,
            lessons: data.orphanLessons.length,
            modules: data.orphanModules.length,
            chapters: data.orphanChapters.length,
            quizzes: data.orphanQuizzes.length
        },
        totals: {
            draftCourses: data.draftCourses.length,
            orphanEnrollments: data.orphanEnrollments.length,
            orphanContent
        }
    });
};

// DELETE /admin/reports/cleanup/draft/:courseId — ek draft course permanently delete
export const deleteDraftCourse = async (req, res) => {
    const course = await Course.findById(req.params.courseId);
    if (!course) return res.status(404).json({ message: 'Course not found.' });
    if (course.isPublished !== false) {
        return res.status(400).json({ message: 'Only draft courses can be deleted here. Published courses are protected.' });
    }

    // Same cascade jo teacher course delete me use hota hai
    await Promise.all([
        Lesson.deleteMany({ courseId: course._id }),
        Chapter.deleteMany({ courseId: course._id }),
        Module.deleteMany({ courseId: course._id }),
        Enrollment.deleteMany({ course: course._id }),
        Progress.deleteMany({ courseId: course._id })
    ]);
    await Course.findByIdAndDelete(course._id);

    res.json({ success: true, message: `Draft course "${course.title}" deleted permanently.` });
};

// POST /admin/reports/cleanup/purge — saara orphan (deleted) data permanently hatao
export const purgeOrphanData = async (req, res) => {
    const data = await findOrphanRecords();

    const results = await Promise.all([
        Enrollment.deleteMany({ _id: { $in: data.orphanEnrollments.map(e => e._id) } }),
        Progress.deleteMany({ _id: { $in: data.orphanProgress.map(p => p._id) } }),
        Lesson.deleteMany({ _id: { $in: data.orphanLessons.map(l => l._id) } }),
        Module.deleteMany({ _id: { $in: data.orphanModules.map(m => m._id) } }),
        Chapter.deleteMany({ _id: { $in: data.orphanChapters.map(c => c._id) } }),
        Quiz.deleteMany({ _id: { $in: data.orphanQuizzes.map(q => q._id) } })
    ]);

    res.json({
        success: true,
        message: 'Orphan (deleted) data removed successfully.',
        removed: {
            enrollments: results[0].deletedCount || 0,
            progress: results[1].deletedCount || 0,
            lessons: results[2].deletedCount || 0,
            modules: results[3].deletedCount || 0,
            chapters: results[4].deletedCount || 0,
            quizzes: results[5].deletedCount || 0
        }
    });
};


