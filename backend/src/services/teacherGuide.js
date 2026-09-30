import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Module from '../models/Module.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import Progress from '../models/Progress.js';

const idKey = v => String(v);

/**
 * Teacher ka apna data + uske students ka data collect karta hai.
 * 🔒 Sirf unhi courses ka data jo teacher ka khud ka hai (instructor = teacherId).
 *
 * Is project me koi attendance table nahi hai, isliye "aaj class me tha" ka matlab
 * hai: us student ka Progress record aaj (00:00 se) update hua ya quiz attempt aaj kiya.
 */
export const collectTeacherData = async teacherId => {
    const courses = await Course.find({ instructor: idKey(teacherId) })
        .populate('instructor', 'name')
        .lean();
    if (!courses.length) return { hasData: false, summary: {}, students: [] };

    const courseIds = courses.map(c => c._id);
    const courseById = new Map(courses.map(c => [idKey(c._id), c]));

    const [enrollmentsRaw, modules, chapters, lessons, quizzes, progresses] = await Promise.all([
        Enrollment.find({ course: { $in: courseIds } }).populate('student', 'name email isActive').lean(),
        Module.find({ course: { $in: courseIds } }).lean(),
        Chapter.find({ course: { $in: courseIds } }).lean(),
        Lesson.find({ course: { $in: courseIds } }).lean(),
        Quiz.find({ course: { $in: courseIds } }).lean(),
        Progress.find({ courseId: { $in: courseIds } }).lean()
    ]);

    // Orphan enrollments (deleted students) hata do
    const enrollments = enrollmentsRaw.filter(e => e.student?._id);

    const countBy = (rows, field) => {
        const map = new Map();
        rows.forEach(r => map.set(idKey(r[field]), (map.get(idKey(r[field])) || 0) + 1));
        return map;
    };
    const moduleCount = countBy(modules, 'course');
    const chapterCount = countBy(chapters, 'course');
    const lessonCount = countBy(lessons, 'course');
    const quizCount = countBy(quizzes, 'course');

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const last7 = new Date(Date.now() - (7 * 86400000));

    // ---- Har enrolled student ka record ----
    const byStudent = new Map();
    enrollments.forEach(e => {
        const key = idKey(e.student._id);
        if (!byStudent.has(key)) {
            byStudent.set(key, {
                _id: e.student._id,
                name: e.student.name,
                email: e.student.email,
                isActive: e.student.isActive !== false,
                courses: [],
                completedLessons: 0,
                quizAttempts: 0,
                scoreSum: 0,
                scoreCount: 0,
                lastActivity: null,
                activeToday: false,
                activeThisWeek: false
            });
        }
        const s = byStudent.get(key);
        s.courses.push({
            title: courseById.get(idKey(e.course))?.title || 'Unknown course',
            enrolledAt: e.createdAt
        });
    });

    progresses.forEach(p => {
        const s = byStudent.get(idKey(p.studentId));
        if (!s) return;   // enrolled hi nahi — ignore (extra safety)
        s.completedLessons += p.completedLessons?.length || 0;
        (p.quizAttempts || []).forEach(attempt => {
            s.quizAttempts += 1;
            s.scoreSum += attempt.score || 0;
            s.scoreCount += 1;
            const when = new Date(attempt.attemptedAt || p.updatedAt || 0);
            if (!Number.isNaN(when.getTime())) {
                if (when >= startOfToday) s.activeToday = true;
                if (when >= last7) s.activeThisWeek = true;
            }
        });
        if (p.updatedAt) {
            const d = new Date(p.updatedAt);
            if (!s.lastActivity || d > new Date(s.lastActivity)) s.lastActivity = p.updatedAt;
            if (d >= startOfToday) s.activeToday = true;
            if (d >= last7) s.activeThisWeek = true;
        }
    });

    const students = [...byStudent.values()].map(s => ({
        ...s,
        avgScore: s.scoreCount ? Math.round((s.scoreSum / s.scoreCount) * 100) / 100 : null
    }));

    return {
        hasData: true,
        courses,
        students,
        content: {
            modules: modules.length,
            chapters: chapters.length,
            lessons: lessons.length,
            quizzes: quizzes.length
        },
        byCourse: {
            modules: moduleCount,
            chapters: chapterCount,
            lessons: lessonCount,
            quizzes: quizCount
        },
        courseById,
        enrollments
    };
};

