import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Module from '../models/Module.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import Progress from '../models/Progress.js';

const idKey = value => String(value);

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const toMinutes = time => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(String(time || '').trim());
    return match ? (Number(match[1]) * 60) + Number(match[2]) : null;
};

/**
 * Course ke schedule se "agli class" nikaalta hai.
 * Abhi ka time se aage wali sabse close slot — chahe aaj ho ya agle hafte.
 */
export const findNextClass = course => {
    const slots = (course?.schedule || []).filter(s => s && (s.day || s.date));
    if (!slots.length) return null;

    const now = new Date();
    const nowMinutes = (now.getHours() * 60) + now.getMinutes();
    const todayIndex = now.getDay();
    const todayDate = now.toISOString().slice(0, 10);

    // Score: chhota score = jaldi aane wali class
    const scored = slots.map(slot => {
        // One-off class with a date
        if (slot.date) {
            const diffDays = Math.round((new Date(`${slot.date}T00:00:00`) - new Date(`${todayDate}T00:00:00`)) / 86400000);
            return { slot, score: diffDays * 100000, dateBased: true };
        }
        const dayIndex = Math.max(0, DAYS.indexOf(slot.day));
        let dayDiff = (dayIndex - todayIndex + 7) % 7;
        const start = toMinutes(slot.startTime);
        // Aaj ka slot nikal chuka hai to agle hafte shift kar do
        if (dayDiff === 0 && start !== null && nowMinutes >= start) dayDiff = 7;
        return { slot, score: (dayDiff * 24 * 60) + (start ?? 0), dateBased: false };
    });

    scored.sort((a, b) => a.score - b.score);
    const next = scored[0];
    if (!next) return null;

    const dayDiff = Math.floor(next.score / (24 * 60));
    const when = next.slot.date
        ? new Date(`${next.slot.date}T00:00:00`)
        : new Date(now.getTime() + (dayDiff * 86400000));

    return {
        label: next.slot.label || 'Class session',
        day: next.slot.day || '',
        date: next.slot.date || '',
        time: `${next.slot.startTime} - ${next.slot.endTime}`,
        isLive: next.slot.isLive !== false,
        meetingLink: next.slot.meetingLink || '',
        isToday: !next.slot.date && dayDiff === 0,
        // Real timestamp — multiple courses me se sabse jaldi wali class sort karne ke liye
        sortKey: next.slot.date
            ? new Date(`${next.slot.date}T${next.slot.startTime || '00:00'}:00`).getTime()
            : when.getTime() + (toMinutes(next.slot.startTime) || 0) * 60000,
        prettyWhen: next.slot.date
            ? when.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
            : (dayDiff === 0 ? `today (${next.slot.day})` : `${next.slot.day} at ${next.slot.startTime}`)
    };
};

/**
 * Student ka apna learning data — courses, lectures, quizzes aur progress.
 * AI inhi facts se jawab deta hai, isliye koi bhi data invent nahi hota.
 *
 * NOTE: Course model me ab `schedule` array hai (day + time + optional date),
 * isliye "next class" = wo slot jo abhi ke time ke baad aane wala sabse nearest hai.
 * "Next lecture" alag concept hai (course order me pehla unfinished lecture).
 */
