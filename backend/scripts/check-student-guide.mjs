// Full test of the student guide with a real enrolled student.
// Creates a temp student, temporarily publishes a course, tests, then rolls everything back.
// Run: node scripts/check-student-guide.mjs
import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';
import Enrollment from '../src/models/Enrollment.js';

const PORT = process.env.PORT || 4000;
const BASE = `http://localhost:${PORT}/api/v1`;

const request = (method, path, { body, token } = {}) => new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(`${BASE}${path}`, {
        method,
        headers: {
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...(token ? { Cookie: `token=${token}` } : {})
        }
    }, res => {
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
            try { resolve({ status: res.statusCode, json: JSON.parse(data) }); }
            catch { resolve({ status: res.statusCode, json: { raw: data } }); }
        });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
});

const TEMP_EMAIL = 'guide-test@student.test';
const questions = [
    'What is my next lecture?',
    'Which quiz should I take next?',
    'How much have I completed so far?',
    'Kab meri class hai?'
];

const run = async () => {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('DB connected');

    // 1. Temp student banao
    await User.deleteMany({ email: TEMP_EMAIL });
    const student = await User.create({
        name: 'Guide Test Student',
        email: TEMP_EMAIL,
        password: await bcrypt.hash('Test@12345', 10),
        role: 'student',
        isActive: true
    });
    console.log('temp student created:', student._id.toString());

    // 2. Course publish + schedule set karo
    const course = await Course.findOne().sort({ createdAt: -1 });
    if (!course) { console.log('NO COURSE IN DB — abort'); await cleanup(null, student); return; }
    const original = { isPublished: course.isPublished, schedule: course.schedule, scheduleNote: course.scheduleNote };
    course.isPublished = true;
    // Kal aur parso ke classes daalo taaki "next class" clearly future me ho
    const dayIn = n => {
        const d = new Date(Date.now() + n * 86400000);
        return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][d.getDay()];
    };
    course.schedule = [
        { label: 'Week 1 — Intro to Node', day: dayIn(1), startTime: '18:30', endTime: '20:00', isLive: true, meetingLink: '' },
        { label: 'Week 2 — Express Routing', day: dayIn(3), startTime: '18:30', endTime: '20:00', isLive: true }
    ];
    course.scheduleNote = 'Doubt session every Saturday';
    await course.save();
    await Enrollment.create({ student: student._id, course: course._id });
    console.log(`course published + schedule set (${course.schedule.map(s => s.day).join(', ')}) + enrolled`);

    // 3. Login + guide questions
    const login = await request('POST', '/auth/login', { body: { email: TEMP_EMAIL, password: 'Test@12345' } });
    const token = login.json.token;
    if (!token) { console.log('LOGIN FAILED', login.json); await cleanup(course, student, original); return; }
    console.log('student login ok\n');

    for (const question of questions) {
        const res = await request('POST', '/ai/ask', { token, body: { question } });
        console.log(`--- "${question}"  [mode=${res.json.mode}]`);
        if (res.json.guide && Object.keys(res.json.guide).length) {
            console.log('    guide.nextClass:', JSON.stringify(res.json.guide.nextClass));
            console.log('    guide.hasSchedule:', res.json.guide.hasSchedule);
        }
        console.log('   ', String(res.json.answer || res.json.message).replace(/\n/g, '\n    ').slice(0, 450));
        console.log('');
    }

    await cleanup(course, student, original);
    console.log('rolled back — course restored, temp student removed');
    await mongoose.disconnect();
};

const cleanup = async (course, student, original) => {
    try {
        await Enrollment.deleteMany({ student: student._id });
        await User.deleteOne({ _id: student._id });
        if (course && original) {
            course.isPublished = original.isPublished;
            course.schedule = original.schedule;
            course.scheduleNote = original.scheduleNote;
            await course.save();
        }
    } catch (error) {
        console.log('cleanup warning:', error.message);
    }
};

run().catch(async error => {
    console.error('ERROR:', error.message);
    await mongoose.disconnect();
    process.exit(1);
});
