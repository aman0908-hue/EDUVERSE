// Quick live check of the built-in study guide replies (no AI key needed).
// Run: node scripts/check-study-guide.mjs
import 'dotenv/config';
import http from 'http';

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

const cases = [
    'hi',
    'hello',
    'Hello!',
    'hey there',
    'good morning',
    'namaste',
    'sup',
    'thanks',
    'bye',
    'who are you',
    'what can you do',
    'a',
    'explain closures in simple words',
    'give me a quiz',
    'make a study plan',
    'help me debug this error',
    'summarise this lesson'
];

const run = async () => {
    const login = await request('POST', '/auth/login', {
        body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }
    });
    const token = login.json.token;
    if (!token) { console.log('LOGIN FAILED'); process.exit(1); }

    for (const question of cases) {
        const res = await request('POST', '/ai/ask', { token, body: { question } });
        const answer = res.json.answer || res.json.message || '(no answer)';
        const firstLine = String(answer).split('\n')[0].slice(0, 72);
        console.log(`  "${question}"`.padEnd(32), '->', firstLine);
    }
};

run().catch(err => { console.error('ERROR:', err.message); process.exit(1); });
