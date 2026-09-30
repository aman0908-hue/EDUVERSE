import User from '../models/User.js';
import TeacherRequest from '../models/TeacherRequest.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 1. Register Route Logic (Naya account banana, profile image upload ke sath)
export const register = async (req, res) => {
    try {
        const { name, email, password, grade, applyForTeacher, qualification, experience, subject, reason, teachesGrades } = req.body;

        const cleanEmail = String(email || '').trim().toLowerCase();
        const cleanName = String(name || '').trim();
        const cleanPassword = String(password || '');

        if (!cleanName) {
            return res.status(400).json({ message: "Full Name is required." });
        }
        if (!cleanEmail) {
            return res.status(400).json({ message: "Email address is required." });
        }
        if (!cleanPassword || cleanPassword.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }

        // 👨‍🏫 Teacher ke classes parse karna (FormData se JSON string aata hai)
        let teaches = [];
        if (typeof teachesGrades === 'string' && teachesGrades.trim()) {
            try { teaches = JSON.parse(teachesGrades); }
            catch { teaches = teachesGrades.split(',').map(s => s.trim()); }
        } else if (Array.isArray(teachesGrades)) {
            teaches = teachesGrades;
        }
        const TEACH_GRADES = ['5', '6', '7', '8', '9', '10', '11', '12', 'UG'];
        teaches = [...new Set((teaches || []).map(String).filter(g => TEACH_GRADES.includes(g)))];

        // Check karte hain ki user pehle se to nahi hai (case-insensitive)
        const existingUser = await User.findOne({ 
            email: { $regex: new RegExp(`^${cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
        });
        if (existingUser) {
            return res.status(400).json({ message: "Email is already registered. Please login instead." }); 
        }

        // Password ko encrypt (hash) karna security ke liye
        const hashedPassword = await bcrypt.hash(cleanPassword, 10);

        // 🚀 Multer se aayi profile image ka filename save karna
        const profileImage = req.file ? req.file.filename : '';

        // Database mein naya user save karna
        const GRADES = ['5', '6', '7', '8', '9', '10', '11', '12', 'UG'];
        const user = await User.create({
            name: cleanName,
            email: cleanEmail,
            password: hashedPassword,
            role: 'student',
            // 🎓 Student ka class — isi se use apne grade ke courses dikhenge
            grade: GRADES.includes(String(grade || '')) ? String(grade) : 'All',
            // 👨‍🏫 Teacher kis class ke liye padhata hai
            teachesGrades: applyForTeacher ? teaches : [],
            isActive: true,
            profileImage
        });

        // Response bhejte hain (password hata kar)
        user.password = undefined;

        // Agar user ne teacher banne ki request ki hai to admin ke paas bhej do.
        let requestCreated = false;
        if (applyForTeacher === 'true' || applyForTeacher === true) {
            await TeacherRequest.create({
                user: user._id,
                name: cleanName,
                email: cleanEmail,
                qualification: qualification || '',
                experience: experience || '',
                subject: subject || '',
                reason: reason || '',
                status: 'pending'
            });
            requestCreated = true;
        }

        res.status(201).json({
            success: true,
            message: requestCreated
                ? 'Registration successful! Teacher request sent for admin approval.'
                : 'Registration successful!',
            user,
            requestCreated
        });

    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({ success: false, message: 'Server Error during registration', error: error.message });
    }
};

// 2. Login Route Logic (Login karna aur Token dena)
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const cleanEmail = String(email || '').trim().toLowerCase();
        const cleanPassword = String(password || '');

        if (!cleanEmail || !cleanPassword) {
            return res.status(400).json({ message: "Please enter both email and password." });
        }

        // Case-insensitive user lookup taaki purane/mixed-case users bhi smoothly match ho sakein
        const user = await User.findOne({ 
            email: { $regex: new RegExp(`^${cleanEmail.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}$`, 'i') }
        });
        if (!user) {
            return res.status(404).json({ message: "User not found. Please register first." });
        }

        if (!user.isActive) {
            return res.status(401).json({ message: 'This account is not active. Please contact the administrator.' });
        }

        // Password match karte hain
        const isMatch = await bcrypt.compare(cleanPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Incorrect password. Please try again." });
        }

        // JWT Token banana (7 din ke liye valid hoga)
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        // Production environment check
        const isProd = process.env.MODE === 'production' || process.env.NODE_ENV === 'production' || !!process.env.VERCEL;

        // Token ko HTTP Only Cookie mein save karna
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: isProd ? 'none' : 'lax',
            secure: isProd
        });

        user.password = undefined;
        res.status(200).json({ success: true, message: "Login successful!", token, user });

    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

// 3. Logout Route Logic (Cookie delete karna)
export const logout = async (req, res) => {
    const isProd = process.env.MODE === 'production' || process.env.NODE_ENV === 'production' || !!process.env.VERCEL;
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
        sameSite: isProd ? 'none' : 'lax',
        secure: isProd
    });
    res.status(200).json({ success: true, message: "Logout successful!" });
};

// 4. Get Current Logged-in User (Session persistence)
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};