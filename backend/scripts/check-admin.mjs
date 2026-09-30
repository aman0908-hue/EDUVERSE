// Quick live check: login as admin, then hit one endpoint and print the status.
// Run: node scripts/check-admin.mjs <endpoint> [method] [jsonBody]
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

const endpoint = process.argv[2] || '/admin/ai-settings';
const method = process.argv[3] || 'GET';
const rawBody = process.argv[4];

const run = async () => {
    const health = await request('GET', '/health');
    console.log('health:', health.status, JSON.stringify(health.json));

    const login = await request('POST', '/auth/login', {
        body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }
    });
    console.log('login:', login.status);
    const token = login.json.token;
    if (!token) { console.log('LOGIN FAILED:', JSON.stringify(login.json)); process.exit(1); }

    const result = await request(method, endpoint, {
        token,
        body: rawBody ? JSON.parse(rawBody) : undefined
    });

    console.log(`${method} ${endpoint} ->`, result.status);
    const text = JSON.stringify(result.json);
    console.log(text.length > 1400 ? `${text.slice(0, 1400)}...` : text);
};

run().catch(err => { console.error('REQUEST ERROR:', err.message); process.exit(1); });
