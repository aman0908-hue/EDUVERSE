import User from '../models/User.js';
import TeacherRequest from '../models/TeacherRequest.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 1. Register Route Logic (Naya account banana, profile image upload ke sath)
export const register = async (req, res) => {
    try {
        const { name, email, password, grade, applyForTeacher, qualification, experience, subject, reason, teachesGrades } = req.body;

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

        // Check karte hain ki user pehle se to nahi hai
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            // YAHAN UPDATE KIYA HAI
            return res.status(400).json({ message: "Email is already registered." }); 
        }

        if (!password || password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }

        // Password ko encrypt (hash) karna security ke liye
        const hashedPassword = await bcrypt.hash(password, 10);

        // 🚀 Multer se aayi profile image ka filename save karna
        const profileImage = req.file ? req.file.filename : '';

        // Database mein naya user save karna
        const GRADES = ['5', '6', '7', '8', '9', '10', '11', '12', 'UG'];
        const user = await User.create({
            name,
            email,
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
        // Role abhi bhi 'student' hi rahega — admin approve karne par teacher banega.
        let requestCreated = false;
        if (applyForTeacher === 'true' || applyForTeacher === true) {
            await TeacherRequest.create({
                user: user._id,
                name,
                email,
                qualification: qualification || '',
                experience: experience || '',
                subject: subject || '',
                reason: reason || '',
                status: 'pending'
            });
            requestCreated = true;
        }

        res.status(201).json({
            message: requestCreated
                ? 'Registration successful! Teacher request sent for admin approval.'
                : 'Registration successful!',
            user,
            requestCreated
        });

    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// 2. Login Route Logic (Login karna aur Token dena)
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // User find karte hain
        const user = await User.findOne({ email });
        if (!user) {
            // YAHAN UPDATE KIYA HAI
            return res.status(404).json({ message: "User not found. Please register first." });
        }

        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'This account is not active. Please contact the administrator.' });
        }

        // Password match karte hain
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // YAHAN UPDATE KIYA HAI
            return res.status(400).json({ message: "Incorrect password. Please try again." });
        }

        // JWT Token banana (7 din ke liye valid hoga)
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        // Token ko HTTP Only Cookie mein save karna taaki secure rahe
        // Production (Render + Vercel = alag domains) me cross-site cookie ke liye
        // sameSite:'none' + secure:true zaroori hai, warna login kaam nahi karega
        res.cookie('token', token, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            sameSite: process.env.MODE === 'production' ? 'none' : 'lax',
            secure: process.env.MODE === 'production'
        });

        user.password = undefined;
        res.status(200).json({ message: "Login successful!", token, user });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
    }
};

// 3. Logout Route Logic (Cookie delete karna)
export const logout = async (req, res) => {
    res.cookie('token', '', {
        httpOnly: true,
        expires: new Date(0),
        sameSite: process.env.MODE === 'production' ? 'none' : 'lax',
        secure: process.env.MODE === 'production'
    });
    res.status(200).json({ message: "Logout successful!" });
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