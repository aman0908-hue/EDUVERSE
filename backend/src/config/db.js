import mongoose from 'mongoose';

// Transient DNS/network errors — inhe retry karna chahiye. Mac/router ka DNS
// (link-local IPv6 fe80::...) kabhi kabhi startup pe Atlas ki SRV query refuse
// kar deta hai → "querySrv ECONNREFUSED" → ye permanent problem nahi hai,
// thodi der baad retry se theek ho jata hai.
const TRANSIENT_ERRORS = ['querySrv', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNREFUSED', 'ESERVFAIL', 'EAI_AGAIN'];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const connectDB = async () => {
    const maxRetries = 4; // total 5 attempts (1 initial + 4 retries)

    for (let attempt = 1; ; attempt++) {
        try {
            const conn = await mongoose.connect(process.env.MONGO_URL);
            console.log(`MongoDB Connected: ${conn.connection.host}`);
            return;
        } catch (error) {
            const msg = error?.message || '';

            // Permanent errors (IP whitelist / auth / config) — retry ka koi matlab nahi, turant exit
            if (!TRANSIENT_ERRORS.some((pattern) => msg.includes(pattern))) {
                // Atlas jab IP whitelist me na ho to TLS handshake pe hi "tlsv1 alert internal error"
                // ya "IP that isn't whitelisted" jaisa message aata hai — uska clear fix dikha do.
                if (msg.includes('whitelisted') || msg.includes('tlsv1 alert internal error')) {
                    console.error('\n❌ MongoDB Atlas connect FAIL: aapka current IP Atlas "Network Access" list me allow nahi hai.');
                    console.error('   FIX: https://cloud.mongodb.com → apna project → Security → Network Access →');
                    console.error('   "ADD IP ADDRESS" → "Allow Access From Anywhere" (0.0.0.0/0) add karo, phir server restart karo.\n');
                } else {
                    console.error(`Error: ${error.message}`);
                }
                process.exit(1);
            }

            // Transient DNS/network error — thoda ruk ke dobara try karo
            if (attempt > maxRetries) {
                console.error(`\n❌ MongoDB connect FAIL: DNS/network error ${maxRetries + 1} attempts ke baad bhi theek nahi hua.`);
                console.error('   Aapke network ka DNS server Atlas ki SRV query refuse kar raha hai (jaise "querySrv ECONNREFUSED").');
                console.error('   FIX 1: Thodi der baad server dobara start karo (npm run dev).');
                console.error('   FIX 2: System Settings → Wi-Fi → Details → DNS me "1.1.1.1" ya "8.8.8.8" add karke Wi-Fi reconnect karo.\n');
                process.exit(1);
            }

            console.warn(`⚠️  Transient DNS/network error (attempt ${attempt}/${maxRetries + 1}): ${msg}`);
            console.warn(`   ${attempt * 2}s baad dobara try kar raha hoon...`);
            await sleep(attempt * 2000);
        }
    }
};

export default connectDB;