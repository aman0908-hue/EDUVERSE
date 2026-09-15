import User from '../models/User.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// 1. Register Route Logic (Naya account banana, profile image upload ke sath)
export const register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

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
        const user = await User.create({
            name,
            email,
            password: hashedPassword,
            role,
            profileImage
        });

        // Response bhejte hain (password hata kar)
        user.password = undefined;
        res.status(201).json({ message: "Registration successful!", user });

    } catch (error) {
        res.status(500).json({ message: "Server Error", error: error.message });
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