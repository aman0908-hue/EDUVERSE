// Grade filter ka real test — teacher courses banata hai, students alag grades ke
// hain, aur dekhte hain har student ko sirf apne grade ke courses mile ya nahi.
// Run: node scripts/check-grade-filter.mjs
import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User.js';
import Course from '../src/models/Course.js';

const PORT = process.env.PORT || 4000;
const BASE = `http://localhost:${PORT}/api/v1`;
const PASSWORD = 'Grade@12345';
const TAG = 'grade-test';

const request = (method, path, { body, token } = {}) => new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(`${BASE}${path}`, {
        method,
        headers: {
            ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
            ...(token ? { Cookie: `token=${token}` } : {})
        }
    }, res => {
        let d = '';
        res.on('data', c => { d += c; });
        res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({ raw: d }); } });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
});

let pass = 0, fail = 0;
const check = (name, cond) => {
    if (cond) { pass++; console.log('  PASS ', name); }
    else { fail++; console.log('  FAIL ', name); }
};

const run = async () => {
    await mongoose.connect(process.env.MONGO_URL);
    await User.deleteMany({ email: new RegExp(TAG) });
    await Course.deleteMany({ title: new RegExp(TAG) });

    // Teacher
    const teacher = await User.create({
        name: 'GradeTest Teacher', email: `${TAG}.teacher@test.local`,
        password: await bcrypt.hash(PASSWORD, 10), role: 'teacher', isActive: true
    });

    // 3 courses: grade 10, grade 12, All
    const grades = ['10', '12', 'All'];
    for (const g of grades) {
        await Course.create({
            title: `${TAG} course grade ${g}`,
            description: 'grade filter test',
            category: 'Science',
            grade: g,
            instructor: teacher._id,
            isPublished: true
        });
    }

    // 2 students: ek class 10, ek class 12
    const s10 = await User.create({ name: 'Student10', email: `${TAG}.s10@test.local`, password: await bcrypt.hash(PASSWORD, 10), role: 'student', grade: '10', isActive: true });
    const s12 = await User.create({ name: 'Student12', email: `${TAG}.s12@test.local`, password: await bcrypt.hash(PASSWORD, 10), role: 'student', grade: '12', isActive: true });

    const login = async email => (await request('POST', '/auth/login', { body: { email, password: PASSWORD } })).token;

    console.log('\n== grade stored in DB');
    const courses = await Course.find({ title: new RegExp(TAG) }).lean();
    check('3 courses ban gaye', courses.length === 3);
    check('grades set hain', courses.map(c => c.grade).sort().join(',') === '10,12,All');

    console.log('\n== Class 10 student ko kya dikhta hai');
    const t10 = await login(s10.email);
    const r10 = await request('GET', '/courses/all?limit=50', { token: t10 });
    const titles10 = r10.courses.map(c => c.title);
    check('Class 10 course dikhta hai', titles10.some(t => t.includes('grade 10')));
    check('Class 12 course NAHI dikhta', !titles10.some(t => t.includes('grade 12')));
    check('All course dikhta hai', titles10.some(t => t.includes('grade All')));

    console.log('\n== Class 12 student ko kya dikhta hai');
    const t12 = await login(s12.email);
    const r12 = await request('GET', '/courses/all?limit=50', { token: t12 });
    const titles12 = r12.courses.map(c => c.title);
    check('Class 12 course dikhta hai', titles12.some(t => t.includes('grade 12')));
    check('Class 10 course NAHI dikhta', !titles12.some(t => t.includes('grade 10')));
    check('All course dikhta hai', titles12.some(t => t.includes('grade All')));

    console.log('\n== Bina login (public browse)');
    const rPub = await request('GET', '/courses/all?limit=50');
    check('sab courses dikhte hain', rPub.courses.length >= 3);

    console.log('\n== Teacher ?grade=10 filter');
    const tt = await login(teacher.email);
    const rT = await request('GET', '/courses/all?grade=10&limit=50', { token: tt });
    check('teacher filter kar sakta hai', rT.courses.every(c => c.grade === '10'));

    // cleanup
    await Course.deleteMany({ title: new RegExp(TAG) });
    await User.deleteMany({ email: new RegExp(TAG) });

    console.log(`\n== RESULT: ${pass} passed, ${fail} failed`);
    await mongoose.disconnect();
    process.exit(fail ? 1 : 0);
};

run().catch(async e => {
    console.error('ERROR:', e.message);
    await mongoose.disconnect();
    process.exit(1);
});
