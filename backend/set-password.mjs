/**
 * Password management CLI.
 *
 * Usage:
 *   node set-password.mjs <email> <newPassword>
 *
 * Ye koi bhi user ka password MongoDB me bcrypt hash karke set kar deta hai,
 * isliye .env edit karne ya manually hash generate karne ki zaroorat nahi.
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './src/models/User.js';

dotenv.config();

const [emailArg, passwordArg] = process.argv.slice(2);

if (!emailArg || !passwordArg) {
    console.log('\n❌ Usage: node set-password.mjs <email> <newPassword>\n');
    console.log('Example: node set-password.mjs admin@eduverse.com aman0908\n');
    process.exit(1);
}

if (passwordArg.length < 6) {
    console.log('\n❌ Password kam se kam 6 characters ka hona chahiye.\n');
    process.exit(1);
}

await mongoose.connect(process.env.MONGO_URL);

const user = await User.findOne({ email: String(emailArg).trim().toLowerCase() });
if (!user) {
    console.log(`\n❌ User nahi mila: ${emailArg}\n`);
    process.exit(1);
}

const hash = await bcrypt.hash(passwordArg, 12);
user.password = hash;
await user.save();

const verified = await bcrypt.compare(passwordArg, user.password);
console.log(`\n✅ Password update ho gaya: ${user.email}`);
console.log(`   Role: ${user.role} | Active: ${user.isActive}`);
console.log(`   Verify: ${verified ? 'PASS' : 'FAIL'}\n`);

await mongoose.disconnect();
