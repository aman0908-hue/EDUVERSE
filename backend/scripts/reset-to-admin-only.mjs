// ⚠️ DANGER: Poora database wipe karta hai — users, courses, lessons, enrollments,
//    progress, AI settings, sab kuch. Sirf 3 test accounts bachte hain.
//
//    Admin  : adminlogin@eduverse.com / aman0908
//    Teacher: teacher@demo.test     / Demo@12345
//    Student: student@demo.test     / Demo@12345
//
//    Run: node scripts/reset-to-admin-only.mjs
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User.js';

const ADMIN_EMAIL = 'adminlogin@eduverse.com';
const ADMIN_PASSWORD = 'aman0908';
const ADMIN_NAME = 'EduVerse Admin Aman';

// Test accounts (teacher + student) — dono ka password same
const TEST_PASSWORD = 'Demo@12345';
const TEACHER_EMAIL = 'teacher@demo.test';
const STUDENT_EMAIL = 'student@demo.test';
const STUDENT_GRADE = '10';       // 🎓 student Class 10 ka hai
const TEACHER_GRADES = ['9', '10', '11'];  // 👨‍🏫 teacher in classes ko padhata hai

const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

// Inhe kabhi mat wipe karna (Mongo internal)
const PROTECTED = new Set(['system.indexes', 'system.profile', 'system.js']);

const run = async () => {
    await mongoose.connect(process.env.MONGO_URL);
    const db = mongoose.connection.db;
    console.log('DB connected\n');

    // ---------------- STEP 1: BACKUP (sab kuch, taaki kuch bhi na jaye) ----------------
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(BACKUP_DIR, `before-wipe-${stamp}.json`);

    const collections = (await db.listCollections().toArray())
        .map(c => c.name)
        .filter(n => !PROTECTED.has(n));

    const dump = {};
    for (const col of collections) {
        dump[col] = await db.collection(col).find({}).toArray();
    }
    fs.writeFileSync(backupFile, JSON.stringify(dump, null, 2));

    const counts = collections.map(c => `  ${c}=${dump[c].length}`).join('\n');
    console.log('BACKUP bana: ' + backupFile);
    console.log(counts + '\n');

    // ---------------- STEP 2: WIPE EVERYTHING ----------------
    for (const col of collections) {
        await db.collection(col).deleteMany({});
    }
    console.log(`WIPE done — ${collections.length} collections khaali\n`);

    // ---------------- STEP 3: 3 TEST ACCOUNTS ----------------
    const admin = await User.create({
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        password: await bcrypt.hash(ADMIN_PASSWORD, 12),
        role: 'admin',
        grade: 'All',
        teachesGrades: [],
        isActive: true,
        profileImage: ''
    });

    // 👨‍🏫 Teacher — role direct 'teacher' (testing ke liye approval ka wait nahi)
    const teacher = await User.create({
        name: 'Demo Teacher',
        email: TEACHER_EMAIL,
        password: await bcrypt.hash(TEST_PASSWORD, 12),
        role: 'teacher',
        grade: 'All',
        teachesGrades: TEACHER_GRADES,   // inhi classes ke courses bana sakta hai
        isActive: true,
        profileImage: ''
    });

    // 🎓 Student — Class 10, sirf apne grade ke courses dikhenge
    const student = await User.create({
        name: 'Demo Student',
        email: STUDENT_EMAIL,
        password: await bcrypt.hash(TEST_PASSWORD, 12),
        role: 'student',
        grade: STUDENT_GRADE,
        teachesGrades: [],
        isActive: true,
        profileImage: ''
    });

    // Confirm karo ki teeno passwords sach me set hue
    const checks = [
        ['admin', admin, ADMIN_PASSWORD],
        ['teacher', teacher, TEST_PASSWORD],
        ['student', student, TEST_PASSWORD]
    ];
    for (const [label, user, plain] of checks) {
        if (!await bcrypt.compare(plain, user.password)) {
            throw new Error(`${label} ka password set nahi hua — abort!`);
        }
    }
    console.log('✅ teeno accounts ka password verify ho gaya\n');

    console.log('='.repeat(60));
    console.log('CLEAN. Sirf 3 test accounts hain.');
    console.log('='.repeat(60));
    console.log('ADMIN   : ' + ADMIN_EMAIL.padEnd(26) + ADMIN_PASSWORD);
    console.log('TEACHER : ' + TEACHER_EMAIL.padEnd(26) + TEST_PASSWORD);
    console.log('STUDENT : ' + STUDENT_EMAIL.padEnd(26) + TEST_PASSWORD + '  (Class ' + STUDENT_GRADE + ')');
    console.log('='.repeat(60));
    console.log('Teacher sirf Class ' + TEACHER_GRADES.join(', ') + ' ke courses bana sakta hai.');
    console.log('Backup (sab purana data): ' + backupFile);

    // ---------------- FINAL STATE ----------------
    const users = await User.find({}).select('name email role grade').lean();
    console.log(`\nTotal users: ${users.length}`);
    users.forEach(u => console.log('   ' + String(u.role).padEnd(8) + u.email + '  (grade: ' + u.grade + ')'));

    await mongoose.disconnect();
};

run().catch(async e => {
    console.error('ERROR:', e.message);
    await mongoose.disconnect();
    process.exit(1);
});