export const buildStudentGuide = async studentId => {
    const enrollments = await Enrollment.find({ student: idKey(studentId) })
        .populate('course', 'title category level instructor isPublished schedule scheduleNote')
        .lean();

    // Sirf published courses + active teacher — draft ya delete nahi dikhna chahiye
    const courses = enrollments
        .map(e => e.course)
        .filter(c => c && c.isPublished !== false && c.instructor?.isActive !== false);

    if (!courses.length) return { hasData: false, text: '', summary: {} };

    const courseIds = courses.map(c => idKey(c._id));

    const [modules, chapters, lessons, progresses] = await Promise.all([
        Module.find({ courseId: { $in: courseIds } }).select('title courseId order').lean(),
        Chapter.find({ courseId: { $in: courseIds } }).select('title courseId moduleId order').lean(),
        Lesson.find({ courseId: { $in: courseIds } })
            .select('title courseId chapterId videoUrl videoFile theoryContent order')
            .lean(),
        Progress.find({ studentId: idKey(studentId), courseId: { $in: courseIds } }).lean()
    ]);

    const lessonIds = lessons.map(l => idKey(l._id));
    const quizzes = lessonIds.length
        ? await Quiz.find({ lessonId: { $in: lessonIds } }).select('lessonId').lean()
        : [];

    const progressByCourse = new Map();
    progresses.forEach(p => progressByCourse.set(idKey(p.courseId), p));

    const chapterTitle = new Map(chapters.map(c => [idKey(c._id), c.title]));
    const moduleTitle = new Map(modules.map(m => [idKey(m._id), m.title]));
    const chapterModule = new Map(chapters.map(c => [idKey(c._id), idKey(c.moduleId)]));
    const quizCountByLesson = new Map();
    quizzes.forEach(q => {
        const key = idKey(q.lessonId);
        quizCountByLesson.set(key, (quizCountByLesson.get(key) || 0) + 1);
    });

    const lines = [];
    const upcoming = [];
    let totalLessons = 0, totalDone = 0, totalQuizzes = 0, quizzesTaken = 0;

    courses.forEach(course => {
        const progress = progressByCourse.get(idKey(course._id));
        const done = new Set((progress?.completedLessons || []).map(idKey));
        const attempts = progress?.quizAttempts || [];

        const courseLessons = lessons
            .filter(l => idKey(l.courseId) === idKey(course._id))
            .sort((a, b) => (a.order || 0) - (b.order || 0) || new Date(a.createdAt) - new Date(b.createdAt));

        const pending = courseLessons.filter(l => !done.has(idKey(l._id)));
        const courseQuizzes = courseLessons.reduce((sum, l) => sum + (quizCountByLesson.get(idKey(l._id)) || 0), 0);

        totalLessons += courseLessons.length;
        totalDone += courseLessons.length - pending.length;
        totalQuizzes += courseQuizzes;
        quizzesTaken += attempts.length;

        if (pending[0]) {
            const chapterName = pending[0].chapterId ? chapterTitle.get(idKey(pending[0].chapterId)) : null;
            const modId = pending[0].chapterId ? chapterModule.get(idKey(pending[0].chapterId)) : null;
            upcoming.push({
                courseTitle: course.title,
                lessonTitle: pending[0].title,
                module: modId ? (moduleTitle.get(modId) || '—') : '—',
                chapter: chapterName || '—',
                hasVideo: Boolean(pending[0].videoUrl || pending[0].videoFile),
                quizzesLeft: pending.reduce((sum, l) => sum + (quizCountByLesson.get(idKey(l._id)) || 0), 0)
            });
        }

        lines.push(`\nCOURSE: ${course.title} (teacher: ${course.instructor?.name || 'unknown'})`);
        lines.push(`  Progress: ${courseLessons.length - pending.length}/${courseLessons.length} lectures complete`);
        lines.push(`  Quizzes: ${courseQuizzes} questions total, ${attempts.length} attempted`);

        // Class schedule — "kab hai class" ka jawab yahin se aata hai
        if ((course.schedule || []).length) {
            lines.push('  Class schedule:');
            course.schedule.forEach(slot => {
                const when = slot.date ? `on ${slot.date}` : `every ${slot.day}`;
                lines.push(`    - ${slot.label || 'Class session'}: ${when}, ${slot.startTime} - ${slot.endTime}${slot.isLive === false ? ' (recorded)' : ''}`);
            });
            const nextClass = findNextClass(course);
            if (nextClass) {
                lines.push(`  NEXT CLASS: ${nextClass.label} — ${nextClass.date ? nextClass.date : `${nextClass.day} at ${nextClass.time}`}`);
            }
            if (course.scheduleNote) lines.push(`  Schedule note: ${course.scheduleNote}`);
        } else {
            lines.push('  Class schedule: not set by the teacher');
        }
        if (courseLessons.length) {
            lines.push('  Lectures (in order):');
            courseLessons.forEach((lesson, index) => {
                const marks = [];
                if (lesson.videoUrl || lesson.videoFile) marks.push('has video');
                const qCount = quizCountByLesson.get(idKey(lesson._id)) || 0;
                if (qCount) marks.push(`${qCount} quiz questions`);
                if (lesson.theoryContent) marks.push('has notes');
                lines.push(`    ${index + 1}. ${lesson.title} — ${done.has(idKey(lesson._id)) ? 'DONE' : 'NOT STARTED'}${marks.length ? ` [${marks.join(', ')}]` : ' [no material]'}`);
            });
        } else {
            lines.push('  (teacher has not added lectures yet)');
        }
    });

    const percentDone = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;

    // Sabse jaldi wali class (saare enrolled courses me se)
    const nextClassPick = courses
        .map(c => findNextClass(c))
        .filter(Boolean)
        .sort((a, b) => a.sortKey - b.sortKey)[0] || null;

    return {
        hasData: true,
        upcoming,
        summary: {
            courses: courses.length,
            totalLessons,
            completedLessons: totalDone,
            percentDone,
            totalQuizzes,
            quizzesTaken,
            nextLesson: upcoming[0] || null,
            nextClass: nextClassPick,
            hasSchedule: courses.some(c => (c.schedule || []).length)
        },
        text: `STUDENT'S OWN LEARNING DATA from ATs Learning (real data, do not invent anything):${lines.join('\n')}`
    };
};

