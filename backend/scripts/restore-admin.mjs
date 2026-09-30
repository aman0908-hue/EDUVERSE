// Purane admin (adminlogin@eduverse.com) ko backup se wapas laata hai
// aur baaki admin accounts hata deta hai.
//
// Run: node scripts/restore-admin.mjs
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from '../src/models/User.js';

const ADMIN_EMAIL = 'adminlogin@eduverse.com';
// Purane admin ka asli password — sirf verify karne ke liye (hash backup me hai)
const ADMIN_PASSWORD = 'aman0908';
const BACKUP_DIR = path.resolve(process.cwd(), 'backups');

const run = async () => {
    await mongoose.connect(process.env.MONGO_URL);
    console.log('DB connected\n');

    // 1. Backups me se ADMIN_EMAIL dhoondo — NEWEST se OLDEST, taaki agar
    //    naya backup me admin na ho to purane wale se mil jaaye.
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log('❌ backups folder nahi mila: ' + BACKUP_DIR);
        await mongoose.disconnect();
        process.exit(1);
    }
    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith('.json'))
        .sort()
        .reverse(); // newest first (ISO stamp names sort chronologically)
    if (!files.length) {
        console.log('❌ koi backup file nahi mili.');
        await mongoose.disconnect();
        process.exit(1);
    }

    let saved = null;
    let usedFile = null;
    for (const f of files) {
        const full = path.join(BACKUP_DIR, f);
        let dump;
        try {
            dump = JSON.parse(fs.readFileSync(full, 'utf-8'));
        } catch {
            console.log('   (skip corrupt backup: ' + f + ')');
            continue;
        }
        const hit = (dump.users || []).find(u => u.email === ADMIN_EMAIL);
        if (hit) {
            saved = hit;
            usedFile = full;
            break;
        }
        console.log('   checked ' + f + ' — admin nahi mila');
    }

    if (!saved) {
        console.log('❌ kisi bhi backup me ' + ADMIN_EMAIL + ' nahi mila.');
        console.log('   Checked ' + files.length + ' backup file(s).');
        await mongoose.disconnect();
        process.exit(1);
    }
    console.log('Backup file (admin mila): ' + usedFile);

    // 2. Baaki sab admin hatao
    const otherAdmins = await User.find({ role: 'admin', email: { $ne: ADMIN_EMAIL } });
    for (const a of otherAdmins) {
        console.log('🗑️  hata diya admin: ' + a.email);
        await User.deleteOne({ _id: a._id });
    }
    if (!otherAdmins.length) console.log('   (koi extra admin nahi tha)');

    // 3. Purane admin ko original ID + password hash ke saath wapas laao
    //    (password hash nahi badalta — toh purana password chalta rahega)
    await User.deleteOne({ email: ADMIN_EMAIL });
    const admin = await User.create({
        _id: saved._id,
        name: saved.name || 'Admin',
        email: ADMIN_EMAIL,
        password: saved.password,          // 👈 original bcrypt hash
        role: 'admin',
        grade: 'All',
        isActive: true,
        profileImage: saved.profileImage || ''
    });
    // createdAt/updatedAt bhi wapas set kar do (purana record jaisa dikhe)
    await User.updateOne(
        { _id: admin._id },
        { $set: { createdAt: saved.createdAt, updatedAt: saved.updatedAt } },
        { timestamps: false }
    );

    console.log('\n✅ Admin wapas aa gaya');
    console.log('   email : ' + admin.email);
    console.log('   name  : ' + admin.name);
    console.log('   id    : ' + admin._id);
    console.log('   password: wahi purana wala (backup me tha, change nahi kiya)');

    // 🔍 Confirm karo ki original password sach me match karta hai
    const ok = await bcrypt.compare(ADMIN_PASSWORD, admin.password);
    console.log(ok
        ? `   VERIFY: ✅ "${ADMIN_PASSWORD}" sahi password hai`
        : `   VERIFY: ⚠️  "${ADMIN_PASSWORD}" match nahi hua — password yaad check karo`);

    // 4. Final state
    const all = await User.find({}).select('name email role grade').lean();
    console.log('\nAb total ' + all.length + ' users hain:');
    all.forEach(u => console.log('   ' + u.role.padEnd(8) + u.email));

    await mongoose.disconnect();
};

run().catch(async e => {
    console.error('ERROR:', e.message);
    await mongoose.disconnect();
    process.exit(1);
});