/** Sab numbers ek jagah nikaalta hai — AI aur fallback dono yahi use karte hain. */
export const summarizeTeacherData = data => {
    const { courses, students, content, byCourse, courseById, enrollments } = data;
    const key = v => idKey(v);

    const totalStudents = students.length;
    const activeToday = students.filter(s => s.activeToday);
    const activeThisWeek = students.filter(s => s.activeThisWeek);
    const inactive = students.filter(s => !s.activeThisWeek);
    const tookQuiz = students.filter(s => s.quizAttempts > 0);
    const neverQuiz = students.filter(s => s.quizAttempts === 0);
    const revenue = enrollments.reduce((sum, e) => sum + (courseById.get(key(e.course))?.price || 0), 0);

    const allScores = students.flatMap(s => Array(s.scoreCount).fill(s.avgScore)).filter(v => v !== null);
    const avgScore = allScores.length
        ? Math.round((allScores.reduce((a, b) => a + b, 0) / allScores.length) * 100) / 100
        : null;

    const perCourse = courses.map(c => ({
        _id: c._id,
        title: c.title,
        isPublished: c.isPublished,
        enrolled: enrollments.filter(e => key(e.course) === key(c._id)).length,
        modules: byCourse.modules.get(key(c._id)) || 0,
        chapters: byCourse.chapters.get(key(c._id)) || 0,
        lessons: byCourse.lessons.get(key(c._id)) || 0,
        quizzes: byCourse.quizzes.get(key(c._id)) || 0,
        revenue: enrollments.filter(e => key(e.course) === key(c._id)).length * (c.price || 0),
        price: c.price || 0
    })).sort((a, b) => b.enrolled - a.enrolled);

    return {
        totalCourses: courses.length,
        publishedCourses: courses.filter(c => c.isPublished).length,
        draftCourses: courses.filter(c => !c.isPublished).length,
        totalStudents,
        totalLessons: content.lessons,
        totalQuizzes: content.quizzes,
        revenue,
        avgScore,
        activeTodayCount: activeToday.length,
        activeToday: activeToday.map(s => s.name),
        presentDetail: activeToday.map(s => ({ name: s.name, completedLessons: s.completedLessons, quizAttempts: s.quizAttempts })),
        absentToday: students.filter(s => !s.activeToday).map(s => s.name),
        activeThisWeekCount: activeThisWeek.length,
        inactiveCount: inactive.length,
        inactiveList: inactive.map(s => s.name),
        tookQuizCount: tookQuiz.length,
        neverAttemptedCount: neverQuiz.length,
        neverAttemptedList: neverQuiz.map(s => s.name),
        perCourse
    };
};

/**
 * TEACHER GUIDE — student guide se alag.
 * Sirf teacher ke KHUD ke courses ke students ka data deta hai.
 * Facts code me calculate hote hain, AI sirf format karta hai.
 */
export const buildTeacherGuide = async teacherId => {
    const data = await collectTeacherData(teacherId);
    if (!data.hasData) return { hasData: false, students: [], summary: {}, text: '' };

    const summary = summarizeTeacherData(data);
    const s = summary;
    const lines = [`TEACHER'S OWN COACHING DATA from ATs Learning (real numbers — never invent anything):`];
    lines.push(`COURSES: ${s.totalCourses} total (${s.publishedCourses} published, ${s.draftCourses} draft)`);
    lines.push(`TOTAL STUDENTS ENROLLED: ${s.totalStudents}`);
    lines.push(`  Active today: ${s.activeTodayCount} (${s.activeTodayCount ? s.activeToday.join(', ') : 'nobody'})`);
    lines.push(`  Absent today: ${s.absentToday.length} (${s.absentToday.length ? s.absentToday.join(', ') : 'nobody'})`);
    lines.push(`  Active in last 7 days: ${s.activeThisWeekCount}`);
    lines.push(`  Inactive for 7+ days: ${s.inactiveCount} (${s.inactiveCount ? s.inactiveList.join(', ') : 'none'})`);
    lines.push(`QUIZZES: ${s.tookQuizCount} of ${s.totalStudents} students have attempted at least one quiz`);
    lines.push(`  Never attempted any quiz: ${s.neverAttemptedCount} (${s.neverAttemptedCount ? s.neverAttemptedList.join(', ') : 'none'})`);
    lines.push(`  Average quiz score: ${s.avgScore === null ? 'no attempts yet' : s.avgScore}`);
    lines.push(`CONTENT: ${s.totalLessons} lectures and ${s.totalQuizzes} quiz items across all courses`);
    lines.push(`REVENUE: ${s.revenue}`);
    lines.push('PER COURSE:');
    s.perCourse.forEach(c => lines.push(
        `  - "${c.title}" (${c.isPublished ? 'published' : 'draft'}): ${c.enrolled} students, ${c.modules} modules, ${c.chapters} chapters, ${c.lessons} lectures, ${c.quizzes} quizzes, revenue ${c.revenue}`
    ));

    return { hasData: true, students: data.students, summary, text: lines.join('\n') };
};

/** Kya sawaal teacher ke apne data / apne students ke baare me hai? */
const TEACHER_INTENT = /\b(my\s+students?|all\s+students?|total\s+students?|students?\s+(?:list|name|number|count)|kaun|kiske|kiski|kisne|kitne|how\s+many|who\s+(?:attended|absent|joined|present|is\s+inactive)|attendance|present\s+today|absent|class\s+mei|class\s+me|aaj\s+ki\s+class|quiz|quizzes|performance|report|analytics|revenue|earning|kamaya|my\s+courses?|inactive|enrolled|enrollment)\b/i;