// Kya sawaal apne course data ke baare me hai? (next / progress / quiz / video / class time)
const GUIDE_INTENT = /\b(next|upcoming|schedule|timetable|timing|remaining|pending|progress|completed|complete|so\s+far|how\s+much|my\s+status|where\s+am\s+i|which\s+(class|lecture|quiz|video|lesson|course)|what\s+should\s+i\s+(study|watch|do|revise)|kahan|kab|kya\s+(karna|padhna|dekhna))\b/i;

export const isStudentGuideQuestion = question => GUIDE_INTENT.test(String(question || ''));

// Built-in (no API key) mode ke liye — student ka apna data se seedha jawab
export const buildGuideFallback = (guide, question) => {
    if (!guide?.hasData) {
        return `You have not enrolled in any published course yet, so I cannot see a study plan for you.\n\nOnce you join a course, I can tell you exactly:\n• Which lecture to watch next\n• Which quiz is still pending\n• How much you have completed so far`;
    }

    const s = guide.summary;
    const q = String(question || '').toLowerCase();
    const wantsProgress = /progress|status|complete|kahan|how much/.test(q);
    const wantsQuiz = /quiz|test|exam/.test(q);
    const wantsVideo = /video|watch|lecture|class/.test(q);

    const header = `**Your ATs Learning snapshot**\n\n• Courses: ${s.courses}\n• Lectures completed: ${s.completedLessons}/${s.totalLessons} (${s.percentDone}%)\n• Quizzes: ${s.quizzesTaken} attempts on ${s.totalQuizzes} questions\n`;

    const next = s.nextLesson;
    const nextBlock = next
        ? `\n**Next up:** "${next.lessonTitle}"\n• Course: ${next.courseTitle}\n• Module: ${next.module}\n• Chapter: ${next.chapter}\n• Video available: ${next.hasVideo ? 'yes' : 'no'}\n• Quiz questions waiting: ${next.quizzesLeft}`
        : '\nYou have completed every lecture in all your courses. Great work!';

    const nc = s.nextClass;
    const classBlock = nc
        ? `\n\n**Next class:** ${nc.label}\n• When: ${nc.date ? nc.date : `${nc.day} at ${nc.time}`}\n• Type: ${nc.isLive ? 'Live session' : 'Recorded'}`
        : '';

    if (wantsQuiz) {
        return `${header}\n**Quizzes:**\n${nextBlock}${classBlock}\n\nStart with the lecture above, then take its quiz. Ask me "which quiz is next" anytime.`;
    }
    if (wantsVideo || wantsProgress) {
        return `${header}${nextBlock}${classBlock}\n\nOpen the course and start from that lecture. I can explain any part of it for you.`;
    }
    return `${header}${nextBlock}${classBlock}\n\nAsk me "which quiz is next", "what should I watch", or "summarise this lesson" for more detail.`;
};

/**
 * Facts ko chhota aur simple bana deta hai taaki AI (jo kabhi kabar
 * "personal data" maan ke mana kar deta hai) use confidently share kar sake.
 */
export const buildGuideFacts = guide => {
    if (!guide?.hasData) return 'The student is not enrolled in any published course yet.';
    const s = guide.summary;
    const next = s.nextLesson;
    const parts = [
        `The student is enrolled in ${s.courses} course(s).`,
        `They have completed ${s.completedLessons} of ${s.totalLessons} lectures (${s.percentDone}%).`,
        `They have attempted ${s.quizzesTaken} quiz attempts out of ${s.totalQuizzes} quiz questions available.`
    ];
    if (next) {
        parts.push(
            `Their next unfinished lecture is "${next.lessonTitle}" in course "${next.courseTitle}" ` +
            `(module: ${next.module}, chapter: ${next.chapter}). ` +
            `A video is available for it: ${next.hasVideo ? 'yes' : 'no'}. ` +
            `There are ${next.quizzesLeft} quiz questions waiting in that course.`
        );
    } else {
        parts.push('They have finished every lecture in all their courses.');
    }

    // Class schedule facts — "kab hai class" ka jawab
    const nc = s.nextClass;
    if (nc) {
        parts.push(
            `Their next scheduled class is "${nc.label}" on ${nc.date || nc.day} from ${nc.time}. ` +
            `It is ${nc.isLive ? 'a live session' : 'a recorded session'}.`
        );
    } else if (s.hasSchedule) {
        parts.push('The teachers have published a schedule but no upcoming class remains.');
    } else {
        parts.push('No class timetable has been set by the teachers for these courses, so no class date or time can be given.');
    }
    return parts.join(' ');
};
