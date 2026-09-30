/**
 * 🧹 TEACHER ACCOUNT CLEANUP SCRIPT
 * =================================
 * Saare purane TEACHER accounts aur unka saara content delete karta hai,
 * sirf ek (default: "sift") teacher ko chhod kar.
 *
 * DELETE ORDER (foreign keys follow karti hain):
 *   Quiz -> Progress -> Enrollment -> Lesson -> Chapter -> Module -> Course -> User
 *
 * ⚠️  ADMIN aur STUDENT accounts kabhi touch nahi hote (role filter).
 *
 * USAGE:
 *   1) Dry-run (default — kuch delete NAHI hota, sirf report):
 *        node src/scripts/cleanupTeachers.js
 *
 *   2) Asli delete (pehle confirm poochega):
 *        node src/scripts/cleanupTeachers.js --confirm
 *
 *   3) Sift ke alawa koi teacher rakhna ho to:
 *        KEEP_TEACHER_EMAIL="aman@x.com" node src/scripts/cleanupTeachers.js --confirm
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

import User from '../models/User.js';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Chapter from '../models/Chapter.js';
import Lesson from '../models/Lesson.js';
import Quiz from '../models/Quiz.js';
import Progress from '../models/Progress.js';
import Enrollment from '../models/Enrollment.js';

// ---- CONFIG ----
const KEEP_TEACHER = (process.env.KEEP_TEACHER_EMAIL || 'sift').toLowerCase().trim();
const CONFIRM = process.argv.includes('--confirm');
// 🔄 Content-only mode: teacher ACCOUNT bachayega, sirf uska course/lesson data jayega
const CONTENT_ONLY = process.argv.includes('--content-only');

const line = (t = '') => console.log(t);
const hr = () => line('─'.repeat(64));

async function run() {
    if (!process.env.MONGO_URL) {
        console.error('❌ MONGO_URL missing — backend/.env load nahi hua.');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URL);
    line('✅ MongoDB connected\n');

    // ---- 1. Saare teachers dhoondho ----
    const teachers = await User.find({ role: 'teacher' }).sort({ createdAt: 1 });
    const allUsers = await User.countDocuments();
    const studentCount = await User.countDocuments({ role: 'student' });
    const adminCount = await User.countDocuments({ role: 'admin' });

    line(`📊 Total ${allUsers} user(s): ${studentCount} student, ${adminCount} admin, ${teachers.length} teacher`);
    hr();

    if (teachers.length === 0) {
        line('ℹ️  Koi teacher account nahi mila. Kuch delete nahi karna.');
        await mongoose.disconnect();
        return;
    }

    // 🔄 CONTENT-ONLY: teacher account match nahi karna, seedha content clean karo
    let keep = [];
    if (CONTENT_ONLY) {
        line('🔄 CONTENT-ONLY MODE — teacher accounts bachenge, sirf course/lesson data delete hoga.');
        hr();
    } else {
    const keepFilter = teachers.filter(t =>
        (t.email || '').toLowerCase().includes(KEEP_TEACHER) ||
        (t.name || '').toLowerCase().includes(KEEP_TEACHER)
    );
    keep = keepFilter;

    line('👨‍🏫 TEACHER ACCOUNTS:');
    teachers.forEach(t => {
        const isKeep = keep.some(k => k._id.toString() === t._id.toString());
        line(`   ${isKeep ? '✅ KEEP' : '❌ DEL '}  ${t.name}  <${t.email}>  id=${t._id}`);
    });
    hr();

    if (keep.length === 0) {
        line(`❌ Koi teacher "${KEEP_TEACHER}" se match nahi hua — DELETE CANCELLED (safety).`);
        line('   Fix: KEEP_TEACHER_EMAIL="correct-email" node src/scripts/cleanupTeachers.js');
        line('   Ya content-only: node src/scripts/cleanupTeachers.js --content-only --confirm');
        await mongoose.disconnect();
        return;
    }
    if (keep.length > 1) {
        line(`⚠️  "${KEEP_TEACHER}" se ${keep.length} teachers match hue: ${keep.map(k => k.email).join(', ')}`);
        line('   Safety ke liye DELETE CANCELLED. Exact email do:');
        line('   KEEP_TEACHER_EMAIL="full-email@example.com" node src/scripts/cleanupTeachers.js');
        await mongoose.disconnect();
        return;
    }
    }

    const keepId = keep.length ? keep[0]._id.toString() : null;
    // Content-only me koi teacher account delete nahi hona chahiye
    const deleteTeacherIds = CONTENT_ONLY
        ? []
        : teachers.filter(t => t._id.toString() !== keepId).map(t => t._id);

    // ---- 3. In teachers ka content nikalo ----
    // Content-only me saare teachers ke saare courses clean karne hain
    const allCourseDocs = await Course.find(
        CONTENT_ONLY ? {} : { instructor: { $in: deleteTeacherIds } }
    );
    const courseIds = allCourseDocs.map(c => c._id);
    const lessonsToWipe = await Lesson.find({ courseId: { $in: courseIds } });
    const lessonIds = lessonsToWipe.map(l => l._id);
    const chaptersToWipe = await Chapter.find({ courseId: { $in: courseIds } });

    const [modCount, lessonQuizCount, courseQuizCount, progressCount, enrollCount] = await Promise.all([
        Module.countDocuments({ courseId: { $in: courseIds } }),
        Quiz.countDocuments({ lessonId: { $in: lessonIds } }),
        Quiz.countDocuments({ courseId: { $in: courseIds } }),
        Progress.countDocuments({ courseId: { $in: courseIds } }),
        Enrollment.countDocuments({ course: { $in: courseIds } }),
    ]);

    line(`🗑️  DELETE HOGA (${CONTENT_ONLY ? 'content-only' : `teachers: ${deleteTeacherIds.length}`}):`);
    line(`   Users      : ${deleteTeacherIds.length}${CONTENT_ONLY ? '  (teacher accounts bachenge)' : ''}`);
    line(`   Courses    : ${courseIds.length}`);
    line(`   Modules    : ${modCount}`);
    line(`   Chapters   : ${chaptersToWipe.length}`);
    line(`   Lessons    : ${lessonIds.length}`);
    line(`   Quizzes    : ${lessonQuizCount + courseQuizCount}`);
    line(`   Progress   : ${progressCount}`);
    line(`   Enrollments: ${enrollCount}`);
    hr();

    // ---- 4. Uploaded files (video/pdf) references list karo ----
    const fileNames = new Set();
    lessonsToWipe.forEach(l => {
        if (l.videoFile) fileNames.add(l.videoFile);
        if (l.attachment) fileNames.add(l.attachment);
        (l.materials || []).forEach(m => m.file && fileNames.add(m.file));
    });
    chaptersToWipe.forEach(c => {
        if (c.pdf) fileNames.add(c.pdf);
        (c.pdfs || []).forEach(p => p.file && fileNames.add(p.file));
    });
    line(`📁 Uploaded files referenced in DB: ${fileNames.size}`);
    hr();

    // ---- 5. Dry-run? Bas report aur exit ----
    if (!CONFIRM) {
        line('🧪 DRY-RUN complete — kuch bhi DELETE nahi hua.');
        line('   Sach me delete karna hai to ye chalao:');
        line('   node src/scripts/cleanupTeachers.js --confirm');
        line('');
        line('   (Uploaded video/PDF FILES disk se delete NAHI honge — sirf DB references jayenge.)');
        await mongoose.disconnect();
        return;
    }

    // ---- 6. Asli delete (cascade order) ----
    line('🚨 DELETE shuru...');
    const result = {};

    result.quizzes = (await Quiz.deleteMany({
        $or: [{ lessonId: { $in: lessonIds } }, { courseId: { $in: courseIds } }]
    })).deletedCount;

    result.progress = (await Progress.deleteMany({ courseId: { $in: courseIds } })).deletedCount;
    result.enrollments = (await Enrollment.deleteMany({ course: { $in: courseIds } })).deletedCount;
    result.lessons = (await Lesson.deleteMany({ courseId: { $in: courseIds } })).deletedCount;
    result.chapters = (await Chapter.deleteMany({ courseId: { $in: courseIds } })).deletedCount;
    result.modules = (await Module.deleteMany({ courseId: { $in: courseIds } })).deletedCount;
    result.courses = (await Course.deleteMany({ _id: { $in: courseIds } })).deletedCount;
    result.users = (await User.deleteMany({ _id: { $in: deleteTeacherIds } })).deletedCount;

    hr();
    line('✅ DELETE COMPLETE:');
    Object.entries(result).forEach(([k, v]) => line(`   ${k.padEnd(11)}: ${v}`));
    hr();
    if (CONTENT_ONLY) {
        line('✅ TEACHER ACCOUNTS SAFE (delete nahi hue):');
        teachers.forEach(t => line(`   ✅ ${t.name} <${t.email}>`));
    } else {
        line(`✅ SAFE REHNE WALA TEACHER: ${keep[0].name} <${keep[0].email}>`);
        line(`   Uski courses: ${await Course.countDocuments({ instructor: keepId })}`);
    }
    line('');
    line(`ℹ️  ${fileNames.size} uploaded file(s) ab orphan hain (DB se gaye, disk par hain).`);
    line('   Disk se hatane ke liye backend/uploads folder manually clean kar sakte ho.');

    await mongoose.disconnect();
}

run().catch(async (err) => {
    console.error('❌ Cleanup failed:', err.message);
    try { await mongoose.disconnect(); } catch { /* ignore */ }
    process.exit(1);
});