export const isTeacherGuideQuestion = question => TEACHER_INTENT.test(String(question || ''));

/** Facts chhote aur simple — taaki AI "personal data" maan ke mana na kare. */
export const buildTeacherFacts = guide => {
    if (!guide?.hasData) return 'This teacher has not created any course yet.';
    const s = guide.summary;
    const parts = [
        `The teacher owns ${s.totalCourses} course(s) with ${s.totalStudents} students enrolled in total.`,
        `Today ${s.activeTodayCount} of ${s.totalStudents} students were active${s.activeTodayCount ? ` (${s.activeToday.join(', ')})` : ''}.`,
        `${s.absentToday.length} student(s) were not active today${s.absentToday.length ? ` (${s.absentToday.join(', ')})` : ''}.`,
        `${s.inactiveCount} student(s) have been inactive for 7 or more days${s.inactiveCount ? ` (${s.inactiveList.join(', ')})` : ''}.`,
        `${s.tookQuizCount} of ${s.totalStudents} students have attempted at least one quiz; ${s.neverAttemptedCount} have not attempted any.`,
        `Average quiz score: ${s.avgScore === null ? 'not available yet' : s.avgScore}.`,
        `The courses contain ${s.totalLessons} lectures and ${s.totalQuizzes} quiz items.`
    ];
    s.perCourse.forEach(c => parts.push(
        `Course "${c.title}" has ${c.enrolled} students, ${c.modules} modules, ${c.chapters} chapters, ${c.lessons} lectures and ${c.quizzes} quizzes (${c.isPublished ? 'published' : 'draft'}).`
    ));
    return parts.join(' ');
};

/** AI na chale ya mana kare — tab code se sahi jawab. */
export const buildTeacherFallback = (guide, question) => {
    const s = guide?.summary;
    const q = String(question || '').toLowerCase();
    if (!s) {
        return `You have not created any course yet.\n\nOnce you publish a course, I can tell you:\n• How many students are enrolled in total\n• Who attended class today and who did not\n• How many students have taken the quiz\n• Your course-wise content and earnings`;
    }

    const header = `**Your ATs Learning teaching snapshot**\n\n• Courses: ${s.totalCourses} (${s.publishedCourses} published, ${s.draftCourses} draft)\n• Total students: ${s.totalStudents}\n• Lectures: ${s.totalLessons} · Quizzes: ${s.totalQuizzes}\n• Revenue: ₹${s.revenue}`;

    const presentBlock = `\n\n**Today's attendance**\n• Present: ${s.activeTodayCount}/${s.totalStudents}${s.activeTodayCount ? ` — ${s.activeToday.join(', ')}` : ''}\n• Absent: ${s.absentToday.length}${s.absentToday.length ? ` — ${s.absentToday.join(', ')}` : ''}`;

    const quizBlock = `\n\n**Quizzes**\n• Attempted at least one: ${s.tookQuizCount}/${s.totalStudents}\n• Never attempted: ${s.neverAttemptedCount}\n• Average score: ${s.avgScore === null ? 'no attempts yet' : s.avgScore}`;

    const courseBlock = `\n\n**Course-wise**\n${s.perCourse.map(c => `• ${c.title} — ${c.enrolled} students, ${c.lessons} lectures, ${c.quizzes} quizzes, ₹${c.revenue}`).join('\n')}`;

    if (/revenue|earning|paise|kamai|money|paid|salary/.test(q)) {
        return `${header}\n\n**Earnings**\n• Total revenue: ₹${s.revenue}\n${s.perCourse.map(c => `• ${c.title}: ₹${c.revenue} from ${c.enrolled} students`).join('\n')}\n\nTip: publishing your draft courses can increase enrolments.`;
    }
    if (/absent|missing|nahi aaya|kam|who didn't|who did not/.test(q)) {
        return `${header}${presentBlock}\n\n**Needs attention**\n${s.inactiveCount ? `${s.inactiveCount} student(s) inactive for 7+ days: ${s.inactiveList.join(', ')}` : 'All your students have been active this week.'}`;
    }
    if (/quiz|test|exam|attempt|mark/.test(q)) {
        return `${header}${quizBlock}${courseBlock}\n\nTip: ${s.neverAttemptedCount} student(s) have not attempted any quiz yet — you can send them a reminder.`;
    }
    if (/student|enrol|enroll|total|kitne|number|list/.test(q)) {
        return `${header}${presentBlock}\n\n**Course-wise students**\n${s.perCourse.map(c => `• ${c.title}: ${c.enrolled} students`).join('\n')}`;
    }
    return `${header}${presentBlock}${quizBlock}${courseBlock}\n\nAsk me "who was absent today", "how many took the quiz", or "show my revenue" for detail.`;
};
