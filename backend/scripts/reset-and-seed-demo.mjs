// ⚠️ DANGER: Poora database wipe karta hai (accounts + courses + content).
//    Pehle JSON backup bana deta hai, phir sirf 1 teacher + 1 student demo banata hai.
//
// Run: node scripts/reset-and-seed-demo.mjs
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import Enrollment from '../src/models/Enrollment.js';
import Progress from '../src/models/Progress.js';
import Module from '../src/models/Module.js';
import Chapter from '../src/models/Chapter.js';
import Lesson from '../src/models/Lesson.js';
import TeacherRequest from '../src/models/TeacherRequest.js';

const PASSWORD = 'Demo@12345';
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const dayIn = n => DAYS[new Date(Date.now() + n * 86400000).getDay()];

// Ye sab wipe honge
const WIPE = ['users', 'courses', 'enrollments', 'progresses', 'modules', 'chapters', 'lessons', 'quizzes', 'teacherrequests'];

const run = async () => {
    await mongoose.connect(process.env.MONGO_URL);
    const db = mongoose.connection.db;
    console.log('DB connected\n');

    // ---------------- STEP 1: BACKUP ----------------
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dump = {};
    for (const col of WIPE) {
        const exists = (await db.listCollections({ name: col }).toArray()).length;
        dump[col] = exists ? await db.collection(col).find({}).toArray() : [];
    }
    const backupFile = path.join(BACKUP_DIR, `before-reset-${stamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(dump, null, 2));
    console.log('BACKUP bana: ' + backupFile);
    console.log('  users=' + dump.users.length + ' courses=' + dump.courses.length +
        ' lessons=' + dump.lessons.length + ' enrollments=' + dump.enrollments.length + '\n');

    // ---------------- STEP 2: WIPE ----------------
    for (const col of WIPE) {
        await db.collection(col).deleteMany({});
    }
    // aisettings INTENTIONALLY rakha — usme admin ka encrypted AI key hai.
    // wipe karne se admin ko dobara key daalni padegi.
    console.log('WIPE done (' + WIPE.length + ' collections)');
    console.log('aisettings PRESERVED (' + await db.collection('aisettings').countDocuments() + ' record) — AI key wahi\n');

    // ---------------- STEP 3: TEACHER + STUDENT ----------------
    const teacher = await User.create({
        name: 'Demo Teacher',
        email: 'teacher@demo.test',
        password: await bcrypt.hash(PASSWORD, 10),
        role: 'teacher', grade: 'All', isActive: true
    });
    const student = await User.create({
        name: 'Demo Student',
        email: 'student@demo.test',
        password: await bcrypt.hash(PASSWORD, 10),
        role: 'student', grade: '10', isActive: true
    });

    // ---------------- STEP 4: COURSE + TIMETABLE + CONTENT ----------------
    const course = await Course.create({
        title: 'Class 10 Science (Demo Course)',
        description: 'Demo course for testing the ATs Learning teacher and student flows.',
        category: 'Science',
        grade: '10',              // 🎓 sirf Class 10 ke students ko dikhega
        courseLanguage: '',
        price: 3000,
        instructor: teacher._id, isPublished: true,
        requirements: ['Class 10 student', 'Basic science knowledge'],
        learningOutcomes: ['Understand light and reflection', 'Solve numerical problems'],
        schedule: [
            { label: 'Physics - Light and Reflection', day: dayIn(1), startTime: '18:30', endTime: '20:00', isLive: true, meetingLink: 'https://meet.google.com/demo-physics' },
            { label: 'Chemistry - Reactions', day: dayIn(1), startTime: '20:15', endTime: '21:00', isLive: true, meetingLink: 'https://meet.google.com/demo-chemistry' },
            { label: 'Biology - Cell Structure', day: dayIn(3), startTime: '18:30', endTime: '20:00', isLive: true, meetingLink: 'https://meet.google.com/demo-biology' },
            { label: 'Doubt Session', day: dayIn(5), startTime: '11:00', endTime: '12:00', isLive: true, meetingLink: 'https://meet.google.com/demo-doubt' }
        ],
        scheduleNote: 'Doubt session har Saturday. Recorded lectures raat ko 9 baje.'
    });

    const mod = await Module.create({ title: 'Physics', courseId: course._id, order: 1 });
    const chap = await Chapter.create({ title: 'Light and Reflection', moduleId: mod._id, courseId: course._id, order: 1 });
    const lessonData = [
        { title: 'Reflection of Light - Introduction', theoryContent: 'Light travels in straight lines. When light strikes a surface it bounces back, and this is called reflection. The laws of reflection state that the angle of incidence equals the angle of reflection.' },
        { title: 'Spherical Mirrors - Concave and Convex', theoryContent: 'A concave mirror focuses light and is used by dentists. A convex mirror always forms a virtual, upright and diminished image. The focal length is half the radius of curvature.' },
        { title: 'Refraction and Laws of Refraction', theoryContent: 'Refraction is the bending of light as it passes from one medium to another. Snells law relates the angle of incidence and the angle of refraction.' }
    ];
    const createdLessons = [];
    for (let i = 0; i < lessonData.length; i++) {
        createdLessons.push(await Lesson.create({ ...lessonData[i], chapterId: chap._id, courseId: course._id, order: i + 1 }));
    }

    // ---------------- STEP 5: ENROLL + ACTIVITY ----------------
    await Enrollment.create({ student: student._id, course: course._id });
    await Progress.create({
        studentId: student._id, courseId: course._id,
        completedLessons: [createdLessons[0]._id],
        quizAttempts: [{ score: 8, totalMarks: 10, attemptedAt: new Date() }]
    });

    // ---------------- STEP 6: ADMIN ----------------
    // Purana admin (adminlogin@eduverse.com) backup se wapas — original ID aur
    // password hash ke saath, taaki purana password hi chale.
    // Agar backup na mile to naya admin ban jata hai.
    const ADMIN_EMAIL = 'adminlogin@eduverse.com';
    // Purane admin ka asli password (hash backup me hai — ye plaintext sirf verify karne ke liye)
    const ADMIN_PASSWORD = 'aman0908';
    let admin = await User.findOne({ email: ADMIN_EMAIL });
    if (admin) {
        console.log('purana admin already DB me hai, as it is rakh diya');
        // 🔍 Existing admin ka password bhi verify karo
        const ok = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
        console.log(ok
            ? `✅ verify ho gaya — password "${ADMIN_PASSWORD}" sahi hai`
            : `⚠️  Password "${ADMIN_PASSWORD}" MATCH NAHI hua.`);
    } else {
        let savedAdmin = null;
        if (fs.existsSync(BACKUP_DIR)) {
            // NEWEST se OLDEST check karo — naya backup me admin na ho to purana mile.
            const files = fs.readdirSync(BACKUP_DIR)
                .filter(f => f.endsWith('.json'))
                .sort()
                .reverse();
            for (const f of files) {
                let dump;
                try {
                    dump = JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, f), 'utf-8'));
                } catch {
                    continue; // corrupt backup — skip
                }
                const hit = (dump.users || []).find(u => u.email === ADMIN_EMAIL);
                if (hit) {
                    savedAdmin = hit;
                    console.log('admin backup me mila: ' + f);
                    break;
                }
            }
        }
        if (savedAdmin) {
            admin = await User.create({
                _id: savedAdmin._id,
                name: savedAdmin.name || 'Admin',
                email: ADMIN_EMAIL,
                password: savedAdmin.password,   // 👈 original password hash
                role: 'admin', grade: 'All', isActive: true,
                profileImage: savedAdmin.profileImage || ''
            });
            console.log('admin backup se restore ho gaya (purana password)');
            // 🔍 Confirm karo ki original password sach me match karta hai
            const ok = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
            console.log(ok
                ? `✅ verify ho gaya — password "${ADMIN_PASSWORD}" sahi hai`
                : `⚠️  Password "${ADMIN_PASSWORD}" MATCH NAHI hua. Iska matlab ya to password galat hai, ya hash nahi mila.`);
        } else {
            admin = await User.create({
                name: 'ATs Learning Admin',
                email: ADMIN_EMAIL,
                password: await bcrypt.hash(PASSWORD, 10),
                role: 'admin', grade: 'All', isActive: true
            });
            console.log('backup nahi mila — naya admin bana, password: ' + PASSWORD);
        }
    }

    // ---------------- RESULT ----------------
    const id = course._id.toString();
    console.log('='.repeat(64));
    console.log('DEMO READY — sab kuch hata diya gaya, sirf admin + naya test data');
    console.log('='.repeat(64));
    console.log('ADMIN   : adminlogin@eduverse.com   (password: ' + ADMIN_PASSWORD + ')');
    console.log('TEACHER : teacher@demo.test  /  ' + PASSWORD);
    console.log('STUDENT : student@demo.test  /  ' + PASSWORD + '   (Class 10)');
    console.log('='.repeat(64));
    console.log('Course ID: ' + id);
    console.log('  course page  : http://localhost:5173/courses/' + id);
    console.log('  player page  : http://localhost:5173/learn/' + id);
    console.log('  teacher page : http://localhost:5173/edit-course/' + id);
    console.log('  AI assistant : http://localhost:5173/ai-assistant');
    console.log('='.repeat(64));
    console.log('Backup: ' + backupFile);

    await mongoose.disconnect();
};

run().catch(async e => {
    console.error('ERROR:', e.message);
    await mongoose.disconnect();
    process.exit(1);
});
