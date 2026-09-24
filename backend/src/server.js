import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import path from 'path'; 
import mongoose from 'mongoose';

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

// Database connection ensure karne wala middleware (Vercel serverless cold starts ke liye)
app.use(async (req, res, next) => {
    try {
        if (!mongoose.connection || mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        next();
    } catch (err) {
        next(err);
    }
});

// Render/Vercel jaise HTTPS proxies ke piche secure cookies ke liye zaroori
app.set('trust proxy', 1);

// CORS: FRONTEND_URL ke saath local dev variants bhi allow (127.0.0.1 vs localhost trap se bachne ke liye)
const allowedOrigins = [...new Set([process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173'].filter(Boolean))];
app.use(cors({
    origin: (origin, callback) => {
        // origin undefined ho to (curl / same-origin) allow, ya .vercel.app domain
        if (!origin || allowedOrigins.includes(origin) || (typeof origin === 'string' && origin.endsWith('.vercel.app'))) {
            return callback(null, true);
        }
        return callback(new Error(`CORS blocked: origin ${origin} allowed nahi hai`));
    },
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// ==========================================
// 🚀 SUPER FIX FOR VIDEO PLAYER (Black Screen)
// ==========================================
const __dirname = path.resolve();
const uploadFolder = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, 'uploads');
// Local project uploads directory fallback
const localUploads = path.join(__dirname, 'uploads');
if (process.env.VERCEL) {
    app.use('/uploads', express.static(uploadFolder));
    app.use('/uploads', express.static(localUploads));
    app.use('/api/v1/uploads', express.static(uploadFolder));
    app.use('/api/v1/uploads', express.static(localUploads));
} else {
    app.use('/uploads', express.static(uploadFolder));
    app.use('/api/v1/uploads', express.static(uploadFolder));
}


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

// 🚀 NAYA: Vercel serverless functions me port nahi hota, isliye wahan listen() skip karo.
// Local dev pe normal listen hoga. Vercel ke liye app neeche export kiya gaya hai (api/index.js).
if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server running in ${process.env.MODE} mode on port ${PORT}`);
    });
}

// 🚀 NAYA: Vercel serverless function ke liye Express app export (api/index.js isse use karta hai)
export default app;