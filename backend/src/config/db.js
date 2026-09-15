import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URL);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        const msg = error?.message || '';
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
};

export default connectDB;