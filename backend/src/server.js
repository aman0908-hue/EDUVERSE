import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import path from 'path'; 

// --- ROUTES IMPORTS ---
import authRoutes from './routes/authRoutes.js';
import courseRoutes from './routes/courseRoutes.js';
import lessonRoutes from './routes/lessonRoutes.js'; 
import quizRoutes from './routes/quizRoutes.js'; 
import progressRoutes from './routes/progressRoutes.js'; 
import moduleRoutes from './routes/moduleRoutes.js';   
import chapterRoutes from './routes/chapterRoutes.js'; 
import enrollmentRoutes from './routes/enrollmentRoutes.js'; // 🚀 NAYA

// 🚀 NAYA: Error Middleware Import Kiya
import { errorMiddleware } from './middlewares/errorMiddleware.js';

dotenv.config();
connectDB();

const app = express();

// Render/Vercel jaise HTTPS proxies ke piche secure cookies ke liye zaroori
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

// ==========================================
// 🚀 SUPER FIX FOR VIDEO PLAYER (Black Screen)
// ==========================================
const __dirname = path.resolve();
// Humne dono paths allow kar diye hain, taaki Frontend ka URL kuch bhi ho, video chal jaye!
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/api/v1/uploads', express.static(path.join(__dirname, 'uploads')));


// Health check API
app.get('/api/v1/health', (req, res) => {
    res.status(200).json({ status: 'API is running nicely!' });
});

// --- ROUTES USE ---
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/lessons', lessonRoutes); 
app.use('/api/v1/lectures', lessonRoutes); // 🚀 Requirement: lectures endpoints (same controller)
app.use('/api/v1/quizzes', quizRoutes); 
app.use('/api/v1/progress', progressRoutes); 
app.use('/api/v1/modules', moduleRoutes);   
app.use('/api/v1/chapters', chapterRoutes); 
// 🚀 NAYA: Enrollment routes (requirement spelling 'enrollement' + correct 'enrollment' dono)
app.use('/api/v1/enrollement', enrollmentRoutes);
app.use('/api/v1/enrollment', enrollmentRoutes);

// 🚀 NAYA: Root level health check (Requirement: GET /health)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'EduVerse API is running nicely!', uptime: process.uptime() });
});

// ==========================================
// 🚀 ERROR MIDDLEWARE (Hamesha sabse niche rahega)
// ==========================================
app.use(errorMiddleware);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server running in ${process.env.MODE} mode on port ${PORT}`);
});